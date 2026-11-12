// Deploy as netlify/functions/resend-inbound.js
// Required: RESEND_WEBHOOK_SECRET, RESEND_INBOUND_API_KEY, FIREBASE_SERVICE_ACCOUNT_JSON.
const crypto=require('node:crypto');
const admin=require('firebase-admin');
let db;
function firestore(){if(!admin.apps.length){const json=process.env.FIREBASE_SERVICE_ACCOUNT_JSON;if(!json)throw Error('FIREBASE_SERVICE_ACCOUNT_JSON missing');admin.initializeApp({credential:admin.credential.cert(JSON.parse(json))});}return db||(db=admin.firestore())}
const out=(code,msg)=>({statusCode:code,headers:{'content-type':'application/json'},body:JSON.stringify(msg)});
function header(headers,key){return headers[key]||headers[key.toLowerCase()]||headers[key.toUpperCase()]||''}
function validSignature(event){
  const secret=process.env.RESEND_WEBHOOK_SECRET;if(!secret)throw Error('RESEND_WEBHOOK_SECRET missing');
  const id=header(event.headers,'svix-id'),timestamp=header(event.headers,'svix-timestamp'),signatures=header(event.headers,'svix-signature');
  if(!id||!timestamp||!signatures)return false;
  const seconds=Number(timestamp);if(!Number.isFinite(seconds)||Math.abs(Date.now()/1000-seconds)>300)return false;
  const key=Buffer.from(secret.replace(/^whsec_/,''),'base64');
  const payload=event.isBase64Encoded?Buffer.from(event.body||'','base64').toString('utf8'):event.body||'';
  const expected=crypto.createHmac('sha256',key).update(`${id}.${timestamp}.${payload}`).digest();
  return signatures.split(' ').some(entry=>{const parts=entry.split(',');if(parts.length!==2||parts[0]!=='v1')return false;let actual;try{actual=Buffer.from(parts[1],'base64')}catch{return false}return actual.length===expected.length&&crypto.timingSafeEqual(actual,expected)});
}
exports.handler=async event=>{
  if(event.httpMethod!=='POST')return out(405,{error:'POST only'});
  try{if(!validSignature(event))return out(401,{error:'Invalid webhook signature'});
    const raw=event.isBase64Encoded?Buffer.from(event.body||'','base64').toString('utf8'):event.body||'';
    const notice=JSON.parse(raw);if(notice.type!=='email.received')return out(200,{ok:true,ignored:true});
    const emailId=String(notice.data?.email_id||'');if(!emailId)return out(400,{error:'Missing email id'});
    const api=process.env.RESEND_INBOUND_API_KEY;if(!api)throw Error('RESEND_INBOUND_API_KEY missing');
    const response=await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}`,{headers:{Authorization:`Bearer ${api}`}});
    if(!response.ok)throw Error(`Resend inbound fetch failed: ${response.status}`);
    const payload=await response.json();
    const recipients=[...(Array.isArray(payload.to)?payload.to:[payload.to]),...(Array.isArray(notice.data?.to)?notice.data.to:[notice.data?.to])].filter(Boolean).map(String);
    const match=recipients.map(v=>v.match(/reply\+([A-Za-z0-9]{10,40})@inbox\.freshborncleaning\.com/i)).find(Boolean);
    if(!match)return out(200,{ok:true,ignored:'Unrecognized recipient'});
    const id=match[1],database=firestore(),ref=database.collection('quoteRequests').doc(id),snap=await ref.get();
    if(!snap.exists)return out(200,{ok:true,ignored:'Customer not found'});
    const from=String(payload.from||notice.data?.from||'');
    const email=String(snap.data().email||'').toLowerCase();
    const sender=from.match(/<([^>]+)>/)?.[1]||from;
    if(sender.trim().toLowerCase()!==email)return out(200,{ok:true,ignored:'Sender not matched'});
    const messageRef=ref.collection('messages').doc('resend_'+emailId);
    const existing=await messageRef.get();if(existing.exists)return out(200,{ok:true,duplicate:true});
    const body=String(payload.text||payload.html?.replace(/<[^>]+>/g,' ')||'').slice(0,20000);
    await messageRef.create({direction:'inbound',from:sender,to:recipients.join(', '),subject:String(payload.subject||'').slice(0,500),text:body,resendEmailId:emailId,createdAt:admin.firestore.FieldValue.serverTimestamp()});
    await ref.update({lastCustomerMessageAt:admin.firestore.FieldValue.serverTimestamp(),hasUnreadMessage:true});
    return out(200,{ok:true});
  }catch(error){console.error('resend-inbound',error);return out(500,{error:'Unable to process inbound message'})}
};
