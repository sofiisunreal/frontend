// Local illustrative records only. This module never imports the production API.
export const demo={
  period:'October 2026',
  accounts:[{name:'Everyday',type:'Bank',currency:'KES',balance:108450.75},{name:'On the go',type:'Mobile money',currency:'KES',balance:20000},{name:'USD account',type:'Bank',currency:'USD',balance:620}],
  transactions:[
    {date:'2026-10-28',description:'Monthly salary',category:'Income',currency:'KES',amount:100000,type:'income'},
    {date:'2026-10-21',description:'Freelance project',category:'Income',currency:'KES',amount:28000,type:'income'},
    {date:'2026-10-03',description:'Rent & household',category:'Household',currency:'KES',amount:31200,type:'expense'},
    {date:'2026-10-27',description:'Food & dining',category:'Food & dining',currency:'KES',amount:18250,type:'expense'},
    {date:'2026-10-26',description:'Getting around',category:'Transport',currency:'KES',amount:8400,type:'expense'},
    {date:'2026-10-22',description:'The other little things',category:'Other',currency:'KES',amount:14600,type:'expense'},
    {date:'2026-10-20',description:'Freelance work',category:'Income',currency:'USD',amount:540,type:'income'},
    {date:'2026-10-25',description:'Software tools',category:'Subscriptions',currency:'USD',amount:80,type:'expense'},
    {date:'2026-10-16',description:'Workspace',category:'Workspace',currency:'USD',amount:400,type:'expense'},
    {date:'2026-10-06',description:'Learning',category:'Learning',currency:'USD',amount:440,type:'expense'},
  ],
  budget:{limit:22000,category:'Food & dining'},
  goal:{saved:24000,target:60000,currency:'KES'},
  loan:{originalPrincipal:12000,fixedTotalInterest:1200,outstandingPrincipal:10000,accruedInterest:0,totalOutstanding:10000,repayment:{amount:3200,principal:2000,interest:1200}},
};
export const money=(value,code='KES')=>`${code==='KES'?'KSh':code} ${value.toLocaleString('en-KE',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
export const total=(type,code)=>demo.transactions.filter(t=>t.type===type&&t.currency===code).reduce((sum,t)=>sum+t.amount,0);
export const balance=code=>demo.accounts.filter(a=>a.currency===code).reduce((sum,a)=>sum+a.balance,0);
export const categories=code=>{const grouped=new Map();demo.transactions.filter(t=>t.type==='expense'&&t.currency===code).forEach(t=>grouped.set(t.category,(grouped.get(t.category)||0)+t.amount));return [...grouped].map(([name,amount])=>({name,amount}));};
