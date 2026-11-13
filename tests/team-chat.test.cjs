const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const policy=require('../netlify/lib/team-chat');
const staff={role:'staff',status:'active'},admin={role:'super_admin',status:'active'};
test('active team only; admin cannot bypass private membership',()=>{
 for(const user of [null,{role:'client',status:'active'},{role:'staff',status:'disabled'}])assert.throws(()=>policy.access(user,'a',{type:'general'}),{status:403});
 policy.access(staff,'a',{type:'general'});policy.access(admin,'a',{type:'general'});
 policy.access(staff,'a',{type:'direct',members:['a','b']});
 assert.throws(()=>policy.access(admin,'admin',{type:'direct',members:['a','b']}),{status:403});
 assert.throws(()=>policy.access(staff,'a',null),{status:403});
});
test('direct rooms are canonical; IDs and message lengths validated',()=>{
 assert.equal(policy.directId(['a','b']),policy.directId(['b','a']));
 assert.notEqual(policy.directId(['a','bc']),policy.directId(['ab','c']));
 assert.equal(policy.text(' hello ',2000),'hello');
 for(const value of ['', ' '.repeat(5),'x'.repeat(2001),{}])assert.throws(()=>policy.text(value,2000));
 for(const value of ['../users','a/b','',{}])assert.throws(()=>policy.id(value));
});
function harness(){
 const docs=new Map([['users/a',staff],['users/b',staff],['users/root',admin],['users/client',{role:'client',status:'active'}],['teamChats/private',{type:'direct',members:['a','b'],seq:0}]]);let writes=0;
 function snap(path){return {exists:docs.has(path),id:path.split('/').at(-1),data:()=>docs.get(path)}}
 function ref(path){return {path,id:path.split('/').at(-1),get:async()=>snap(path),collection:n=>collection(path+'/'+n)}}
 function collection(path){return {doc:n=>ref(path+'/'+(n||'generated')),where:()=>({limit:()=>({get:async()=>({size:3,docs:['a','b','root'].map(n=>snap('users/'+n))})})})}}
 const db={collection,runTransaction:async fn=>fn({get:async r=>snap(r.path),set:(r,d)=>{docs.set(r.path,d);writes++}})};
 const firestore=()=>db;firestore.FieldValue={serverTimestamp:()=>({toMillis:()=>Date.now()})};
 const firebase={apps:[{}],firestore,auth:()=>({verifyIdToken:async token=>({uid:token})})};
 const noticeJobs=[];const notices={digest:require('node:crypto').createHash? s=>require('node:crypto').createHash('sha256').update(s).digest('hex'):null,enqueue:(tx,event)=>noticeJobs.push(event),deliver:async()=>({})};
 const sandbox={require:name=>name==='firebase-admin'?firebase:name==='../lib/team-chat'?policy:notices,process:{env:{TEAM_CHAT_ENABLED:'true'}},exports:{}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../netlify/functions/team-chat'),'utf8'),sandbox);
 const call=(who,body)=>sandbox.exports.handler({httpMethod:'POST',headers:who?{authorization:'Bearer '+who}:{},body:JSON.stringify(body)});
 return {call,docs,noticeJobs,sandbox,getWrites:()=>writes};
}
test('endpoint rejects guest, customer and nonparticipant before messages',async()=>{
 const h=harness();assert.equal((await h.call('',{action:'messages',roomId:'private'})).statusCode,401);
 assert.equal((await h.call('client',{action:'messages',roomId:'private'})).statusCode,403);
 assert.equal((await h.call('root',{action:'messages',roomId:'private'})).statusCode,403);
 assert.equal(h.getWrites(),0);
});
test('retry is idempotent and private notification reaches only other participant',async()=>{
 const h=harness(),body={action:'send',roomId:'private',text:'Hello',requestId:'request_1'};
 assert.equal((await h.call('a',body)).statusCode,200);
 assert.equal(h.docs.get('teamChats/private').seq,1);
 assert.deepEqual(h.noticeJobs.map(j=>j.uid),['b']);
 assert.equal((await h.call('a',body)).statusCode,200);
 assert.equal(h.noticeJobs.length,1);
 assert.equal((await h.call('a',{...body,text:'Different'})).statusCode,409);
 assert.equal((await h.call('a',{...body,requestId:'request_2'})).statusCode,429);
});
test('disabled account rejected; production feature gate defaults closed',async()=>{
 const h=harness();h.docs.set('users/a',{...staff,status:'disabled'});
 assert.equal((await h.call('a',{action:'send',roomId:'private',text:'Hello',requestId:'r'})).statusCode,403);
 delete h.sandbox.process.env.TEAM_CHAT_ENABLED;
 assert.equal((await h.call('b',{action:'list'})).statusCode,503);
});
test('read position cannot jump past room sequence or regress',async()=>{
 const h=harness();h.docs.set('teamChats/private',{type:'direct',members:['a','b'],seq:5});
 await h.call('a',{action:'read',roomId:'private',seq:999});assert.equal(h.docs.get('teamChats/private/reads/a').seq,5);
 await h.call('a',{action:'read',roomId:'private',seq:1});assert.equal(h.docs.get('teamChats/private/reads/a').seq,5);
});
test('chat push payload is generic and points to the room; assignments stay intact',()=>{
 const saved=[];
 function collection(path){return {doc:id=>({path:path+'/'+id,collection:name=>collection(path+'/'+id+'/'+name)})};}
 const firestore=()=>({collection});firestore.FieldValue={serverTimestamp:()=>0};firestore.Timestamp={fromMillis:v=>v};
 const sandbox={require:name=>name==='firebase-admin'?{firestore}:require(name),process:{env:{}},module:{exports:{}}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../netlify/lib/notifications'),'utf8'),sandbox);
 const tx={set:(r,d)=>saved.push({path:r.path,...d})};
 sandbox.module.exports.enqueue(tx,{uid:'b',id:'n1',type:'chat_message',chatRoomId:'private'});
 assert.equal(saved[0].url,'/messages.html?room=private');assert.equal(saved[0].title,'New team message');
 assert.equal(saved[0].body,'You have a new team message. Open FreshBorn to read it.');
 assert.equal(saved[1].status,'pending');
 sandbox.module.exports.enqueue(tx,{uid:'b',id:'n2',type:'service_assigned',visitId:'visit1'});
 assert.equal(saved[2].url,'/staff-portal.html?visit=visit1');assert.equal(saved[2].title,'New cleaning service');
});
