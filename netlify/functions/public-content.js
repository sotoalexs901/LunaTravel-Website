// New Netlify function: netlify/functions/public-content.js
// Requires existing firebase-admin dependency and FIREBASE_SERVICE_ACCOUNT_JSON.
// For photo uploads, set FIREBASE_STORAGE_BUCKET in Netlify to your actual Firebase Storage bucket name.
const admin=require('firebase-admin');
if(!admin.apps.length)admin.initializeApp({credential:admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON||'{}'))});
const db=admin.firestore(),COL='publicContent';
const respond=(code,obj)=>({statusCode:code,headers:{'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'https://freshborncleaning.com'},body:JSON.stringify(obj)});
const validId=id=>/^[A-Za-z0-9_-]{10,60}$/.test(String(id||''));
const summary=(s)=>{const d=s.data();return{id:s.id,type:d.type,title:d.title,description:d.description,expiresAt:d.expiresAt||'',published:!!d.published,hasImage:!!d.imagePath,createdAt:d.createdAt?.toDate?.()?.toISOString()||null}};
const active=x=>x.published&&(!x.expiresAt||x.expiresAt>=new Date().toISOString().slice(0,10));
async function authorize(event){const bearer=(event.headers.authorization||event.headers.Authorization||'').match(/^Bearer (.+)$/);if(!bearer)throw Error('Sign in required');const decoded=await admin.auth().verifyIdToken(bearer[1]);const u=await db.collection('users').doc(decoded.uid).get();if(!u.exists||u.data().role!=='super_admin'||u.data().status!=='active')throw Error('Administrator only');return decoded.uid}
function bucket(){const name=process.env.FIREBASE_STORAGE_BUCKET;if(!name)throw Error('Set FIREBASE_STORAGE_BUCKET in Netlify to your Firebase Storage bucket name');return admin.storage().bucket(name)}
exports.handler=async(event)=>{try{
 if(event.httpMethod==='GET'){
  const image=event.queryStringParameters?.image;
  if(image){if(!validId(image))return respond(400,{error:'Invalid image'});const snap=await db.collection(COL).doc(image).get();if(!snap.exists||!active(summary(snap))||!snap.data().imagePath)return respond(404,{error:'Not found'});const [buf]=await bucket().file(snap.data().imagePath).download();return{statusCode:200,isBase64Encoded:true,headers:{'Content-Type':'image/jpeg','Cache-Control':'public,max-age=300','X-Content-Type-Options':'nosniff'},body:buf.toString('base64')}}
  const snaps=await db.collection(COL).orderBy('createdAt','desc').limit(80).get();return respond(200,{items:snaps.docs.map(summary).filter(active)});
 }
 if(event.httpMethod!=='POST')return respond(405,{error:'Method not allowed'});
 const uid=await authorize(event);let data;try{data=JSON.parse(event.body||'{}')}catch{return respond(400,{error:'Invalid JSON'})}
 const action=data.action;if(action==='admin-check')return respond(200,{ok:true});
 if(action==='admin-list'){const snaps=await db.collection(COL).orderBy('createdAt','desc').limit(100).get();return respond(200,{items:snaps.docs.map(summary)})}
 if(action==='publish'){
  const type=data.type;if(!['photo','offer'].includes(type))return respond(400,{error:'Invalid type'});
  const title=String(data.title||'').trim(),description=String(data.description||'').trim(),expiresAt=String(data.expiresAt||'');if(!title||title.length>100||description.length>700)return respond(400,{error:'Invalid title or description'});
  if(expiresAt&&!/^\d{4}-\d{2}-\d{2}$/.test(expiresAt))return respond(400,{error:'Invalid date'});
  const ref=db.collection(COL).doc();let imagePath=null;
  if(type==='photo'){const raw=String(data.imageData||'');if(!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(raw)||raw.length>1800000)return respond(400,{error:'Invalid or oversized image'});const bytes=Buffer.from(raw.split(',')[1],'base64');if(bytes.length>1350000)return respond(400,{error:'Image exceeds limit'});imagePath=`public-content/${ref.id}.jpg`;await bucket().file(imagePath).save(bytes,{resumable:false,contentType:'image/jpeg',metadata:{cacheControl:'public,max-age=300'}})}
  try{await ref.set({type,title,description,expiresAt,imagePath,published:true,createdBy:uid,createdAt:admin.firestore.FieldValue.serverTimestamp()})}catch(e){if(imagePath)await bucket().file(imagePath).delete({ignoreNotFound:true}).catch(()=>{});throw e}return respond(200,{ok:true,id:ref.id});
 }
 if(action==='set-published'||action==='delete'){
  const id=String(data.id||'');if(!validId(id))return respond(400,{error:'Invalid ID'});const ref=db.collection(COL).doc(id),snap=await ref.get();if(!snap.exists)return respond(404,{error:'Not found'});
  if(action==='set-published'){if(typeof data.published!=='boolean')return respond(400,{error:'Invalid published state'});await ref.update({published:data.published,updatedAt:admin.firestore.FieldValue.serverTimestamp()});return respond(200,{ok:true})}
  await ref.delete();if(snap.data().imagePath)await bucket().file(snap.data().imagePath).delete({ignoreNotFound:true}).catch(e=>console.error('Storage cleanup failed',e));return respond(200,{ok:true});
 }
 return respond(400,{error:'Unsupported action'});
 }catch(e){console.error('public-content',e);return respond(/Sign in required|Administrator only/.test(e.message)?403:500,{error:e.message||'Server error'})}};
