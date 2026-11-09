import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {normalizeError} from '../src/lib/errors.js';

// Exercise the actual API client and billing helper without a network request.
const source=(await readFile(new URL('../src/lib/api.js',import.meta.url),'utf8')).replace('"./errors.js"',JSON.stringify(new URL('../src/lib/errors.js',import.meta.url).href)).replaceAll('import.meta.env','({DEV:false,VITE_API_BASE_URL:"https://billing-fixture.invalid/api"})');
const apiModule='data:text/javascript;base64,'+Buffer.from(source).toString('base64');
const billingSource=(await readFile(new URL('../src/lib/billingApi.js',import.meta.url),'utf8')).replace('"./api"',JSON.stringify(apiModule)).replaceAll('"./billingState.js"',JSON.stringify(new URL('../src/lib/billingState.js',import.meta.url).href));
const {getAccessStatus,getPurchase,initializeLifetimePurchase,verifyPurchase}=await import('data:text/javascript;base64,'+Buffer.from(billingSource).toString('base64'));
const originalFetch=globalThis.fetch,stored=new Map();
Object.defineProperty(globalThis,'sessionStorage',{configurable:true,value:{getItem:key=>stored.get(key),setItem:(key,value)=>stored.set(key,value),removeItem:key=>stored.delete(key)}});
test.after(()=>{globalThis.fetch=originalFetch;delete globalThis.sessionStorage;});
const reference='bgt_'+'1'.repeat(32),url='https://checkout.paystack.com/returned-only';
const unpaid={has_lifetime_access:false,entitlement_status:null,purchase_required:true};
const purchase={reference,status:'successful',expected_amount_minor:105000,expected_currency:'KES'};
const json=(body,status=200)=>new Response(JSON.stringify(body),{status});

test('Google and password sessions use the same authenticated empty initialization request and returned URL',async()=>{
 for(const method of ['google','password']){
  let count=0;stored.set('budgetly.access',`budgetly.${method}.access`);
  globalThis.fetch=async(endpoint,options)=>{count++;assert.equal(endpoint.href,'https://billing-fixture.invalid/api/billing/purchases/initialize/');assert.equal(options.method,'POST');assert.deepEqual(JSON.parse(options.body),{});assert.equal(options.headers.get('Authorization'),`Bearer budgetly.${method}.access`);assert(options.signal instanceof AbortSignal);return json({reference,authorization_url:url},201);};
  assert.deepEqual(await initializeLifetimePurchase(),{reference,authorization_url:url});assert.equal(count,1);
 }
});
test('completion reads the owned purchase, posts server verification and reads fresh account access',async()=>{
 const calls=[];globalThis.fetch=async(endpoint,options)=>{calls.push({path:endpoint.pathname,method:options.method||'GET'});assert(options.headers.has('Authorization'));if(endpoint.pathname.endsWith('/verify/')){assert.deepEqual(JSON.parse(options.body),{});return json({...purchase,has_lifetime_access:true,activated:false});}assert.equal(options.cache,'no-store');return json(endpoint.pathname.endsWith('/access/')?unpaid:purchase);};
 await getPurchase(reference);await verifyPurchase(reference);assert.deepEqual(await getAccessStatus(),unpaid);
 assert.deepEqual(calls,[{path:`/api/billing/purchases/${reference}/`,method:'GET'},{path:`/api/billing/purchases/${reference}/verify/`,method:'POST'},{path:'/api/billing/access/',method:'GET'}]);
});
test('unsafe returned checkout URLs and references are rejected without a fallback provider request',async()=>{
 for(const body of [{reference,authorization_url:'https://other.invalid/checkout'},{reference:'bgt_example',authorization_url:url}]){let calls=0;globalThis.fetch=async()=>{calls++;return json(body,201);};await assert.rejects(initializeLifetimePurchase());assert.equal(calls,1);}
 let calls=0;globalThis.fetch=async()=>{calls++;return json(purchase);};await assert.rejects(getPurchase('bgt_example'));await assert.rejects(verifyPurchase('../other'));assert.equal(calls,0);
});
test('timeouts, interruptions and network loss never automatically initialize a second checkout',async()=>{
 for(const name of ['TimeoutError','AbortError','TypeError']){let calls=0;globalThis.fetch=async()=>{calls++;throw new DOMException('Private provider diagnostics',name);};await assert.rejects(initializeLifetimePurchase(),error=>{const result=normalizeError(error,{context:'checkout'});assert.match(result.message,/payment attempt may already exist/i);assert(!result.message.includes('Private'));return true;});assert.equal(calls,1);}
});
test('server conflicts and unavailable initialization do not retry or imply a completed payment',async()=>{
 for(const status of [409,503]){let calls=0;globalThis.fetch=async()=>{calls++;return json({detail:'Private provider diagnostics'},status);};await assert.rejects(initializeLifetimePurchase(),error=>{assert.equal(error.status,status);assert(!normalizeError(error,{context:'checkout'}).message.includes('Private'));return true;});assert.equal(calls,1);}
});
test('interrupted verification explicitly preserves an unknown payment outcome',()=>{
 for(const error of [{transport:'cancelled',status:0},{transport:'timeout',status:0},{status:503}])assert.match(normalizeError(error,{context:'paymentVerify'}).message,/still unknown/);
});
