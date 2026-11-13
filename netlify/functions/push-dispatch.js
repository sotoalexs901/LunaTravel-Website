const admin=require('firebase-admin');
if(!admin.apps.length)admin.initializeApp({credential:admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON||'{}'))});
const {deliver,configured}=require('../lib/notifications');
exports.handler=async()=>{
 if(!configured())return {statusCode:200,body:JSON.stringify({processed:0,configured:false})};
 const db=admin.firestore();const queries=await Promise.all([db.collection('notificationOutbox').where('status','==','pending').limit(30).get(),db.collection('notificationOutbox').where('status','==','processing').limit(30).get()]);
 const jobs=queries.flatMap(q=>q.docs).filter(s=>{const d=s.data();return (!d.nextAttemptAt||d.nextAttemptAt.toMillis()<=Date.now())&&(d.status!=='processing'||!d.leaseUntil||d.leaseUntil.toMillis()<=Date.now());}).slice(0,5);
 const results=await Promise.allSettled(jobs.map(s=>deliver(s.id)));return {statusCode:200,body:JSON.stringify({processed:results.length})};
};
