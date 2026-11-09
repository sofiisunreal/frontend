import assert from 'node:assert/strict';
import test from 'node:test';
import {normalizeError,friendlyErrorMessage,errorDiagnostic} from '../src/lib/errors.js';
const apiError=(status,details)=>({status,details,message:'Raw exception /api/private/ secret=DO_NOT_RENDER'});
test('DRF detail becomes useful plain copy without exposing the detail key',()=>{
 const r=normalizeError(apiError(400,{detail:'Financial loan terms cannot be changed after the first repayment.'}),{context:'record'});
 assert.equal(r.kind,'validation');assert.equal(r.message,'Financial loan terms cannot be changed after the first repayment.');assert(!r.message.includes('detail:'));
});
test('incorrect, inactive, deleted and missing accounts share safe public login copy',()=>{
 for(const detail of ['No active account found with the given credentials','User is inactive','User was deleted','User does not exist'])assert.equal(normalizeError(apiError(401,{detail}),{context:'login'}).message,'The username or password you entered is incorrect.');
 assert.match(normalizeError(apiError(400,{detail:'No active account found with the given credentials'}),{context:'login'}).message,/username or password/);
});
test('protected 401 is session expiry; ordinary validation and permission errors stay distinct',()=>{
 assert.match(normalizeError(apiError(401,{detail:'Token is invalid or expired'}),{context:'profile'}).message,/session has expired/);
 assert.equal(normalizeError(apiError(400,{email:['Enter a valid email address.']})).kind,'validation');
 assert.equal(normalizeError(apiError(403,{detail:'Internal permission class failed'})).kind,'permission');
});
test('registration validation stays next to its fields with all password constraints',()=>{
 const r=normalizeError(apiError(400,{email:['Enter a valid email address.'],password:['This password is too common.','This password is too short. It must contain at least 12 characters.']}),{context:'register'});
 assert.equal(r.fieldErrors.email,'Enter a valid email address.');assert.match(r.fieldErrors.password,/too common/);assert.match(r.fieldErrors.password,/12 characters/);assert.equal(r.message,'Please check the highlighted details.');
 assert.match(friendlyErrorMessage(apiError(400,{email:['Enter a valid email address.']})),/^Email address:/);
});
test('nested objects and indexed arrays keep safe field identities and meaningful labels',()=>{
 const r=normalizeError(apiError(400,{profile:{email:['Enter a valid email address.']},repayments:[{amount:['Ensure this value is greater than or equal to 0.01.']}]}));
 assert.equal(r.fieldErrors['profile.email'],'Enter a valid email address.');assert.match(r.fieldErrors['repayments.0.amount'],/0.01/);assert.equal(r.issues[1].label,'Amount');
 const mapped=normalizeError(apiError(400,{profile:{email:['Enter a valid email address.']}}),{fields:{email:'Email address'}});assert(mapped.fieldErrors.email);
});
test('non-field errors and top-level arrays are handled without numeric JSON keys',()=>{
 for(const payload of [['Monthly budgets must cover a calendar month.'],{non_field_errors:['Monthly budgets must cover a calendar month.']}])assert.equal(normalizeError(apiError(400,payload)).message,'Monthly budgets must cover a calendar month.');
 assert.equal(normalizeError({email:['Enter a valid email address.']}).fieldErrors.email,'Enter a valid email address.');
});
test('numeric limits, decimal precision and authoritative repayment restrictions are preserved',()=>{
 for(const message of ['Ensure that there are no more than 4 decimal places.','Ensure this value is less than or equal to 999999.99.','Repayment cannot exceed the outstanding loan obligation.','Withdrawal cannot exceed the current saved amount of 1925.50.'])assert.equal(normalizeError(apiError(400,{amount:[message]})).fieldErrors.amount,message);
});
test('aliases attach backend interest/reset fields to the actual form control',()=>{
 const r=normalizeError(apiError(400,{interest_method:['No-interest loans cannot include interest values.']}),{fields:[{name:'interest_type',label:'Interest type'}],aliases:{interest_method:'interest_type'}});assert.match(r.fieldErrors.interest_type,/No-interest/);
 const reset=normalizeError(apiError(400,{new_password:['This password is too common.']}),{context:'reset',fields:{password:'New password'},aliases:{new_password:'password'}});assert(reset.fieldErrors.password);
});
test('fetch/Axios connection and timeout failures have separate useful messages',()=>{
 for(const e of [{status:0},{isAxiosError:true,request:{},message:'Network Error'},{code:'ERR_NETWORK'}])assert.equal(normalizeError(e).kind,'network');
 for(const e of [{status:0,transport:'timeout'},{code:'ECONNABORTED'},{code:'ETIMEDOUT'},{name:'TimeoutError'},{status:408},{status:504}])assert.equal(normalizeError(e).kind,'timeout');
 assert.equal(normalizeError({name:'AbortError'}).cancelled,true);
});
test('server errors, HTML, JS exceptions, credentials and internal paths never reach UI copy',()=>{
 const secret='SECRET_VALUE';
 for(const e of [apiError(500,{detail:`Traceback ${secret}`}),apiError(400,`<html><pre>${secret}</pre></html>`),new Error(`TypeError ${secret} /api/private/`),apiError(400,{email:[`DatabaseError: ${secret}`]}),apiError(400,{internal:{stack:`Traceback ${secret}`}})])assert(!JSON.stringify(normalizeError(e)).includes(secret));
 assert.equal(normalizeError(new TypeError('x is not a function')).kind,'unexpected');
});
test('unknown, malformed and cyclic error shapes fall back safely and stay bounded',()=>{
 const cyclic={};cyclic.loop=cyclic;for(const value of [null,undefined,42,true,{unexpected:['Traceback /api/private/']},cyclic])assert.equal(typeof normalizeError(value).message,'string');
 const poison=JSON.parse('{"__proto__":{"email":["Enter a valid email address."]}}');assert.deepEqual(normalizeError(apiError(400,poison)).fieldErrors,{});
 const inherited=normalizeError(apiError(400,{toString:['This field is required.'],hasOwnProperty:['This field is required.']}));assert.equal(inherited.issues.length,0);assert(!friendlyErrorMessage(apiError(400,{toString:['This field is required.']})).includes('native code'));
});
test('payment interruptions keep the outcome unknown and discourage duplicate payment',()=>{
 for(const e of [apiError(0),{status:0,transport:'timeout'},apiError(503,{detail:'Paystack sk_test_SECRET timeout'}),apiError(400,{detail:'Payment could not be verified.'}),new Error('Unexpected response')]){
  const r=normalizeError(e,{context:'paymentVerify'});assert.match(r.message,/check again/i);assert(!/payment (?:has )?failed|you were charged|sk_test_SECRET/i.test(r.message));
 }
});
test('checkout conflicts, owned-purchase lookup and deletion blockers have safe contextual recovery',()=>{
 assert.match(normalizeError(apiError(409,{detail:'Provider raw conflict'}),{context:'checkout'}).message,/already be in progress/);
 assert.match(normalizeError(apiError(404,{detail:'Purchase not found.'}),{context:'paymentVerify'}).message,/account used at checkout/);
 assert.match(normalizeError(apiError(409,{detail:'ProtectedError billing_entitlement'}),{context:'deleteAccount'}).message,/Help/);
});
test('reset-link failures are explicit; missing reset accounts do not falsely claim email delivery',()=>{
 assert.equal(normalizeError(apiError(400,{error:'Invalid or expired password reset link.'}),{context:'reset'}).kind,'reset-link');
 const r=normalizeError(apiError(404,{detail:'User does not exist'}),{context:'forgot'});assert(!/sent|account.*not exist/i.test(r.message));
});
test('legal stale detection copy preserves explicit review and never records agreement',()=>{
 const r=normalizeError(apiError(400,{terms_document:['Identity mismatch']}),{context:'legalAccept'});assert.equal(r.kind,'legal-stale');assert.match(r.message,/review/i);assert(!/saved|accepted/.test(r.message));
});
test('development diagnostics contain only bounded metadata, never raw messages or payloads',()=>{
 const e=apiError(500,{password:'SECRET',access:'SECRET',stack:'SECRET'});const d=errorDiagnostic(e,'POST');assert.deepEqual(Object.keys(d),['event','method','status','kind']);assert(!JSON.stringify(d).includes('SECRET'));assert.equal(errorDiagnostic(e,'SECRET').method,'OTHER');
});
