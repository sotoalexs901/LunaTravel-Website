const admin = require('firebase-admin');
const crypto = require('node:crypto');
function db(){return admin.firestore();}
const now=()=>admin.firestore.FieldValue.serverTimestamp();
const digest=s=>crypto.createHash('sha256').update(s).digest('hex');
const configured=()=>/^[A-Za-z0-9_-]{80,120}$/.test(process.env.FIREBASE_WEB_PUSH_PUBLIC_KEY||'');
// Called in the same transaction as the assignment so the inbox cannot lose an event.
function enqueue(tx,{uid,id,type,visitId='',customerId=''}){
 const title=type==='service_assigned'?'New cleaning service':'Customer assigned';
 const body=type==='service_assigned'?'A cleaning visit has been assigned to you. Open FreshBorn to review your schedule.':'A customer has been assigned to you. Open FreshBorn for the details.';
 const url=visitId?'/staff-portal.html?visit='+encodeURIComponent(visitId):'/staff-portal.html';
 const event={title,body,url,type,visitId,customerId,createdAt:now(),readAt:null};
 tx.set(db().collection('users').doc(uid).collection('notifications').doc(id),event);
 tx.set(db().collection('notificationOutbox').doc(id),{uid,id,...event,status:'pending',attempts:0,deliveredDevices:[],nextAttemptAt:admin.firestore.Timestamp.fromMillis(Date.now()),expiresAt:admin.firestore.Timestamp.fromMillis(Date.now()+86400000)});
}
async function deliver(id){
 const ref=db().collection('notificationOutbox').doc(id),lease=crypto.randomBytes(12).toString('hex');
 const job=await db().runTransaction(async tx=>{const s=await tx.get(ref);if(!s.exists)return null;const j=s.data();if(j.status==='sent'||j.status==='failed'||j.status==='expired'||j.nextAttemptAt?.toMillis?.()>Date.now())return null;if(j.status==='processing'&&j.leaseUntil?.toMillis?.()>Date.now())return null;if(j.expiresAt?.toMillis?.()<=Date.now()){tx.update(ref,{status:'expired'});return null;}if(!configured()){tx.update(ref,{nextAttemptAt:admin.firestore.Timestamp.fromMillis(Date.now()+300000)});return null;}tx.update(ref,{status:'processing',lease,leaseUntil:admin.firestore.Timestamp.fromMillis(Date.now()+120000),attempts:(j.attempts||0)+1});return {...j,attempts:(j.attempts||0)+1};});
 if(!job)return {queued:true};
 try{
  const user=await db().collection('users').doc(job.uid).get();
  if(!user.exists||user.data().role!=='staff'||user.data().status!=='active'){await ref.update({status:'expired',lastError:'inactive_recipient'});return {skipped:true};}
  const all=await db().collection('pushDevices').where('uid','==',job.uid).limit(30).get();
  const devices=all.docs.filter(s=>s.data().active===true&&s.data().token&&!(job.deliveredDevices||[]).includes(s.id));
  if(!devices.length){await ref.update({status:'sent',completedAt:now(),result:'inbox_only_or_already_sent'});return {inboxOnly:true};}
  const response=await admin.messaging().sendEachForMulticast({tokens:devices.map(d=>d.data().token),data:{title:job.title,body:job.body,url:job.url,eventId:id,recipientUid:job.uid,type:job.type},webpush:{headers:{TTL:'3600',Urgency:'normal'}}});
  const sent=[...(job.deliveredDevices||[])];let retry=false;
  for(let i=0;i<devices.length;i++){
   const result=response.responses[i];if(result?.success){sent.push(devices[i].id);continue;}
   const code=result?.error?.code||'unknown';if(['messaging/registration-token-not-registered','messaging/invalid-registration-token'].includes(code))await devices[i].ref.update({active:false,lastError:code,updatedAt:now()});else retry=true;
  }
  await db().runTransaction(async tx=>{const s=await tx.get(ref);if(!s.exists||s.data().lease!==lease)return;tx.update(ref,{status:retry&&job.attempts<5?'pending':retry?'failed':'sent',deliveredDevices:[...new Set(sent)],lastError:retry?'provider_retry':'',completedAt:retry?null:now(),nextAttemptAt:admin.firestore.Timestamp.fromMillis(Date.now()+Math.min(3600000,60000*2**job.attempts)),leaseUntil:null});});
  return {accepted:response.successCount||0,queued:retry};
 }catch{
  // Assignment is already committed. Provider problems must never become a failed assignment.
  await db().runTransaction(async tx=>{const s=await tx.get(ref);if(!s.exists||s.data().lease!==lease)return;tx.update(ref,{status:job.attempts<5?'pending':'failed',lastError:'provider_unavailable',nextAttemptAt:admin.firestore.Timestamp.fromMillis(Date.now()+300000),leaseUntil:null});});return {queued:true};
 }
}
module.exports={enqueue,deliver,digest,configured};
