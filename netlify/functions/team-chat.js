const admin=require('firebase-admin');
if(!admin.apps.length)admin.initializeApp({credential:admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON||'{}'))});
const db=admin.firestore(),policy=require('../lib/team-chat'),notices=require('../lib/notifications');
const {active,access,text,id,directId,fail}=policy;
const stamp=()=>admin.firestore.FieldValue.serverTimestamp();
const rooms=db.collection('teamChats');
const general={type:'general',name:'FreshBorn team',members:[],seq:0};
const reply=(statusCode,body)=>({statusCode,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify(body)});
async function roster(){const q=await db.collection('users').where('status','==','active').limit(151).get();if(q.size>150)throw fail('Team size requires a chat capacity update',503);return q.docs.filter(s=>active(s.data())).map(s=>({uid:s.id,name:s.data().name||s.data().employeeNumber||'Team member',role:s.data().role}));}
async function room(ref){const s=await ref.get();return s.exists?s.data():ref.id==='general'?general:null;}
exports.handler=async event=>{
 if(event.httpMethod!=='POST')return reply(405,{error:'POST required'});
 if(process.env.TEAM_CHAT_ENABLED!=='true')return reply(503,{error:'Team chat setup is pending'});
 try{
 const match=(event.headers?.authorization||event.headers?.Authorization||'').match(/^Bearer (.+)$/);if(!match)throw fail('Sign in required',401);
 const decoded=await admin.auth().verifyIdToken(match[1]);const uid=decoded.uid,userRef=db.collection('users').doc(uid),u=await userRef.get(),user=u.data();
 if(!active(user))throw fail('Active team account required',403);
 if((event.body||'').length>12000)throw fail('Request too large',413);
 const body=JSON.parse(event.body||'{}');
 if(body.action==='list'){
  const q=await rooms.where('members','array-contains',uid).limit(101).get();if(q.size>100)throw fail('Conversation capacity reached',409);
  const items=[{id:'general',...await room(rooms.doc('general'))},...q.docs.map(s=>({id:s.id,...s.data()}))];
  const result=await Promise.all(items.map(async r=>{const read=await rooms.doc(r.id).collection('reads').doc(uid).get();return {id:r.id,type:r.type,name:r.name,members:r.members,unread:Math.max(0,(r.seq||0)-(read.data()?.seq||0)),seq:r.seq||0,updatedAt:r.updatedAt?.toMillis?.()||0};}));
  return reply(200,{ok:true,uid,role:user.role,people:await roster(),rooms:result.sort((a,b)=>b.updatedAt-a.updatedAt)});
 }
 if(body.action==='create'){
  const people=await roster(),valid=new Set(people.map(p=>p.uid));
  if(!Array.isArray(body.members))throw fail('Choose team members');
  const members=[...new Set([uid,...body.members.map(id)])].sort();
  if(members.length<2||members.length>50||members.some(m=>!valid.has(m)))throw fail('Choose active team members');
  const type=body.type==='direct'?'direct':'group';
  if(type==='direct'&&members.length!==2)throw fail('Choose one teammate');
  if(type==='group'&&user.role!=='super_admin')throw fail('Administrator only',403);
  const name=type==='group'?text(body.name,80):'';
  const ref=type==='direct'?rooms.doc(directId(members)):rooms.doc();
  await db.runTransaction(async tx=>{const existing=await tx.get(ref);if(!existing.exists)tx.set(ref,{type,name,members,createdBy:uid,seq:0,createdAt:stamp(),updatedAt:stamp()});});
  return reply(200,{ok:true,id:ref.id});
 }
 const ref=rooms.doc(id(body.roomId)),r=await room(ref);access(user,uid,r);
 if(body.action==='messages'){
  let query=ref.collection('messages').orderBy('seq','desc');
  if(body.before!==undefined){if(!Number.isSafeInteger(body.before)||body.before<1)throw fail('Invalid message cursor');query=query.where('seq','<',body.before);}
  const q=await query.limit(50).get();return reply(200,{ok:true,seq:r.seq||0,messages:q.docs.map(s=>{const d=s.data();return {id:s.id,uid:d.uid,name:d.name,text:d.text,seq:d.seq,createdAt:d.createdAt?.toMillis?.()||0};}).reverse(),hasMore:q.size===50});
 }
 if(body.action==='read'){
  if(!Number.isSafeInteger(body.seq)||body.seq<0)throw fail('Invalid read position');
  const rr=ref.collection('reads').doc(uid);
  await db.runTransaction(async tx=>{const [rs,read]=await Promise.all([tx.get(ref),tx.get(rr)]);const current=rs.exists?rs.data():ref.id==='general'?general:null;access(user,uid,current);tx.set(rr,{seq:Math.max(read.data()?.seq||0,Math.min(body.seq,current.seq||0)),updatedAt:stamp()});});
  return reply(200,{ok:true});
 }
 if(body.action==='send'){
  const message=text(body.text,2000),request=id(body.requestId),mr=ref.collection('messages').doc(notices.digest(uid+':'+request)),rate=db.collection('teamChatLimits').doc(uid);
  const people=await roster();
  const jobs=await db.runTransaction(async tx=>{
   const [us,rs,prior,limit]=await Promise.all([tx.get(userRef),tx.get(ref),tx.get(mr),tx.get(rate)]);
   const current=rs.exists?rs.data():ref.id==='general'?general:null;access(us.data(),uid,current);
   if(prior.exists){if(prior.data().text!==message)throw fail('Message request already used',409);return [];}
   if(limit.data()?.lastAt?.toMillis?.()>Date.now()-1000)throw fail('Please wait before sending another message',429);
   const recipients=people.filter(p=>p.uid!==uid&&(current.type==='general'||current.members.includes(p.uid))),seq=(current.seq||0)+1;
   tx.set(mr,{uid,name:us.data().name||'Team member',text:message,seq,createdAt:stamp()});
   tx.set(ref,{...current,seq,updatedAt:stamp()},{merge:true});tx.set(rate,{lastAt:stamp()});tx.set(ref.collection('reads').doc(uid),{seq,updatedAt:stamp()});
   const ids=[];for(const p of recipients){const noticeId='chat_'+notices.digest(ref.id+':'+mr.id+':'+p.uid);ids.push(noticeId);notices.enqueue(tx,{uid:p.uid,id:noticeId,type:'chat_message',chatRoomId:ref.id});}return ids;
  });
  // Inbox and push jobs commit with the message; scheduled dispatcher retries failures.
  for(let i=0;i<jobs.length;i+=10)await Promise.allSettled(jobs.slice(i,i+10).map(job=>notices.deliver(job)));
  return reply(200,{ok:true});
 }
 throw fail('Unsupported action');
 }catch(e){return reply(e.status||400,{error:e.status?e.message:'Unable to process chat request'});}
};
