import assert from 'node:assert/strict';
import test from 'node:test';
import {googleLoginBody,googleRegistrationBody,isGoogleClientId,validateGoogleTokens,validateGoogleProfile} from '../src/lib/googleState.js';
import {normalizeError,errorDiagnostic} from '../src/lib/errors.js';
import {renderGoogleIdentityButton,disableGoogleAutoSelect,loadGoogleIdentity} from '../src/lib/googleIdentity.js';
const credential='synthetic.google.credential';
const identities={terms_document:{id:10,version:'1.0',content_sha256:'a'.repeat(64)},privacy_document:{id:20,version:'1.0',content_sha256:'b'.repeat(64)}};
const declarations={age_eligibility:true,accept_terms:true,accept_privacy_policy:true};
test('public web client ID is validated without using a client secret',()=>{assert(isGoogleClientId('123456-local.apps.googleusercontent.com'));for(const id of['','client-secret','https://accounts.google.com','123.apps.googleusercontent.com.evil'])assert(!isGoogleClientId(id));});
test('linked login and linking send only an opaque credential, never inferred email or subject',()=>{assert.deepEqual(googleLoginBody(credential),{credential});for(const value of[null,'',{},'x'.repeat(12001)])assert.throws(()=>googleLoginBody(value),e=>e.code==='invalid_google_credential');});
test('registration requires all three explicit true declarations and exact policy identities',()=>{assert.deepEqual(googleRegistrationBody(credential,identities,declarations),{credential,...declarations,...identities});for(const key of Object.keys(declarations))for(const value of[false,undefined,'true'])assert.throws(()=>googleRegistrationBody(credential,identities,{...declarations,[key]:value}),e=>e.code==='legal_acceptance_required');});
test('missing/corrupt identity metadata cannot become a registration payload',()=>{for(const pair of[null,{}, {...identities,terms_document:{...identities.terms_document,content_sha256:'not-a-hash'}},{...identities,privacy_document:{...identities.privacy_document,id:10}}])assert.throws(()=>googleRegistrationBody(credential,pair,declarations));assert.deepEqual(googleRegistrationBody(credential,identities,declarations).terms_document,identities.terms_document);});
test('only valid Budgetly token pairs and server profiles can seed a session; entitlements are ignored',()=>{assert.deepEqual(validateGoogleTokens({access:'budgetly.access.jwt',refresh:'budgetly.refresh.jwt',has_lifetime_access:true}),{access:'budgetly.access.jwt',refresh:'budgetly.refresh.jwt'});for(const value of[null,{}, {access:'same',refresh:'same'},{access:'raw secret',refresh:'other'}])assert.throws(()=>validateGoogleTokens(value));assert.deepEqual(validateGoogleProfile({id:1,username:'server-user'}),{id:1,username:'server-user'});assert.throws(()=>validateGoogleProfile({id:1,username:{raw:'unexpected'}}));});
test('Google errors use the shared safe messages and explicit next actions',()=>{const err=(code,status=400)=>({status,details:{code,detail:'RAW_PROVIDER_SECRET'}});assert.equal(normalizeError(err('link_required',409),{context:'googleLogin'}).action,'password-link');assert.equal(normalizeError(err('legal_acceptance_required'),{context:'googleLogin'}).action,'register');for(const code of['invalid_google_credential','identity_in_use','user_already_linked','inactive_user','google_auth_unavailable','google_sdk_unavailable','google_popup_closed','google_popup_blocked']){const r=normalizeError(err(code),{context:'googleLink'});assert(!r.message.includes('RAW_PROVIDER'));}assert.equal(normalizeError({status:429},{context:'googleLogin'}).kind,'rate-limit');assert.equal(normalizeError({status:401},{context:'googleLink'}).kind,'authentication');});
test('Google provider tokens are excluded from diagnostics even when a backend payload contains them',()=>{const r=errorDiagnostic({status:400,details:{credential,code:'invalid_google_credential'}});assert(!JSON.stringify(r).includes(credential));assert.deepEqual(Object.keys(r),['event','method','status','kind']);});
test('official button broker initializes once, routes exact state once and ignores stale controls',async()=>{
 const previous=globalThis.window;let config,initializations=0,disables=0;const buttons=[];
 const sdk={initialize:c=>{config=c;initializations++;},renderButton:(el,options)=>{buttons.push(options);el.rendered=options.state;},disableAutoSelect:()=>disables++};globalThis.window={google:{accounts:{id:sdk}}};
 const element=()=>({dataset:{},clientWidth:320,isConnected:true,replaceChildren(){this.rendered=null;}}),el=element(),received=[];
 try{
  const opts={clientId:'123456-local.apps.googleusercontent.com',theme:'light',onCredential:value=>received.push(value)};
  const first=await renderGoogleIdentityButton(el,opts),second=await renderGoogleIdentityButton(el,{...opts,theme:'dark'});
  first();assert.equal(el.rendered,buttons[1].state);assert.equal(initializations,1);assert.equal(config.auto_select,false);assert.equal(config.button_auto_select,false);assert.equal(config.ux_mode,'popup');
  config.callback({state:buttons[0].state,credential});config.callback({state:'unknown',credential});assert.equal(received.length,0);
  config.callback({state:buttons[1].state,credential});config.callback({state:buttons[1].state,credential});assert.deepEqual(received,[credential]);second();
  const cleanup=await renderGoogleIdentityButton(element(),opts);disableGoogleAutoSelect();config.callback({state:buttons.at(-1).state,credential});assert.equal(received.length,1);assert.equal(disables,1);cleanup();
 }finally{globalThis.window=previous;}
});
test('script failures are bounded, safe and retryable without a fake authentication button',async()=>{
 const oldWindow=globalThis.window,oldDocument=globalThis.document;let removed=0;
 globalThis.window={setTimeout,clearTimeout};globalThis.document={createElement:()=>({remove:()=>removed++}),head:{append:script=>queueMicrotask(()=>script.onerror())}};
 try{await assert.rejects(loadGoogleIdentity(),e=>e.code==='google_sdk_unavailable');await assert.rejects(loadGoogleIdentity(),e=>e.code==='google_sdk_unavailable');assert.equal(removed,2);}finally{globalThis.window=oldWindow;globalThis.document=oldDocument;}
});
