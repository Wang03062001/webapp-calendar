import test from 'node:test';
import assert from 'node:assert/strict';
import {createSmtpSender} from '../supabase/functions/_shared/account-mailer.js';
test('Gmail transport uses verified TLS, timeouts and server-side app password',async()=>{
 let options,mail;
 const sender=createSmtpSender({user:'sender@gmail.com',password:'abcd efgh ijkl mnop'},value=>{options=value;return{sendMail:async value=>{mail=value;return{accepted:['recipient@example.test']}}}});
 assert.equal(options.host,'smtp.gmail.com');assert.equal(options.port,465);assert.equal(options.secure,true);assert.equal(options.requireTLS,true);assert.equal(options.tls.rejectUnauthorized,true);assert.equal(options.auth.pass,'abcdefghijklmnop');assert.equal(options.debug,false);assert.ok(options.socketTimeout<=15000);
 assert.equal(await sender({to:'recipient@example.test',subject:'Verification',text:'code: 123456'}),true);
 assert.equal(mail.from,'sender@gmail.com');assert.equal(mail.disableFileAccess,true);assert.equal(mail.disableUrlAccess,true);assert.equal(JSON.stringify(mail).includes('abcdefghijklmnop'),false);
});
test('SMTP missing credentials and unsafe configuration do not create a transport',()=>{
 let calls=0;const factory=()=>calls++;
 for(const config of [{user:'a'}, {user:'a',password:'b',port:25},{user:'a',password:'b',from:'a\r\nBcc: other@example.test'}])assert.equal(createSmtpSender(config,factory),null);
 assert.equal(calls,0);
});
test('STARTTLS cannot downgrade and rejected recipients are not marked delivered',async()=>{
 let options;
 const send=createSmtpSender({host:'smtp.example.test',port:587,user:'a',password:'with space',from:'a@example.test'},value=>{options=value;return{sendMail:async()=>({accepted:[]})}});
 assert.equal(options.secure,false);assert.equal(options.requireTLS,true);assert.equal(options.auth.pass,'with space');assert.equal(await send({to:'b@example.test',text:'code'}),false);
});
