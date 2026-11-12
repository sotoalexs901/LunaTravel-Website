const admin = require('firebase-admin');
const crypto = require('node:crypto');
if (!admin.apps.length) admin.initializeApp({credential:admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}')),storageBucket:process.env.FIREBASE_STORAGE_BUCKET});
const db=admin.firestore();
const bucket=admin.storage().bucket();
const reply=(status,body)=>({statusCode:status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify(body)});
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const origin=()=>String(process.env.PUBLIC_SITE_URL||'https://freshborncleaning.com').replace(/\/$/,'');
async function send(to,subject,html){const from=process.env.FRESHBORN_FROM_EMAIL,api=process.env.RESEND_API_KEY;if(!from||!api)throw Error('Email service not configured');const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${api}`,'Content-Type':'application/json'},body:JSON.stringify({from,to:[to],subject,html})});const out=await r.json();if(!r.ok)throw Error(out.message||'Email provider rejected request');return out}
async function authContext(event){const m=(event.headers.authorization||event.headers.Authorization||'').match(/^Bearer (.+)$/);if(!m)throw Object.assign(Error('Sign in required'),{status:401});const decoded=await admin.auth().verifyIdToken(m[1]);const user=await db.collection('users').doc(decoded.uid).get();return {decoded,user:user.exists?user.data():null,uid:decoded.uid,email:String(decoded.email||'').toLowerCase()}}
const cleanDoc=(snap)=>{const d=snap.data();const iso=v=>v?.toDate?.()?.toISOString?.()||v||null;return {id:snap.id,...d,createdAt:iso(d.createdAt),updatedAt:iso(d.updatedAt),scheduledAt:iso(d.scheduledAt),completedAt:iso(d.completedAt)}};
function requireAdmin(ctx){if(!ctx.user||ctx.user.role!=='super_admin'||ctx.user.status!=='active')throw Object.assign(Error('Administrator only'),{status:403})}
function requireStaff(ctx){if(!ctx.user||ctx.user.role!=='staff'||ctx.user.status!=='active')throw Object.assign(Error('Active staff account required'),{status:403})}
async function customerByUid(uid){const q=await db.collection('quoteRequests').where('customerAuthUid','==',uid).limit(1).get();return q.empty?null:q.docs[0]}
exports.handler=async(event)=>{if(event.httpMethod!=='POST')return reply(405,{error:'POST required'});let body={};try{body=JSON.parse(event.body||'{}')}catch{return reply(400,{error:'Invalid JSON'})}try{
  const action=String(body.action||'');
  if(action==='activate-staff'){
    const ctx=await authContext(event),token=String(body.token||''),inviteId=String(body.inviteId||'');
    if(!/^[a-f0-9]{64}$/.test(token)||!/^[A-Za-z0-9_-]{8,80}$/.test(inviteId))return reply(400,{error:'Invalid invitation'});
    const ref=db.collection('staffInvites').doc(inviteId),snap=await ref.get();if(!snap.exists)return reply(404,{error:'Invitation not found'});const inv=snap.data();
    if(inv.usedAt) return reply(409,{error:'Invitation already used'});if(inv.expiresAt?.toMillis?.()<Date.now())return reply(410,{error:'Invitation expired'});if(inv.tokenHash!==hash(token))return reply(403,{error:'Invitation invalid'});if(String(inv.email||'').toLowerCase()!==ctx.email)return reply(403,{error:'Use the invited email address'});
    await db.runTransaction(async tx=>{tx.set(db.collection('users').doc(ctx.uid),{name:inv.name||ctx.decoded.name||'',email:ctx.email,role:'staff',status:'active',createdAt:admin.firestore.FieldValue.serverTimestamp(),updatedAt:admin.firestore.FieldValue.serverTimestamp()},{merge:true});tx.update(ref,{usedAt:admin.firestore.FieldValue.serverTimestamp(),usedByUid:ctx.uid});});
    return reply(200,{ok:true});
  }
  const ctx=await authContext(event);
  if(action==='admin-send-staff-invite'){
    requireAdmin(ctx);const name=String(body.name||'').trim(),email=String(body.email||'').trim().toLowerCase();if(!name||!/^\S+@\S+\.\S+$/.test(email))return reply(400,{error:'Valid name and email required'});
    const token=crypto.randomBytes(32).toString('hex'),inviteId=crypto.randomBytes(10).toString('hex');await db.collection('staffInvites').doc(inviteId).set({name,email,tokenHash:hash(token),createdBy:ctx.uid,createdAt:admin.firestore.FieldValue.serverTimestamp(),expiresAt:admin.firestore.Timestamp.fromMillis(Date.now()+7*86400000)});
    const url=`${origin()}/staff-register.html?invite=${encodeURIComponent(inviteId)}&token=${token}`;const sent=await send(email,'FreshBorn staff account invitation',`<p>Hello ${esc(name)},</p><p>You have been invited to create a FreshBorn staff account.</p><p><a href="${esc(url)}">Create your staff account</a></p><p>This invitation expires in 7 days.</p><p>FreshBorn Cleaning Services</p>`);await db.collection('staffInvites').doc(inviteId).update({resendEmailId:sent.id||null,emailProviderStatus:'accepted',lastSentAt:admin.firestore.FieldValue.serverTimestamp()});return reply(200,{ok:true,inviteId,emailId:sent.id||null,inviteUrl:url,emailProviderStatus:'accepted'});
  }

  if(action==='admin-list-staff-invites'){
    requireAdmin(ctx);const s=await db.collection('staffInvites').orderBy('createdAt','desc').limit(100).get();return reply(200,{ok:true,invites:s.docs.map(x=>{const d=x.data();return {id:x.id,name:d.name||'',email:d.email||'',usedAt:d.usedAt?.toDate?.()?.toISOString?.()||null,expiresAt:d.expiresAt?.toDate?.()?.toISOString?.()||null,lastSentAt:d.lastSentAt?.toDate?.()?.toISOString?.()||null,resendEmailId:d.resendEmailId||'',emailProviderStatus:d.emailProviderStatus||''}})});
  }
  if(action==='admin-resend-staff-invite'){
    requireAdmin(ctx);const inviteId=String(body.inviteId||'');const ref=db.collection('staffInvites').doc(inviteId),snap=await ref.get();if(!snap.exists)return reply(404,{error:'Invitation not found'});const inv=snap.data();if(inv.usedAt)return reply(409,{error:'Invitation already used'});const token=crypto.randomBytes(32).toString('hex'),url=`${origin()}/staff-register.html?invite=${encodeURIComponent(inviteId)}&token=${token}`;const sent=await send(inv.email,'FreshBorn staff account invitation',`<p>Hello ${esc(inv.name||'Team member')},</p><p>Your FreshBorn staff invitation has been reissued.</p><p><a href="${esc(url)}">Create your staff account</a></p><p>This new link expires in 7 days.</p><p>FreshBorn Cleaning Services</p>`);await ref.update({tokenHash:hash(token),expiresAt:admin.firestore.Timestamp.fromMillis(Date.now()+7*86400000),resendEmailId:sent.id||null,emailProviderStatus:'accepted',lastSentAt:admin.firestore.FieldValue.serverTimestamp()});return reply(200,{ok:true,inviteId,emailId:sent.id||null,inviteUrl:url,emailProviderStatus:'accepted'});
  }
  if(action==='admin-list-staff'){
    requireAdmin(ctx);const s=await db.collection('users').where('role','==','staff').get();return reply(200,{ok:true,staff:s.docs.map(x=>({uid:x.id,...x.data()}))});
  }
  if(action==='admin-list-customers'){
    requireAdmin(ctx);const s=await db.collection('quoteRequests').where('status','==','vip').get();return reply(200,{ok:true,customers:s.docs.map(x=>{const d=x.data();return {id:x.id,name:d.name,email:d.email,phone:d.phone||'',customerNumber:d.customerNumber||'',propertyType:d.propertyType||'',zip:d.zip||'',address:d.address||d.serviceAddress||'',quoteServices:d.quoteServices||'',quotePrice:d.quotePrice??null,frequency:d.frequency||'',assignedStaffUid:d.assignedStaffUid||'',assignedStaffName:d.assignedStaffName||''}})});}
  if(action==='admin-assign-customer'){
    requireAdmin(ctx);const customerId=String(body.customerId||''),staffUid=String(body.staffUid||'');const cref=db.collection('quoteRequests').doc(customerId),cs=await cref.get();if(!cs.exists||cs.data().status!=='vip')return reply(404,{error:'VIP customer not found'});
    if(!staffUid){await cref.update({assignedStaffUid:admin.firestore.FieldValue.delete(),assignedStaffName:admin.firestore.FieldValue.delete(),assignedAt:admin.firestore.FieldValue.delete(),updatedAt:admin.firestore.FieldValue.serverTimestamp()});return reply(200,{ok:true});}
    const ss=await db.collection('users').doc(staffUid).get();if(!ss.exists||ss.data().role!=='staff'||ss.data().status!=='active')return reply(400,{error:'Active staff member not found'});await cref.update({assignedStaffUid:staffUid,assignedStaffName:ss.data().name||ss.data().email||'Staff',assignedAt:admin.firestore.FieldValue.serverTimestamp(),updatedAt:admin.firestore.FieldValue.serverTimestamp()});return reply(200,{ok:true});
  }
  if(action==='admin-create-visit'){
    requireAdmin(ctx);const customerId=String(body.customerId||''),date=String(body.date||''),startTime=String(body.startTime||''),endTime=String(body.endTime||''),notes=String(body.notes||'').trim();if(!customerId||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^\d{2}:\d{2}$/.test(startTime))return reply(400,{error:'Customer, date and start time required'});
    const cs=await db.collection('quoteRequests').doc(customerId).get();if(!cs.exists)return reply(404,{error:'Customer not found'});const c=cs.data();if(!c.assignedStaffUid)return reply(400,{error:'Assign this customer to staff first'});
    const ref=await db.collection('serviceVisits').add({customerId,customerAuthUid:c.customerAuthUid||null,customerName:c.name||'',customerNumber:c.customerNumber||'',customerEmail:c.email||'',address:c.address||c.serviceAddress||'',zip:c.zip||'',services:c.quoteServices||'',assignedStaffUid:c.assignedStaffUid,assignedStaffName:c.assignedStaffName||'',date,startTime,endTime,notes,status:'scheduled',createdBy:ctx.uid,createdAt:admin.firestore.FieldValue.serverTimestamp(),updatedAt:admin.firestore.FieldValue.serverTimestamp()});return reply(200,{ok:true,visitId:ref.id});
  }
  if(action==='admin-list-visits'){
    requireAdmin(ctx);const s=await db.collection('serviceVisits').orderBy('date','asc').limit(300).get();return reply(200,{ok:true,visits:s.docs.map(cleanDoc)});
  }
  if(action==='staff-dashboard'){
    requireStaff(ctx);const [cust,vis]=await Promise.all([db.collection('quoteRequests').where('assignedStaffUid','==',ctx.uid).get(),db.collection('serviceVisits').where('assignedStaffUid','==',ctx.uid).get()]);return reply(200,{ok:true,staff:{name:ctx.user.name||'',email:ctx.user.email||ctx.email},customers:cust.docs.map(cleanDoc),visits:vis.docs.map(cleanDoc).sort((a,b)=>(a.date+a.startTime).localeCompare(b.date+b.startTime))});
  }
  if(action==='staff-complete-visit'){
    requireStaff(ctx);const visitId=String(body.visitId||''),snap=await db.collection('serviceVisits').doc(visitId).get();if(!snap.exists||snap.data().assignedStaffUid!==ctx.uid)return reply(404,{error:'Visit not found'});await snap.ref.update({status:'completed',completedAt:admin.firestore.FieldValue.serverTimestamp(),updatedAt:admin.firestore.FieldValue.serverTimestamp()});return reply(200,{ok:true});
  }
  if(action==='staff-upload-photo'){
    requireStaff(ctx);const visitId=String(body.visitId||''),caption=String(body.caption||'').slice(0,300),dataUrl=String(body.dataUrl||'');const vs=await db.collection('serviceVisits').doc(visitId).get();if(!vs.exists||vs.data().assignedStaffUid!==ctx.uid)return reply(404,{error:'Visit not found'});const m=dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);if(!m)return reply(400,{error:'JPG, PNG or WebP image required'});const buf=Buffer.from(m[2],'base64');if(buf.length>2*1024*1024)return reply(400,{error:'Image must be 2 MB or smaller'});const ext=m[1].split('/')[1].replace('jpeg','jpg'),path=`service-visits/${visitId}/${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`,file=bucket.file(path);await file.save(buf,{metadata:{contentType:m[1],cacheControl:'public,max-age=31536000'}});await file.makePublic();const url=`https://storage.googleapis.com/${bucket.name}/${path}`;await db.collection('serviceVisits').doc(visitId).collection('photos').add({url,path,caption,uploadedBy:ctx.uid,uploadedAt:admin.firestore.FieldValue.serverTimestamp()});return reply(200,{ok:true,url});
  }
  if(action==='client-service-dashboard'){
    const c=await customerByUid(ctx.uid);if(!c)return reply(403,{error:'Customer profile not found'});const customerId=c.id;const vis=await db.collection('serviceVisits').where('customerId','==',customerId).get();const visits=[];for(const v of vis.docs){const item=cleanDoc(v),ps=await v.ref.collection('photos').orderBy('uploadedAt','asc').get();item.photos=ps.docs.map(p=>({id:p.id,...p.data(),uploadedAt:p.data().uploadedAt?.toDate?.()?.toISOString()||null}));visits.push(item)}visits.sort((a,b)=>(a.date+a.startTime).localeCompare(b.date+b.startTime));return reply(200,{ok:true,visits});
  }
  return reply(400,{error:'Unsupported action'});
}catch(e){console.error('service-operations',e);return reply(e.status||400,{error:e.message||'Unable to process request'})}};
