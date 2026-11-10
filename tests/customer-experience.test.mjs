import assert from 'node:assert/strict';
import test from 'node:test';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from 'vite';
import {createHash} from 'node:crypto';
import {profileDisplayName} from '../src/lib/profile.js';
import {SUPPORT_EMAIL, SUPPORT_MAILTO} from '../src/lib/support.js';

const user={id:900001,username:'google-internal-subject',email:'local@example.invalid',first_name:'Amina',last_name:'Wanjiru'};
const noop=()=>{};
let server,Sidebar,FinancePage,AuthPage,PaymentPages,PaymentSupport,LifetimeOfferNote,PolicyRecords,LegalPage;
const storage=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
test.before(async()=>{
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:()=>null}});
 server=await createServer({server:{middlewareMode:true,hmr:false,watch:null},appType:'custom',logLevel:'silent'});
 [Sidebar,FinancePage,AuthPage,PaymentPages,PaymentSupport,LifetimeOfferNote,PolicyRecords,LegalPage]=await Promise.all([
  '/src/components/Sidebar.jsx','/src/pages/FinancePage.jsx','/src/pages/AuthPage.jsx','/src/pages/PaymentPages.jsx','/src/components/PaymentSupport.jsx',
  '/src/components/LifetimeOfferNote.jsx','/src/legal/policyRecords.js','/src/pages/LegalDraftPage.jsx',
 ].map(path=>server.ssrLoadModule(path)));
});
test.after(async()=>{await server?.close();if(storage)Object.defineProperty(globalThis,'localStorage',storage);else delete globalThis.localStorage;});
const render=(component,props={})=>renderToStaticMarkup(createElement(component,props));
const contact=html=>{
 const links=[...html.matchAll(/href="(mailto:[^"]*)"/g)].map(match=>match[1]);
 assert(links.length>0);assert(links.every(href=>href===SUPPORT_MAILTO));
 assert(!links.some(href=>/[?&]|local@|bgt_|secret/i.test(href)));
 assert.match(html,/payment or refund review/);assert.match(html,/does not guarantee a refund/);
 assert.match(html,/before paying again/);assert.match(html,/card or bank details/);
};

test('display names combine real profile fields without changing the authentication identity',()=>{
 const profile=Object.freeze({...user,first_name:'  Amina\t Njeri ',last_name:'  Wanjiru  '});
 assert.equal(profileDisplayName(profile),'Amina Njeri Wanjiru');
 assert.equal(profile.username,'google-internal-subject');assert.equal(profile.first_name,'  Amina\t Njeri ');
 assert.equal(profileDisplayName({first_name:'李',last_name:'小明'}),'李 小明');
 assert.equal(profileDisplayName({first_name:'Sophie'}),'Sophie');
 assert.equal(profileDisplayName({last_name:'Kendi'}),'Kendi');
});
test('missing, whitespace and malformed names never fall back to username or email',()=>{
 for(const profile of [null,undefined,{}, {username:'google-internal-subject',email:user.email}, {first_name:' \n ',last_name:'\t'}, {first_name:32,last_name:{}}]){
  assert.equal(profileDisplayName(profile),'Your account');assert.equal(profileDisplayName(profile,''),'');
 }
 // A real name equal to the default label still counts as a supplied name.
 assert.equal(profileDisplayName({first_name:'Your account'},''),'Your account');
});
test('sidebar and dashboard use the same full name and hide missing-name prompts after completion',()=>{
 const sidebar=render(Sidebar.default,{profile:user,orbit:true});
 const dashboard=render(FinancePage.default,{screen:'Overview',profile:user});
 assert.match(sidebar,/Amina Wanjiru/);assert.match(dashboard,/Welcome back, Amina Wanjiru/);
 assert(!sidebar.includes(user.username));assert(!dashboard.includes('Complete profile'));
 const unnamed={...user,first_name:' ',last_name:''};
 const missingSidebar=render(Sidebar.default,{profile:unnamed,orbit:true});
 const missingDashboard=render(FinancePage.default,{screen:'Overview',profile:unnamed});
 assert.match(missingSidebar,/Your account/);assert(!missingSidebar.includes(user.username));
 assert.match(missingDashboard,/Your account, at a glance/);assert.match(missingDashboard,/Complete profile/);
});
test('user-provided names are rendered as text rather than executable markup',()=>{
 const html=render(Sidebar.default,{profile:{...user,first_name:'<img src=x onerror=alert(1)>',last_name:'& Kendi'},orbit:true});
 assert(!html.includes('<img src=x'));assert(html.includes('&lt;img'));assert(html.includes('&amp; Kendi'));
});
test('Settings explains the Google reset-to-deletion process and keeps confirmation controls',()=>{
 const html=render(FinancePage.default,{screen:'Settings',profile:user});
 assert.match(html,/Use Google without a Budgetly password/);assert.match(html,/password reset/);
 assert.match(html,/continue with Google, then open Settings/);assert.match(html,/does not change your Google password/);
 assert(/<input\b(?=[^>]*name="password")(?=[^>]*type="password")[^>]*>/.test(html),'Deletion still requires a password field');assert.match(html,/name="confirmation"/);
 assert.match(html,/disabled=""[^>]*>.*?Delete account and records/s);
 assert(html.includes(SUPPORT_MAILTO));assert(!html.includes('mailto:'+SUPPORT_EMAIL+'?'));
 // Internal username remains the disabled sign-in identifier in Settings only.
 assert(/<input\b(?=[^>]*name="username")(?=[^>]*disabled="")[^>]*>/.test(html),'Username remains read-only');assert(html.includes(user.username));
});
test('support email is a plain public contact with no account or payment data prefilled',()=>{
 assert.equal(SUPPORT_EMAIL,'budgetly01@gmail.com');assert.equal(SUPPORT_MAILTO,'mailto:budgetly01@gmail.com');
 contact(render(PaymentSupport.default));
});
test('signed-out login, forgot-password and reset-password screens expose payment support',()=>{
 for(const path of ['/login','/forgot-password','/reset-password/local-id/local-secret/']){
  const html=render(AuthPage.default,{path,navigate:noop});contact(html);
  assert.match(html,/type="submit"/);
  if(path==='/login')assert.match(html,/KES 1,050/);
  if(path==='/forgot-password')assert.match(html,/type="email"/);
  if(path.startsWith('/reset-password'))assert.match(html,/name="confirm_password"/);
 }
});
test('payment offer, unresolved access and signed-out completion all expose the same safe support path',()=>{
 const common={navigate:noop,profile:user};
 const offer=render(PaymentPages.PaymentRequiredPage,{...common,access:{state:'ready',data:{has_lifetime_access:false,purchase_required:true,entitlement_status:null}}});
 contact(offer);assert.match(offer,/KES 1,050/);assert.match(offer,/Unlock Budgetly/);
 contact(render(PaymentPages.PaymentAccessLoading,common));
 for(const path of ['/payment/complete','/payment/complete?reference=bgt_0123456789abcdef0123456789abcdef']){
  const html=render(PaymentPages.PaymentCompletePage,{...common,path,isAuthenticated:false});contact(html);
  assert(!html.includes('Go to Dashboard'));
 }
});

test('lifetime offers define service duration, preserve the one-time price and exclude recurring billing',()=>{
 const offer=render(PaymentPages.PaymentRequiredPage,{profile:user,navigate:noop,access:{state:'ready',data:{has_lifetime_access:false,purchase_required:true,entitlement_status:null}}});
 for(const html of [offer,render(LifetimeOfferNote.default),render(AuthPage.default,{path:'/login',navigate:noop}),render(AuthPage.default,{path:'/register',navigate:noop})]){
  assert(html.includes('KES 1,050'));assert(html.includes('once')||html.includes('One payment'));
  assert.match(html,/while Budgetly continues offering the service/);assert.match(html,/subscription/);assert.match(html,/recurring charges/);
  assert(!/Enjoy Budgetly for life|forever|guaranteed refund|tax.inclusive|no fees/i.test(html));
 }
});

test('checkout legal links resolve to current verified documents without hardcoded draft identities',async()=>{
 const raw=Object.fromEntries(['terms','privacy'].map((type,i)=>{const content=`# Synthetic active ${type}\n\nUpdated official-record fixture. Not a published policy.`;return[type,{id:501+i,document_type:type,version:'qa-current-2',content,content_sha256:createHash('sha256').update(content,'utf8').digest('hex'),published_at:'2026-11-10T00:00:00Z',effective_at:'2026-11-10T00:00:00Z'}];}));
 const policies=await PolicyRecords.verifyActivePolicyPair(raw);
 const renderActive=(component,props)=>renderToStaticMarkup(createElement(PolicyRecords.PolicyContext.Provider,{value:policies},createElement(component,props)));
 const offer=renderActive(PaymentPages.PaymentRequiredPage,{profile:user,navigate:noop,access:{state:'ready',data:{has_lifetime_access:false,purchase_required:true,entitlement_status:null}}});
 assert(offer.includes('href="/terms-of-service"'));assert(offer.includes('href="/privacy-policy"'));assert(!offer.includes('?draft='));
 const registration=renderActive(AuthPage.default,{path:'/register',navigate:noop});
 for(const type of ['terms','privacy'])assert(registration.includes(PolicyRecords.policyLink(type,policies.documents[type]).replaceAll('&','&amp;')));
 const previous=Object.getOwnPropertyDescriptor(globalThis,'window');
 try{
  Object.defineProperty(globalThis,'window',{configurable:true,value:{location:{search:''}}});
  for(const[type,path]of[['terms','/terms-of-service'],['privacy','/privacy-policy']]){
   const html=renderActive(LegalPage.default,{path,navigate:noop});
   assert(html.includes('Active official record'));assert(html.includes('qa-current-2'));assert(html.includes(raw[type].content));assert(!html.includes('Awaiting first publication.'));
  }
 }finally{if(previous)Object.defineProperty(globalThis,'window',previous);else delete globalThis.window;}
});
