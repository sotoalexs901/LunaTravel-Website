const crypto = require('node:crypto');
const fail = (message, status=400) => Object.assign(Error(message), {status});
const active = user => user?.status === 'active' && ['staff','super_admin'].includes(user.role);
function access(user, uid, room) {
 if (!active(user)) throw fail('Active team account required',403);
 if (!room || (room.type !== 'general' && !room.members?.includes(uid))) throw fail('Conversation unavailable',403);
}
function text(value, max) { if(typeof value!=='string'||!value.trim()||value.trim().length>max) throw fail('Invalid text'); return value.trim(); }
function id(value) { if(typeof value!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(value)) throw fail('Invalid identifier'); return value; }
const directId = members => 'dm_'+crypto.createHash('sha256').update(JSON.stringify([...members].sort())).digest('hex');
module.exports={active,access,text,id,directId,fail};
