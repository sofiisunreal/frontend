// Approved compositions transcribed from orbit-landing. All figures below are local illustrative records.
import {useState} from "react";
import LifetimeOfferNote from "../LifetimeOfferNote";
import {demo,money,balance,total,categories} from "./demoData";
import {CurrencySwitch,SpendingRing} from "./LandingPreview";
import {LandingIcon as Icon} from "./LandingArtwork";
import {policyLink,usePolicies} from "../../legal/policyRecords";
const colours=["#7198DE","#A89EE4","#73C6D2","#B8C8ED"];
const budget={limit:demo.budget.limit,spent:categories("KES").find(p=>p.name===demo.budget.category).amount};
budget.remaining=budget.limit-budget.spent;

export function AccountsSection(){
 const [currency,setCurrency]=useState("KES");
 return (<section className="section accounts-section" id="accounts" aria-labelledby="accounts-title">
    <div className="wrap">
      <div className="section-heading reveal"><p className="section-label">Accounts & currencies</p><div className="heading-row"><h2 id="accounts-title">Different currencies.<br />Same clear view.</h2><p>A bank account here. Mobile money there.<br /> Keep track of every balance, in the currency it belongs to.</p></div></div>
      <div className="account-stage reveal" data-visual>
        <div className="currency-ledger ledger-kes"><div className="ledger-top"><span className="currency-tag">KES</span><span>Kenyan shilling</span><svg><use href="#landing-arrow-up"/></svg></div><span className="ledger-label">Illustrative recorded balance</span><strong data-money="kesBalance">{money(balance("KES"))}</strong><div className="ledger-divider"></div><div className="ledger-meta"><span>2 accounts</span><span>Kept in KES</span></div><span className="ledger-watermark" aria-hidden="true">KSh</span></div>
        <div className="currency-ledger ledger-usd"><div className="ledger-top"><span className="currency-tag">USD</span><span>US dollar</span><svg><use href="#landing-arrow-up"/></svg></div><span className="ledger-label">Illustrative recorded balance</span><strong data-money="usdBalance">{money(balance("USD"), "USD")}</strong><div className="ledger-divider"></div><div className="ledger-meta"><span>1 account</span><span>Kept in USD</span></div><span className="ledger-watermark" aria-hidden="true">$</span></div>
        <div className="account-list glass"><div className="account-list-head"><h3>A place for every account</h3><CurrencySwitch value={currency} onChange={setCurrency} label="Illustrative account currency" /></div><div id="account-rows" aria-live="polite">{demo.accounts.filter(a => a.currency === currency).map(a => <div className="account-row" key={a.name}><div className="account-icon"><Icon name={a.type === "Bank" ? "wallet" : "activity"} /></div><div>{a.name}<small>{a.type} · {a.currency}</small></div><strong>{money(a.balance, a.currency)}</strong></div>)}</div><p><span className="demo-dot"></span>Illustrative balances. Accounts are recorded by you.</p></div>
      </div>
    </div>
  </section>);
}

export function SpendingSection(){
 const [currency,setCurrency]=useState("KES"),[selected,setSelected]=useState(null);
 const items=categories(currency),sum=total("expense",currency);
 const recent=[...demo.transactions].filter(t=>t.currency===currency&&t.type==="expense").sort((a,b)=>b.date.localeCompare(a.date)).slice(0,3);
 return (<section className="section spending-section" id="spending" aria-labelledby="spending-title">
    <div className="spending-ambient" aria-hidden="true"></div>
    <div className="wrap">
      <div className="section-heading reveal"><p className="section-label">Transactions & spending</p><div className="heading-row"><h2 id="spending-title">Little transactions.<br />A bigger picture.</h2><p>Record what comes in and what goes out. See the month’s spending by category, with every amount still a transaction you can trace.</p></div></div>
      <div className="spending-story reveal" data-visual>
        <div className="spending-orbit"><div className="spending-ring" id="spending-ring" role="img" aria-label={`Illustrative ${demo.period} spending: ${items.map(i => `${i.name} ${money(i.amount, currency)}`).join(", ")}`}><SpendingRing currency={currency} selected={selected} /></div><div className="ring-core"><span>October expenses</span><strong id="spending-total">{money(sum, currency)}</strong><span id="spending-core-label">{currency} · illustrative data</span></div><span className="orbit-tick tick-one" aria-hidden="true"></span><span className="orbit-tick tick-two" aria-hidden="true"></span></div>
        <div className="spending-detail"><div className="spending-detail-top"><span>Where it went</span><CurrencySwitch className="dark" value={currency} onChange={code => {setCurrency(code); setSelected(null);}} label="Spending example currency" /></div><div id="spending-legend" aria-live="polite">{items.map((item,index) => <button type="button" key={item.name} className="category-row" style={{"--category":colours[index]}} aria-label={`Highlight ${item.name}, ${money(item.amount,currency)}, ${(item.amount/sum*100).toFixed(1)} percent`} onMouseEnter={() => setSelected(index)} onMouseLeave={() => setSelected(null)} onFocus={() => setSelected(index)} onBlur={() => setSelected(null)} onClick={() => setSelected(index)} onKeyDown={e => {if(e.key === "Escape") setSelected(null);}}><i /><span>{item.name}</span><strong>{money(item.amount,currency)}</strong><small>{Math.round(item.amount/sum*100)}%</small></button>)}</div><div className="spending-trace"><span>Every slice starts with a record.</span><svg><use href="#landing-arrow"/></svg></div></div>
        <div className="transaction-strip">{recent.map(t => <article className="trace-transaction" key={t.description}><time dateTime={t.date}>{Number(t.date.slice(-2))}<small>Oct</small></time><p>{t.description}<span>{t.category}</span></p><strong>−{money(t.amount,t.currency)}</strong></article>)}</div>
      </div>
    </div>
  </section>);
}

export function PlansSection(){return (<section className="section plans-section" id="plans" aria-labelledby="plans-title">
    <div className="wrap">
      <div className="section-heading reveal"><p className="section-label">Budgets & savings</p><div className="heading-row"><h2 id="plans-title">A little for today.<br />A little for what’s next.</h2><p>A spending limit for the everyday.<br /> A savings goal for the thing you keep thinking about. Give both a place in your plans.</p></div></div>
      <div className="plans-composition reveal" data-visual>
        <article className="goal-showcase"><div className="goal-top"><span className="goal-icon"><svg><use href="#landing-leaf"/></svg></span><span>Savings goal · KES</span><span className="illustrative">Illustrative</span></div><h3>A little breathing room.</h3><div className="goal-figure"><strong data-money="goalSaved">{money(demo.goal.saved)}</strong><span>recorded toward <b data-money="goalTarget">{money(demo.goal.target)}</b></span></div><div className="goal-track" role="progressbar" aria-label="Illustrative savings goal progress" aria-valuemin="0" aria-valuemax="60000" aria-valuenow="24000"><span></span></div><div className="goal-progress"><span>Room to build, one contribution at a time.</span><strong>{Math.round(demo.goal.saved / demo.goal.target * 100)}%</strong></div><div className="goal-sculpture" aria-hidden="true"><span></span><span></span><span></span><span></span></div></article>
        <article className="budget-showcase"><div className="budget-top"><span>Monthly budget</span><svg><use href="#landing-target"/></svg></div><h3>Food & dining</h3><p>Set a limit. Keep an eye on it.</p><div className="budget-amount"><strong>{budget.remaining.toLocaleString("en-KE")}</strong><span>left of <b>{budget.limit.toLocaleString("en-KE")}</b></span></div><div className="budget-track" role="progressbar" aria-label="Illustrative budget spent, amounts as entered" aria-valuemin="0" aria-valuemax="22000" aria-valuenow="18250"><span></span></div><div className="budget-labels"><span>Spent <b>{budget.spent.toLocaleString("en-KE")}</b></span><span>{Math.round(budget.spent / budget.limit * 100)}% used</span></div><div className="budget-note">Illustrative · amounts as entered</div></article>
        <div className="plans-side-note"><span className="small-orbit" aria-hidden="true"></span><p>Different plans.<br />One place to come back to.</p><a className="link" href="/savings">See your savings goals <svg><use href="#landing-arrow"/></svg></a></div>
      </div>
    </div>
  </section>);}

export function LoansSection(){
 const [open,setOpen]=useState(true);
 return (<section className="section loans-section" id="loans" aria-labelledby="loans-title">
    <div className="wrap loan-layout">
      <div className="loan-copy reveal"><p className="section-label">Loans & repayments</p><h2 id="loans-title">The agreement.<br />The repayment.<br />The whole story.</h2><p>Borrowed or lent, keep the terms in view. See what’s principal, what’s interest, and how each repayment is split.</p><div className="loan-copy-foot"><span className="loan-mini-mark"><svg><use href="#landing-loan"/></svg></span><p>Optional interest.<br />Clear repayment records.</p></div><a className="link" href="/loans">See your loan agreements <svg><use href="#landing-arrow"/></svg></a></div>
      <div className="loan-stage reveal" data-visual>
        <div className="loan-orbit-line" aria-hidden="true"></div>
        <article className="loan-agreement"><div className="loan-agreement-head"><span className="initial">A</span><div><h3>Amani Mwangi</h3><span>Borrowed · home workspace</span></div><span className="status-chip">Partially paid</span></div><div className="agreement-terms"><span>Interest agreement</span><strong>Fixed total · KSh 1,200.00</strong></div><div className="loan-primary"><span>Total outstanding</span><strong data-money="loanOutstanding">{money(demo.loan.totalOutstanding)}</strong></div><dl className="loan-breakdown"><div><dt>Principal</dt><dd data-money="loanPrincipal"></dd></div><div><dt>Accrued interest</dt><dd data-money="loanInterest"></dd></div></dl><p className="loan-asof">As of 31 October 2026 · illustrative agreement</p><details className="repayment-details" open={open} onToggle={event => setOpen(event.currentTarget.open)}><summary>One repayment. Every part accounted for.<span aria-hidden="true">{open ? "−" : "+"}</span></summary><div className="repayment-head"><span>24 Sep 2026</span><strong data-money="repayment">{money(demo.loan.repayment.amount)}</strong></div><div className="allocation-track" aria-hidden="true"><span></span><span></span></div><div className="allocation-values"><div><i></i><span>Principal paid</span><strong data-money="principalPaid">{money(demo.loan.repayment.principal)}</strong></div><div><i></i><span>Interest paid</span><strong data-money="interestPaid">{money(demo.loan.repayment.interest)}</strong></div></div></details></article>
        <span className="loan-stage-label">From the first agreement to the last repayment.</span>
      </div>
    </div>
  </section>);
}

export function LandingFooter({lightingControl}){const {documents}=usePolicies();return (<footer className="closing" id="start">
  <div className="closing-orbit" aria-hidden="true"><span></span><span></span></div>
  <div className="wrap">
    <div className="closing-invitation reveal"><p className="section-label">Your money, with a little perspective.</p><div className="closing-head"><h2>Start with what you have.<br />Plan what’s next.</h2><div><p>Create your account.<br />Then unlock your Budgetly workspace.</p><LifetimeOfferNote /><a className="btn btn--primary btn--xl" href="/register">Get started <svg><use href="#landing-arrow"/></svg></a><a className="closing-sign-in" href="/login">Already have an account? Sign in <svg><use href="#landing-arrow"/></svg></a></div></div></div>
    <div className="footer-base"><a className="footer-wordmark" href="#top" aria-label="Budgetly home"><svg><use href="#landing-budgetly-mark"/></svg><span>budgetly<span className="brand-dot">.</span></span></a><div className="footer-links"><a href="#accounts">Accounts</a><a href="#spending">Spending</a><a href="#plans">Budgets & savings</a><a href="#loans">Loans & repayments</a><a href="/help">Help</a><a href="/login">Sign in</a></div><div className="footer-bottom"><span>© 2026 Budgetly</span><span>Product previews use illustrative data.</span>{lightingControl}<div><a href={policyLink("privacy",documents?.privacy)}>Privacy policy · {documents?.privacy ? `v${documents.privacy.version}` : "Draft"}</a><a href={policyLink("terms",documents?.terms)}>Terms · {documents?.terms ? `v${documents.terms.version}` : "Draft"}</a></div></div></div>
  </div>
</footer>);}
