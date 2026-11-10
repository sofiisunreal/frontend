import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownLeft, ArrowLeftRight, ArrowRight, ArrowUpRight, BadgeDollarSign, CalendarDays, Check, Filter, HandCoins, Leaf, Moon, Plus, Search, Sun, Target, Wallet, X } from "lucide-react";
import { api, apiBaseUrl, asList, formErrorMessage, jsonBody } from "../lib/api";
import { focusFormError, nativeValidationMessage, normalizeError } from "../lib/errors";
import { ErrorNotice, FieldError } from "../components/FormFeedback";
import { profileDisplayName } from "../lib/profile";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "../lib/support";
import GoogleAccountLink from "../components/GoogleAccountLink";
import HelpPage from "./HelpPage";
import { DashboardLoading, InlineLoading, LoadingButton, ResourceLoading, SpendingLoading } from "../components/Loading";
import LegalDraftPage from "./LegalDraftPage";

const endpoints = {
  Transactions: "/api/transactions/", Accounts: "/api/accounts/", Transfers: "/api/transfers/",
  "Budgets & Savings": "/api/budgets/", "Savings goals": "/api/savings/goals/", Loans: "/api/loans/",
  Categories: "/api/categories/",
};
const today = () => localDate(new Date());
const month = () => today().slice(0, 7);
const currency = (code) => code === "KES" ? "KSh" : code || "";
const money = (amount, code = "KES") => `${currency(code)} ${Number(amount || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const titleCase = (value = "") => value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());

const metadata = {
  Transactions: { title: "Transactions", description: "Every inflow and outflow, recorded against an account.", singular: "transaction", icon: ArrowLeftRight },
  Accounts: { title: "Accounts", description: "Keep the balances you track together.", singular: "account", icon: Wallet },
  Transfers: { title: "Transfers", description: "Move money between your own accounts with the rate recorded at the time.", singular: "transfer", icon: ArrowLeftRight },
  "Budgets & Savings": { title: "Budgets", description: "Set a clear limit for the categories you spend in.", singular: "budget", icon: Target },
  "Savings goals": { title: "Savings goals", description: "Give a purpose to the money you’re setting aside.", singular: "goal", icon: Leaf },
  Loans: { title: "Loans & repayments", description: "Track what you have lent or borrowed and record repayments.", singular: "loan", icon: HandCoins },
  Categories: { title: "Categories", description: "Organise income and spending with categories that fit your life.", singular: "category", icon: Filter },
};

export default function FinancePage({ screen, initialAction, profile, theme, onThemeChange, onProfileChange, onReopenOnboarding, navigate, logoutBusy }) {
  if (screen === "Overview") return <Dashboard navigate={navigate} profile={profile} theme={theme} onThemeChange={onThemeChange} />;
  if (screen === "Help") return <HelpPage navigate={navigate} onReopenOnboarding={onReopenOnboarding} />;
  if (["Privacy policy", "Terms of service", "Legal updates"].includes(screen)) return <LegalDraftPage path={screen === "Privacy policy" ? "/privacy-policy" : screen === "Terms of service" ? "/terms-of-service" : "/legal-updates"} navigate={navigate} theme={theme} onThemeChange={onThemeChange} embedded />;
  if (screen === "Exchange rates") return <ExchangePage />;
  if (screen === "Settings") return <SettingsPage logoutBusy={logoutBusy} profile={profile} theme={theme} onThemeChange={onThemeChange} onReopenOnboarding={onReopenOnboarding} onProfileChange={onProfileChange} onLogout={navigate} navigate={navigate} />;
  return <ResourcePage key={screen} screen={screen} initialAction={initialAction} navigate={navigate} />;
}

function Dashboard({ navigate, profile, theme, onThemeChange }) {
  const [data, setData] = useState(null);
  const [monthValue, setMonthValue] = useState(() => today().slice(0, 7));
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [summaryAttempt, setSummaryAttempt] = useState(0);
  const [monthlyTransactions, setMonthlyTransactions] = useState([]);
  const [spendingError, setSpendingError] = useState("");
  const [loadedSpendingMonth, setLoadedSpendingMonth] = useState("");
  const [spendingAttempt, setSpendingAttempt] = useState(0);
  const [onboardingData, setOnboardingData] = useState(null);
  const [onboardingHidden, setOnboardingHidden] = useState(() => localStorage.getItem(`budgetly.onboarding.hidden.${profile?.id}`) === "true");
  const [onboardingCompletedBefore] = useState(() => localStorage.getItem(`budgetly.onboarding.complete.${profile?.id}`) === "true");
  const [onboardingRequested] = useState(() => localStorage.getItem(`budgetly.onboarding.reopen.${profile?.id}`) === "true");
  useEffect(() => {
    if (!profile?.id) return undefined;
    let active = true;
    Promise.all([api("/api/accounts/"), api("/api/transactions/"), api("/api/budgets/")])
      .then(([accounts, transactions, budgets]) => {
        if (!active) return;
        setOnboardingData({ accounts: asList(accounts).length, transactions: asList(transactions).length, budgets: asList(budgets).length });
      }).catch(() => { if (active) setOnboardingData(null); });
    return () => { active = false; };
  }, [profile?.id]);
  const onboardingComplete = Boolean(onboardingData && onboardingData.accounts > 0 && onboardingData.transactions > 0 && onboardingData.budgets > 0);
  useEffect(() => {
    if (!onboardingComplete || !profile?.id) return;
    localStorage.setItem(`budgetly.onboarding.complete.${profile.id}`, "true");
  }, [onboardingComplete, profile?.id]);
  const load = () => { setBusy(true); setError(""); setSummaryAttempt((value) => value + 1); };
  useEffect(() => {
    let active = true;
    api("/api/dashboard/summary/", { query: { month: monthValue } }).then((value) => { if (active) { setData(value); setError(""); } })
      .catch((err) => { if (active) setError(formErrorMessage(err, { context: "dashboard" })); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [monthValue, summaryAttempt]);
  useEffect(() => {
    if (!data?.month) return;
    let active = true;
    api("/api/transactions/", { query: { month: data.month } }).then((value) => { if (active) { setMonthlyTransactions(asList(value)); setSpendingError(""); } })
      .catch((err) => { if (active) setSpendingError(formErrorMessage(err, { context: "spending" })); })
      .finally(() => { if (active) setLoadedSpendingMonth(data.month); });
    return () => { active = false; };
  }, [data?.month, spendingAttempt]);
  const retrySpending = () => { setLoadedSpendingMonth(""); setSpendingError(""); setSpendingAttempt((value) => value + 1); };
  const balanceEntries = Object.entries(data?.balances || {});
  const currencyEntries = [...new Set([...Object.keys(data?.income || {}), ...Object.keys(data?.expenses || {}), ...Object.keys(data?.cash_flow || {})])];
  const empty = data && !balanceEntries.length && !currencyEntries.length && !data.recent_transactions?.length;
  const name = profileDisplayName(profile, "");
  return <div className={`page-content dashboard-page orbit-dashboard ${empty ? "dashboard-page-empty" : ""}`}>
    <div className="page-intro dashboard-intro">
      <div><h1>Overview<span className="orbit-heading-dot" aria-hidden="true">.</span></h1><p className="muted-text">{name ? `Welcome back, ${name}.` : `${profileDisplayName(profile)}, at a glance.`}</p></div>
      <div className="overview-actions">
        <button className="orbit-theme-toggle" onClick={() => onThemeChange(theme === "dark" ? "light" : "dark")} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`} title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}>{theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}</button>
        <label className="month-picker"><CalendarDays size={17} aria-hidden="true" /><span className="visually-hidden">Month</span><input type="month" aria-label="Month" value={monthValue} onChange={(event) => { setBusy(true); setError(""); setMonthValue(event.target.value || today().slice(0, 7)); }} /></label>
        <button className="primary-button" onClick={() => navigate("/transactions?new=1")}><Plus size={17} />Add transaction</button>
      </div>
    </div>
    {!name && <div className="profile-completion-note"><p>Add your name to make Budgetly feel more like you.</p><button type="button" className="text-button" onClick={() => navigate("/settings")}>Complete profile <ArrowRight size={15} /></button></div>}
    {!onboardingHidden && (!onboardingCompletedBefore || onboardingRequested) && onboardingData && (!onboardingComplete || onboardingRequested) && <div className="dashboard-setup dashboard-setup-top">
      <GettingStartedChecklist progress={onboardingData} complete={onboardingComplete} onDismiss={() => { localStorage.setItem(`budgetly.onboarding.hidden.${profile.id}`, "true"); localStorage.removeItem(`budgetly.onboarding.reopen.${profile.id}`); setOnboardingHidden(true); }} navigate={navigate} profile={profile} />
    </div>}
    {busy ? <DashboardLoading /> : error ? <ErrorState error={error} retry={load} /> : !data ? <EmptyState title="Your overview is ready when you are" copy="Add an account and your real totals will appear here." action="Add an account" onClick={() => navigate("/accounts?new=1")} /> : <>
      <div className="orbit-bento">
        <section className="orbit-card dashboard-ledger" aria-labelledby="balances-title">
          <div className="dashboard-section-head"><h2 id="balances-title">Account balances</h2><button className="orbit-round-link" aria-label="View accounts" onClick={() => navigate("/accounts")}><ArrowUpRight size={17} /></button></div>
          {balanceEntries.length ? <dl className="dashboard-balance-list">{balanceEntries.map(([code, amount]) => <div className="dashboard-balance-row" key={code}>
            <dt><span className="dashboard-currency-code">{code}</span><span>{code === "KES" ? "Kenyan shilling" : code === "USD" ? "US dollar" : code}</span></dt>
            <dd className={Number(amount) < 0 ? "dashboard-negative" : ""}>{dashboardMoney(amount, code)}</dd>
          </div>)}</dl> : <div className="dashboard-empty"><p>No account balances yet.</p><button className="text-button" onClick={() => navigate("/accounts?new=1")}>Add an account <ArrowRight size={15} /></button></div>}
          <button className="orbit-account-count" onClick={() => navigate("/accounts")}>{data.accounts?.total ?? 0} active accounts <ArrowUpRight size={16} /></button>
        </section>

        <DashboardCashFlow data={data} currencies={currencyEntries} navigate={navigate} />
        <SpendingChart transactions={monthlyTransactions} error={spendingError} busy={loadedSpendingMonth !== data.month} retry={retrySpending} navigate={navigate} />

        <section className="orbit-card dashboard-activity" aria-labelledby="activity-title">
          <div className="dashboard-section-head"><h2 id="activity-title">Recent activity</h2><button className="text-button" onClick={() => navigate("/transactions")}>View all <ArrowUpRight size={15} /></button></div>
          <p className="orbit-card-description">The latest in your money story.</p>
          {data.recent_transactions?.length ? <ul className="dashboard-activity-list">{data.recent_transactions.map((item) => {
            const date = dashboardDate(item.date);
            return <li className="dashboard-activity-row" key={item.id}>
              <time className="orbit-transaction-date" dateTime={item.date || undefined} aria-label={date.label}><span>{date.day}</span><small>{date.month}</small></time>
              <div className="dashboard-activity-copy"><strong>{item.description || "Transaction"}</strong><span>{item.category || "Uncategorised"}</span></div>
              <div className="dashboard-activity-amount"><strong className={item.type === "income" && Number(item.amount) > 0 ? "dashboard-positive" : ""}>{dashboardMoney(item.amount, item.currency, { sign: true, expense: item.type !== "income" })}</strong><span className="visually-hidden">{item.type === "income" ? "Income" : "Expense"}</span></div>
            </li>;
          })}</ul> : <div className="dashboard-empty"><p>No transactions recorded yet.</p><button className="text-button" onClick={() => navigate("/transactions?new=1")}>Add transaction <ArrowRight size={15} /></button></div>}
          <button className="orbit-activity-footer" onClick={() => navigate("/transactions")}>All transactions <ArrowRight size={17} /></button>
        </section>

        <section className="orbit-card dashboard-plans" aria-labelledby="plans-title">
          <div className="dashboard-section-head"><h2 id="plans-title">Plans & commitments</h2></div>
          <p className="orbit-card-description">For the bigger picture.</p>
          <div className="dashboard-plan-links">
            <button onClick={() => navigate("/budgets")}><Target size={18} /><span>Active budgets</span><strong>{data.budgets?.active ?? 0}</strong><ArrowUpRight size={15} /></button>
            <button onClick={() => navigate("/savings")}><Leaf size={18} /><span>Savings goals</span><strong>{data.savings?.active_goals ?? 0}</strong><ArrowUpRight size={15} /></button>
            <button onClick={() => navigate("/loans")}><HandCoins size={18} /><span>Open loans</span><strong>{data.loans?.active ?? 0}</strong><ArrowUpRight size={15} /></button>
          </div>
          <div className="orbit-plans-close"><svg viewBox="0 0 48 32" width="45" height="32" fill="none" stroke="currentColor" strokeWidth=".8" aria-hidden="true"><ellipse cx="24" cy="16" rx="22" ry="8" transform="rotate(-25 24 16)"/><ellipse cx="24" cy="16" rx="22" ry="8" transform="rotate(25 24 16)"/></svg><p>Small steps.<br />Room for what’s next.</p></div>
        </section>
      </div>
      <footer className="orbit-dashboard-footer"><span>Personal finance <span aria-hidden="true">/</span> Budgetly</span><span>{monthLabel(data.month)}</span></footer>
    </>}
  </div>;
}

// Presentation helpers only. Net cash flow and all balances come from the API.
function dashboardNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function dashboardMoney(value, code, { sign = false, expense = false } = {}) {
  const number = dashboardNumber(value);
  if (number === null) return "—";
  const direction = expense ? -number : number;
  const prefix = direction < 0 ? "−" : sign && direction > 0 ? "+" : "";
  return `${prefix}${money(Math.abs(number), code)}`;
}

function dashboardDate(value) {
  const date = new Date(value && !value.includes("T") ? `${value}T12:00:00` : value);
  if (!value || Number.isNaN(date.getTime())) return { day: "—", month: "", label: "Date unavailable" };
  return { day: new Intl.DateTimeFormat("en", { day: "numeric" }).format(date), month: new Intl.DateTimeFormat("en", { month: "short" }).format(date), label: formatDate(value) };
}

function DashboardCurrencySwitch({ currencies, value, onChange, label }) {
  if (!currencies.length) return null;
  return <div className="orbit-currency-switch" role="group" aria-label={label}>{currencies.map((code) => <button key={code} type="button" onClick={() => onChange(code)} aria-pressed={value === code}>{code}</button>)}</div>;
}

function DashboardCashFlow({ data, currencies, navigate }) {
  const [selected, setSelected] = useState("KES");
  const [dismissedTooltip, setDismissedTooltip] = useState(null);
  const code = currencies.includes(selected) ? selected : currencies[0];
  const income = dashboardNumber(data.income?.[code]);
  const expenses = dashboardNumber(data.expenses?.[code]);
  const net = dashboardNumber(data.cash_flow?.[code]);
  const scale = Math.max(Math.abs(income || 0), Math.abs(expenses || 0), 1);
  return <section className="orbit-card dashboard-month" aria-labelledby="monthly-title">
    <div className="dashboard-section-head"><h2 id="monthly-title">Monthly cash flow</h2><DashboardCurrencySwitch currencies={currencies} value={code} onChange={setSelected} label="Cash flow currency" /></div>
    {code ? <>
      <div className="orbit-cashflow-content">
        <div className="orbit-flow-summary"><p>Net cash flow · {code}</p><strong className={`orbit-flow-number ${net < 0 ? "dashboard-negative" : ""}`}>{dashboardMoney(data.cash_flow?.[code], code, { sign: true })}</strong><p className="orbit-flow-copy">Your recorded income,{" "}<br />less your expenses.</p></div>
        <div className="orbit-flow-chart" role="group" aria-label={`${code} monthly income and expenses. Bars show magnitude; signs show direction.`}>
          {[["Income", income, "income"], ["Expenses", expenses, "expense"]].map(([label, amount, kind]) => <div className="orbit-flow-column orbit-data-point" key={kind} tabIndex={0} role="img" aria-label={label} aria-describedby={`cash-flow-${kind}-detail`} data-tooltip-dismissed={dismissedTooltip === kind} onMouseEnter={() => setDismissedTooltip(null)} onFocus={() => setDismissedTooltip(null)} onKeyDown={(event) => { if (event.key === "Escape") setDismissedTooltip(kind); }}>
            <span className="orbit-chart-tooltip" role="tooltip" id={`cash-flow-${kind}-detail`}>{label} · {dashboardMoney(amount, code, { expense: kind === "expense" })}</span>
            <span className="orbit-bar-value">{dashboardMoney(amount, code, { expense: kind === "expense" })}</span>
            <div className="orbit-bar-well"><div className={`orbit-chart-bar orbit-chart-bar-${kind}`} style={{ "--bar-height": `${Math.abs(amount || 0) / scale * 100}%` }} /></div>
            <span className="orbit-bar-label">{label}{amount === null && <span className="visually-hidden"> unavailable</span>}</span>
          </div>)}
        </div>
      </div>
      {(income < 0 || expenses < 0) && <p className="orbit-signed-note">Bars show size; signs show direction.</p>}
    </> : <div className="dashboard-empty orbit-empty-cashflow"><div className="orbit-empty-ledger" aria-label="No monthly income or expenses recorded"><div><span>Income</span><strong>—</strong></div><div><span>Expenses</span><strong>—</strong></div></div><p>No transactions recorded this month.</p><span className="orbit-empty-copy">Build your monthly picture with a transaction.</span><button className="text-button" onClick={() => navigate("/transactions?new=1")}>Record a transaction <ArrowRight size={15} /></button></div>}
    <div className="orbit-card-foot"><span>{monthLabel(data.month)}</span><span>Income & expenses, kept in perspective.</span></div>
  </section>;
}

function SpendingChart({ transactions, error, busy, retry, navigate }) {
  const [selected, setSelected] = useState("KES");
  const [activeCategory, setActiveCategory] = useState(null);
  const groups = useMemo(() => {
    const totals = new Map();
    transactions.filter((item) => item.transaction_type === "expense").forEach((item) => {
      const code = item.account_detail?.currency || "KES";
      const name = item.category_detail?.name || "Uncategorised";
      const key = `${code}:${name}`;
      totals.set(key, { code, name, amount: (totals.get(key)?.amount || 0) + Number(item.amount || 0) });
    });
    return [...totals.values()].sort((a, b) => a.code.localeCompare(b.code) || b.amount - a.amount);
  }, [transactions]);
  const totals = groups.reduce((result, item) => ({ ...result, [item.code]: (result[item.code] || 0) + item.amount }), {});
  const currencies = [...new Set(groups.map((item) => item.code))];
  const code = currencies.includes(selected) ? selected : currencies[0];
  const parts = groups.filter((item) => item.code === code);
  const total = totals[code];
  const canDraw = Number.isFinite(total) && total > 0 && parts.every((item) => Number.isFinite(item.amount) && item.amount >= 0);
  const circumference = 2 * Math.PI * 66;
  // Arc geometry is derived from the existing category totals, never a new account balance.
  let offset = 0;
  const arcs = canDraw ? parts.map((item, index) => {
    const length = item.amount / total * circumference;
    const rounded = length >= 28 && parts.length > 1;
    const gap = parts.length === 1 ? 0 : rounded ? 20 : Math.min(3, length * .12);
    const arc = { key: item.name, length: Math.max(0, length - gap), offset, rounded, color: `var(--orbit-chart-${index % 4 + 1})` };
    offset += length;
    return arc;
  }) : [];
  return <section className="orbit-card dashboard-spending" aria-labelledby="spending-title">
    <div className="dashboard-section-head"><h2 id="spending-title">Spending mix</h2>{!busy && !error && <DashboardCurrencySwitch currencies={currencies} value={code} onChange={setSelected} label="Spending currency" />}</div>
    <p className="orbit-card-description">Spending by category</p>
    {busy ? <SpendingLoading /> : error ? <div className="dashboard-block-notice" role="status"><p>Category spending could not be loaded. You can still view your transactions.</p><button className="text-button orbit-spending-retry" onClick={retry}>Retry category spending <ArrowRight size={15} /></button></div> : parts.length ? <>
      <div className="orbit-spending-ring" data-currency={code}>
        <svg viewBox="0 0 168 168" aria-hidden="true"><circle className="orbit-ring-track" cx="84" cy="84" r="66" fill="none" strokeWidth="17" />{arcs.map((arc) => <circle key={arc.key} data-active={activeCategory === arc.key} cx="84" cy="84" r="66" fill="none" stroke={arc.color} strokeWidth="17" strokeDasharray={`${arc.length} ${circumference}`} strokeDashoffset={-arc.offset} strokeLinecap={arc.rounded ? "round" : "butt"} />)}</svg>
        <div className="orbit-ring-center"><span>{code} expenses</span><strong>{dashboardNumber(total) === null ? "—" : Number(total).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></div>
      </div>
      {!canDraw && <p className="orbit-signed-note">{parts.some((item) => item.amount < 0) ? "Category totals include reversals. Amounts are listed below." : total === 0 ? "No net expenses in this currency." : "Some category amounts are unavailable."}</p>}
      <ul className="orbit-spending-legend" aria-label={`Expenses by category in ${code}`}>{parts.map((item, index) => <li key={item.name} className="orbit-category-row orbit-data-point" tabIndex={0} data-active={activeCategory === item.name} onMouseEnter={() => setActiveCategory(item.name)} onMouseLeave={() => setActiveCategory(null)} onFocus={() => setActiveCategory(item.name)} onBlur={() => setActiveCategory(null)} onKeyDown={(event) => { if (event.key === "Escape") setActiveCategory(null); }} aria-describedby={`category-${index}-detail`}>
        <span className="orbit-chart-tooltip" role="tooltip" id={`category-${index}-detail`}>{item.name} · {dashboardMoney(item.amount, code)}{canDraw ? ` · ${Math.round(item.amount / total * 100)}%` : ""}</span>
        <span className="orbit-category-swatch" style={{ "--category-color": `var(--orbit-chart-${index % 4 + 1})` }} aria-hidden="true" />
        <span className="orbit-category-name">{item.name}</span><strong>{dashboardMoney(item.amount, code)}</strong><span className="orbit-category-share">{canDraw ? `${Math.round(item.amount / total * 100)}%` : "—"}</span>
      </li>)}</ul>
    </> : <div className="dashboard-empty dashboard-spending-empty"><div className="orbit-empty-ring" aria-hidden="true"><span>—</span></div><div><p>No expenses recorded this month.</p><span className="orbit-empty-copy">See where your money goes, one recorded expense at a time.</span><button className="text-button" onClick={() => navigate("/transactions?new=1")}>Add transaction <ArrowRight size={15} /></button></div></div>}
  </section>;
}

function GettingStartedChecklist({ progress, complete, onDismiss, navigate, profile }) {
  const steps = [
    { key: "accounts", title: "Add an account", copy: "Choose where your money lives and set its current starting balance.", url: "/accounts?new=1", count: progress.accounts },
    { key: "transactions", title: "Record your first transaction", copy: "Log income or an expense against one of your accounts.", url: "/transactions?new=1", count: progress.transactions },
    { key: "budgets", title: "Set your first budget", copy: "Give an everyday spending category a limit that works for you.", url: "/budgets?new=1", count: progress.budgets },
  ];
  const finished = steps.filter((step) => step.count > 0).length;
  const name = profileDisplayName(profile, "");
  return <section className={`getting-started ${complete ? "getting-started-complete" : ""}`} aria-labelledby="getting-started-title">
    <div className="getting-started-head"><div><span className="guide-progress">Getting started · {complete ? "Guide complete" : `${finished} of 3 steps saved`}</span><h2 id="getting-started-title">{name ? `${complete ? "You’re all set" : "Welcome"}, ${name}.` : complete ? `${profileDisplayName(profile)} is ready.` : `Welcome. Let’s set up ${profileDisplayName(profile).toLowerCase()}.`}</h2><p>{complete ? "Your first account, transaction and budget are saved. Your overview will reflect your Budgetly records." : "A few simple steps will make your overview useful. Your progress updates from saved Budgetly data."}</p></div><button type="button" className="icon-button" aria-label="Dismiss getting started guide" onClick={onDismiss}><X size={18} /></button></div>
    {!complete && <ol className="getting-started-steps">{steps.map((step, index) => <li key={step.key} className={step.count ? "step-complete" : ""}><span className="step-index">{step.count ? <Check size={16} /> : index + 1}</span><div><h3>{step.title}</h3><p>{step.copy}</p></div>{step.count ? <span className="step-status">Saved</span> : <button className="text-button" onClick={() => navigate(step.url)}>Start <ArrowRight size={15} /></button>}</li>)}</ol>}
    {complete && <button className="secondary-button" onClick={onDismiss}>Continue to overview <ArrowRight size={15} /></button>}
  </section>;
}

function monthLabel(value) {
  if (!value) return "This month";
  const [year, monthIndex] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(new Date(year, monthIndex - 1, 1));
}

function ResourcePage({ screen, initialAction, navigate }) {
  const info = metadata[screen];
  const [rows, setRows] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [goals, setGoals] = useState([]);
  const [contributions, setContributions] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [pendingAction, setPendingAction] = useState(null);
  const [dialog, setDialog] = useState(() => initialAction ? { kind: "create", row: null } : null);
  const [notice, setNotice] = useState("");
  const endpoint = endpoints[screen];
  const loadResource = useCallback(async () => {
    const requests = [api(endpoint).then(asList)];
    if (["Transactions", "Transfers", "Budgets & Savings", "Savings goals", "Loans"].includes(screen)) requests.push(api("/api/accounts/").then(asList));
    if (["Transactions", "Budgets & Savings"].includes(screen)) requests.push(api("/api/categories/").then(asList));
    if (screen === "Savings goals") requests.push(api("/api/savings/plans/").then(asList));
    if (screen === "Savings goals") requests.push(api("/api/savings/contributions/").then(asList));
    if (screen === "Savings goals") requests.push(api("/api/savings/withdrawals/").then(asList));
    const values = await Promise.all(requests);
    let index = 1;
    return {
      rows: screen === "Accounts" ? values[0].filter((item) => item.is_active !== false) : values[0],
      accounts: ["Transactions", "Transfers", "Budgets & Savings", "Savings goals", "Loans"].includes(screen) ? values[index++].filter((item) => item.is_active !== false) : [],
      categories: ["Transactions", "Budgets & Savings"].includes(screen) ? values[index++] : [],
      plans: screen === "Savings goals" ? values[index] : [],
      contributions: screen === "Savings goals" ? values[index + 1] : [],
      withdrawals: screen === "Savings goals" ? values[index + 2] : [],
    };
  }, [endpoint, screen]);
  const applyResource = useCallback((result) => { setRows(result.rows); setAccounts(result.accounts); setCategories(result.categories); setGoals(result.plans); setContributions(result.contributions); setWithdrawals(result.withdrawals); }, []);
  const load = useCallback(async () => {
    setBusy(true); setError("");
    try { applyResource(await loadResource()); }
    catch (err) { setError(formErrorMessage(err, { context: "load" })); }
    finally { setBusy(false); }
  }, [applyResource, loadResource]);
  useEffect(() => {
    let active = true;
    loadResource().then((result) => { if (active) applyResource(result); })
      .catch((err) => { if (active) setError(formErrorMessage(err, { context: "load" })); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [applyResource, loadResource]);

  const visibleRows = useMemo(() => rows.filter((row) => {
    const text = JSON.stringify(row).toLowerCase();
    return text.includes(query.toLowerCase()) && (typeFilter === "all" || row.transaction_type === typeFilter || row.category_type === typeFilter || row.loan_type === typeFilter || row.status === typeFilter);
  }), [rows, query, typeFilter]);

  const startCreate = (kind = "create", row = null) => setDialog({ kind, row });
  async function remove(row) {
    setPendingAction({ kind: "remove", id: row.id });
    setNotice("");
    try {
      if (screen === "Accounts") await api(`${endpoint}${row.id}/archive/`, { method: "POST" });
      else await api(`${endpoint}${row.id}/`, { method: "DELETE" });
      setNotice(screen === "Accounts" ? "Account archived." : `${info.singular[0].toUpperCase()}${info.singular.slice(1)} deleted.`);
      await load();
    } finally { setPendingAction(null); }
  }
  async function goalAction(row, action) {
    setPendingAction({ kind: "goal", id: row.id, action });
    setNotice("");setActionError("");
    try { await api(`/api/savings/goals/${row.id}/${action}/`, { method: "POST" }); setNotice(({ pause: "Goal paused.", resume: "Goal resumed.", close: "Goal closed.", cancel: "Goal cancelled." })[action]); await load(); }
    catch (err) { setActionError(formErrorMessage(err, { context: "savings" })); }
    finally { setPendingAction(null); }
  }
  async function planAction(plan, action) {
    setPendingAction({ kind: "plan", id: plan.id, action });
    setNotice("");setActionError("");
    try { await api(`/api/savings/plans/${plan.id}/${action}/`, { method: "POST" }); setNotice(`Savings plan ${action === "pause" ? "paused" : action === "resume" ? "resumed" : `${action}d`}.`); await load(); }
    catch (err) { setActionError(formErrorMessage(err, { context: "savings" })); }
    finally { setPendingAction(null); }
  }
  async function changeGoal(row, newStatus) {
    const action = newStatus === "paused" ? "pause" : "resume";
    await goalAction(row, action);
  }

  const columns = buildColumns(screen, { accounts, categories });
  const setupAction = !busy && !error && ((screen === "Transactions" && accounts.length === 0) || (screen === "Transfers" && accounts.length < 2) || (screen === "Loans" && accounts.length === 0) || (screen === "Budgets & Savings" && categories.filter((item) => item.category_type === "expense").length === 0));
  const rowActions = (row) => <>{screen === "Savings goals" && <><button className="small-action" onClick={() => setDialog({ kind: "contribute", row })}>Add funds</button><button className="small-action" onClick={() => startCreate("edit", row)}>Edit</button>{["active", "paused"].includes(row.status) && <LoadingButton className="small-action" disabled={Boolean(pendingAction)} busy={pendingAction?.kind === "goal" && pendingAction.id === row.id && ["pause", "resume"].includes(pendingAction.action)} loadingLabel={row.status === "paused" ? "Resuming…" : "Pausing…"} onClick={() => changeGoal(row, row.status === "paused" ? "active" : "paused")}>{row.status === "paused" ? "Resume" : "Pause"}</LoadingButton>}{["active", "paused", "target_reached"].includes(row.status) && <LoadingButton className="small-action" disabled={Boolean(pendingAction)} busy={pendingAction?.kind === "goal" && pendingAction.id === row.id && pendingAction.action === "close"} loadingLabel="Closing…" onClick={() => goalAction(row, "close")}>Close</LoadingButton>}{!["closed", "cancelled"].includes(row.status) && <LoadingButton className="small-action danger-text" disabled={Boolean(pendingAction)} busy={pendingAction?.kind === "goal" && pendingAction.id === row.id && pendingAction.action === "cancel"} loadingLabel="Cancelling…" onClick={() => goalAction(row, "cancel")}>Cancel</LoadingButton>}</>}{screen === "Loans" && <><button className="small-action" onClick={() => setDialog({ kind: "repayment", row })} disabled={Number(row.total_outstanding ?? row.remaining_amount) <= 0}>Repay</button><button className="small-action" onClick={() => startCreate("edit", row)}>Edit</button><LoadingButton className="small-action danger-text" busy={pendingAction?.kind === "remove" && pendingAction.id === row.id} disabled={Boolean(pendingAction)} loadingLabel="Deleting…" onClick={() => setDialog({ kind: "confirm-delete", row })}>Delete</LoadingButton></>}{screen === "Accounts" && <><button className="small-action" onClick={() => startCreate("edit", row)}>Edit</button><LoadingButton className="small-action" busy={pendingAction?.kind === "remove" && pendingAction.id === row.id} disabled={Boolean(pendingAction)} loadingLabel="Archiving…" onClick={() => setDialog({ kind: "confirm-delete", row })}>Archive</LoadingButton></>}{screen !== "Accounts" && screen !== "Savings goals" && screen !== "Loans" && !(screen === "Categories" && row.user == null) && <><button className="small-action" onClick={() => startCreate("edit", row)}>Edit</button><LoadingButton className="small-action danger-text" busy={pendingAction?.kind === "remove" && pendingAction.id === row.id} disabled={Boolean(pendingAction)} loadingLabel="Deleting…" onClick={() => setDialog({ kind: "confirm-delete", row })}>Delete</LoadingButton></>}</>;
  return <div className="page-content resource-page" data-resource={screen}>
    <div className="page-intro"><div><h1>{info.title}</h1><p className="muted-text">{info.description}</p></div><div className="resource-primary-actions">{screen === "Loans" && <button className="secondary-button" onClick={() => startCreate("repayment")}><ArrowLeftRight size={15} />Record repayment</button>}<button className="primary-button" disabled={setupAction} onClick={() => startCreate()}><Plus size={17} />New {info.singular}</button></div></div>
    {notice && <p className="inline-notice" role="status"><Check size={16} />{notice}<button aria-label="Dismiss message" onClick={() => setNotice("")}><X size={15} /></button></p>}
    {error && <ErrorState error={error} retry={load} compact />}
    <ErrorNotice message={actionError} />
    {screen === "Transactions" && <div className="filter-row"><label className="table-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search transactions" aria-label="Search transactions" /></label><select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} aria-label="Filter by type"><option value="all">All activity</option><option value="income">Income</option><option value="expense">Expenses</option></select></div>}
    {screen === "Budgets & Savings" && <p className="backend-note">The current budget API does not include a currency field. Amounts are shown as entered and the API does not convert spending across currencies.</p>}
    {screen === "Savings goals" && <p className="backend-note">Goal contributions are tracked separately. The current API does not post them as account transactions.</p>}
    {setupAction && <p className="backend-note">{screen === "Transfers" ? "Add at least two active accounts before creating a transfer." : screen === "Budgets & Savings" ? "Create an expense category before setting a budget." : "Add an account before recording this activity."}</p>}
    {screen === "Savings goals" && <div className="goal-action-row"><button className="secondary-button" onClick={() => startCreate("contribute")}><Plus size={15} />Record contribution</button><button className="secondary-button" onClick={() => startCreate("withdraw")}><ArrowUpRight size={15} />Record withdrawal</button><button className="secondary-button" onClick={() => startCreate("plan")}><CalendarDays size={15} />Create saving plan</button></div>}
    {busy ? <ResourceLoading screen={screen} title={info.title} columns={columns} /> : error ? null : visibleRows.length ? <section className="resource-collection" aria-label={info.title + " records"}><div className="resource-collection-heading"><h2>{screen === "Loans" ? "Your loan agreements" : screen === "Accounts" ? "Your accounts" : screen === "Transactions" ? "Your activity" : info.title}</h2><span>{visibleRows.length} {visibleRows.length === 1 ? info.singular : info.singular === "category" ? "categories" : info.singular + "s"}</span></div>{screen === "Loans" ? <div className="loan-records">{visibleRows.map((row) => <LoanRecord key={row.id} row={row} columns={columns} actions={rowActions(row)} />)}</div> : <div className="table-wrap"><table className="data-table" role="table" aria-label={info.title}><thead role="rowgroup"><tr role="row">{columns.map((col) => <th key={col.key} scope="col" className={"record-col-" + col.key} id={"record-head-" + col.key} role="columnheader">{col.label}</th>)}<th id="record-head-actions" scope="col" role="columnheader"><span className="visually-hidden">Actions</span></th></tr></thead><tbody role="rowgroup">{visibleRows.map((row) => <tr key={row.id} role="row">{columns.map((col) => <td key={col.key} className={"record-col-" + col.key} headers={"record-head-" + col.key} role="cell" data-label={col.label}>{col.render ? col.render(row) : row[col.key] ?? "—"}</td>)}<td className="row-actions" headers="record-head-actions" role="cell" data-label="Actions"><div className="record-actions">{rowActions(row)}</div></td></tr>)}</tbody></table></div>}</section> : <EmptyState icon={screen === "Categories" ? Filter : Wallet} title={query ? "No matching records" : setupAction ? "One thing to add first" : screen === "Categories" ? "Start with your first category" : emptyTitle(screen)} copy={query ? "Try another search or clear the filter." : setupAction ? screen === "Transfers" ? "Create two accounts before recording a transfer." : screen === "Budgets & Savings" ? "Add an expense category first so your limit is attached to the right spending." : "Add an account first so this activity changes the right balance." : screen === "Categories" ? "Categories keep income and spending organised. Create one now, then use it straight away when you add a matching transaction." : `Add your first ${info.singular} to see it here.`} action={query ? null : setupAction ? (screen === "Transfers" ? "Add accounts" : screen === "Budgets & Savings" ? "Add an expense category" : "Add an account") : screen === "Categories" ? "Add category" : `Add ${info.singular}`} onClick={() => query ? setQuery("") : setupAction ? navigate(screen === "Budgets & Savings" ? "/categories?new=1" : "/accounts?new=1") : startCreate()} />}
    {screen === "Savings goals" && <SavingsPlans pendingAction={pendingAction} plans={goals} goalRows={rows} onAction={planAction} />}
    {screen === "Savings goals" && <SavingsActivity contributions={contributions} withdrawals={withdrawals} goalRows={rows} />}
    {dialog && <ResourceDialog screen={screen} dialog={dialog} accounts={accounts} categories={categories} goals={screen === "Savings goals" || screen === "Loans" ? rows : []} navigate={navigate} onClose={() => setDialog(null)} onSaved={async (message) => { setDialog(null); setNotice(message); await load(); }} onDelete={async (row) => { await remove(row);setDialog(null); }} />}
  </div>;
}

function LoanRecord({ row, columns, actions }) {
  const cell = (key) => columns.find((column) => column.key === key)?.render(row);
  return <article className="loan-record" aria-label={"Loan with " + row.person_name} data-loan-type={row.loan_type}>
    <div className="loan-record-main"><div className="loan-record-person"><span className="loan-person-mark" aria-hidden="true">{(row.person_name || "L").slice(0, 1).toUpperCase()}</span>{cell("person_name")}</div><div className="loan-record-balance"><span className="resource-caption">Total outstanding</span>{cell("total_outstanding")}</div></div>
    <div className="loan-record-footer"><div className="loan-record-due"><span className="resource-caption">Due date</span><strong>{cell("due_date")}</strong></div><div className="loan-record-repayments"><span className="resource-caption">Repayments</span>{cell("repayments")}</div><div className="loan-record-status"><span className="resource-caption">Status</span>{cell("status")}</div><div className="record-actions loan-record-actions">{actions}</div></div>
  </article>;
}

function emptyTitle(screen) {
  return ({ Transactions: "No transactions recorded", Accounts: "Your accounts start here", Transfers: "No transfers yet", "Budgets & Savings": "No budgets set", "Savings goals": "Start with a savings goal", Loans: "No loans to track", Categories: "No categories found" })[screen] || "Nothing to show yet";
}

function buildColumns(screen, { accounts, categories }) {
  const categoryName = (id) => categories.find((item) => item.id === id)?.name || "—";
  const accountName = (id) => accounts.find((item) => item.id === id)?.name || "—";
  if (screen === "Transactions") return [
    { key: "transaction_date", label: "Date", render: (r) => formatDate(r.transaction_date) },
    { key: "description", label: "Description", render: (r) => <div className="table-primary"><strong>{r.description}</strong><small>{r.notes || categoryName(r.category_detail?.id || r.category)}</small></div> },
    { key: "category", label: "Category", render: (r) => r.category_detail?.name || categoryName(r.category) },
    { key: "account", label: "Account", render: (r) => r.account_detail?.name || accountName(r.account) },
    { key: "amount", label: "Amount", render: (r) => <strong className={r.transaction_type === "income" ? "amount-positive" : ""}>{r.transaction_type === "income" ? "+" : "−"}{money(r.amount, r.account_detail?.currency || "KES")}</strong> },
  ];
  if (screen === "Accounts") return [
    { key: "name", label: "Account", render: (r) => <div className="table-primary"><strong>{r.name}</strong><small>{titleCase(r.account_type)}</small></div> },
    { key: "currency", label: "Currency" }, { key: "current_balance", label: "Current balance", render: (r) => <strong>{money(r.current_balance, r.currency)}</strong> },
    { key: "starting_balance", label: "Opening balance", render: (r) => money(r.starting_balance, r.currency) },
  ];
  if (screen === "Transfers") return [
    { key: "transaction_date", label: "Date", render: (r) => formatDate(r.transaction_date) },
    { key: "description", label: "Transfer", render: (r) => <div className="table-primary"><strong>{r.description || "Between accounts"}</strong><small>{r.from_account_detail?.name} to {r.to_account_detail?.name}</small></div> },
    { key: "from_amount", label: "Sent", render: (r) => money(r.from_amount, r.from_account_detail?.currency) },
    { key: "to_amount", label: "Received", render: (r) => money(r.to_amount, r.to_account_detail?.currency) },
    { key: "exchange_rate", label: "Rate", render: (r) => `${Number(r.exchange_rate).toLocaleString(undefined, { maximumFractionDigits: 6 })} · ${r.rate_source}` },
  ];
  if (screen === "Budgets & Savings") return [
    { key: "category", label: "Category", render: (r) => r.category_detail?.name || categoryName(r.category) },
    { key: "period_type", label: "Period", render: (r) => <div className="table-primary"><strong>{titleCase(r.period_type)}</strong><small>{formatDate(r.start_date)} — {formatDate(r.end_date)}</small></div> },
    { key: "amount", label: "Limit", render: (r) => numberAmount(r.amount) },
    { key: "spent_amount", label: "Used", render: (r) => <div className="table-primary"><strong>{numberAmount(r.spent_amount)}</strong><small>{Math.round(Number(r.percentage_used || 0))}% of limit</small></div> },
    { key: "remaining_amount", label: "Remaining", render: (r) => numberAmount(r.remaining_amount) },
  ];
  if (screen === "Savings goals") return [
    { key: "name", label: "Goal", render: (r) => <div className="table-primary"><strong>{r.name}</strong><small>{r.description || titleCase(r.saving_method)}</small></div> },
    { key: "progress_percentage", label: "Progress", render: (r) => <div className="goal-progress"><div className="goal-progress-track"><i style={{ width: `${Math.min(100, Number(r.progress_percentage || 0))}%` }} /></div><small>{money(r.current_saved, r.currency)} of {money(r.target_amount, r.currency)}</small></div> },
    { key: "target_date", label: "Target date", render: (r) => r.target_date ? formatDate(r.target_date) : "No date" },
    { key: "status", label: "Status", render: (r) => <Status value={r.status} /> },
  ];
  if (screen === "Loans") return [
    { key: "person_name", label: "Loan", render: (r) => <div className="table-primary loan-identity"><div className="loan-person-title"><strong>{r.person_name}</strong><span className="loan-direction">{titleCase(r.loan_type)}</span></div><small>{r.description || "No description"}</small><small className="loan-agreement">{loanInterestAgreement(r)}</small><small className="loan-original-amount">Original amount · {money(r.original_amount, r.currency)}</small></div> },
    { key: "total_outstanding", label: "Total outstanding", render: (r) => <div className="loan-balance-cell"><strong>{money(r.total_outstanding ?? r.remaining_amount ?? r.original_amount, r.currency)}</strong><div className="loan-balance-breakdown"><div><span>Principal</span><b>{money(r.outstanding_principal ?? r.remaining_amount, r.currency)}</b></div><div><span>Accrued interest</span><b>{r.accrued_interest != null ? money(r.accrued_interest, r.currency) : "Interest breakdown unavailable"}</b></div></div>{r.interest_as_of_date && <small className="loan-interest-date">Interest as of · {formatDate(r.interest_as_of_date)}</small>}</div> },
    { key: "due_date", label: "Due", render: (r) => r.due_date ? formatDate(r.due_date) : "No due date" },
    { key: "repayments", label: "Repayments", render: (r) => <details className="record-details"><summary>{r.repayments?.length || 0} recorded</summary>{r.repayments?.length ? <ul>{r.repayments.map((item) => <li key={item.id}><strong>{formatDate(item.repayment_date)} · paid {money(item.amount, r.currency)}</strong><small>{item.interest_amount != null ? `Interest paid · ${money(item.interest_amount, r.currency)}` : "Interest allocation unavailable"}</small><small>{item.principal_amount != null ? `Principal paid · ${money(item.principal_amount, r.currency)}` : "Principal allocation unavailable"}</small>{item.note && <small>{item.note}</small>}</li>)}</ul> : <p>No repayments recorded.</p>}</details> },
    { key: "status", label: "Status", render: (r) => <Status value={r.status} /> },
  ];
  return [
    { key: "name", label: "Category", render: (r) => <strong>{r.name}</strong> },
    { key: "category_type", label: "Used for", render: (r) => <Status value={r.category_type} /> },
    { key: "user", label: "Availability", render: (r) => r.user == null ? "Default" : "Personal" },
  ];
}

function ResourceDialog({ screen, dialog, accounts, categories, goals, navigate, onClose, onSaved, onDelete }) {
  const [values, setValues] = useState(() => ({ ...(dialog.row || {}), transaction_type: dialog.row?.transaction_type || "expense", transaction_date: dialog.row?.transaction_date || today(), repayment_date: today(), contribution_date: today(), withdrawal_date: today(), start_date: dialog.row?.start_date || `${month()}-01`, end_date: dialog.row?.end_date || lastDay(month()), loan_date: dialog.row?.loan_date || today(), ...loanInterestFormState(dialog.row), period_type: dialog.row?.period_type || "monthly", rate_source: dialog.row?.rate_source || "live", currency: dialog.row?.currency || "KES", saving_method: dialog.row?.saving_method || "other" }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({}), [formErrors, setFormErrors] = useState([]);
  const formRef = useRef(null);
  const kind = dialog.kind;
  const isEdit = kind === "edit";
  const loanHasRepayments = screen === "Loans" && isEdit && (dialog.row?.repayments?.length || 0) > 0;
  const noInterestLoanLocked = screen === "Loans" && isEdit && (dialog.row?.interest_method || (Number(dialog.row?.annual_interest_rate ?? 0) > 0 ? "annual_percentage" : "none")) === "none";
  const set = (name, value) => setValues((current) => ({ ...current, [name]: value }));
  if (kind === "confirm-delete") {
    const isArchive = screen === "Accounts";
    const recordName = dialog.row.description || dialog.row.name || dialog.row.person_name;
    return <Modal title={isArchive ? "Archive this account?" : "Delete this record?"} onClose={onClose}><p className="dialog-copy">{isArchive ? `“${dialog.row.name}” will be removed from your active account list and overview totals. Its transaction history remains recorded.` : `This removes “${recordName}” from your records.`}</p><ErrorNotice message={error} /><div className="dialog-actions"><button className="secondary-button" onClick={onClose}>Keep record</button><LoadingButton className="danger-button" busy={busy} loadingLabel={isArchive ? "Archiving account…" : "Deleting record…"} onClick={async event => { const panel = event.currentTarget.closest('[role="dialog"]');setBusy(true);setError("");try { await onDelete(dialog.row); } catch (error) { setError(formErrorMessage(error, { context: isArchive ? "archive" : "remove" }));focusFormError(panel); } finally { setBusy(false); } }}>{isArchive ? "Archive account" : "Delete record"}</LoadingButton></div></Modal>;
  }
  const fields = dialogFields(screen, kind, values, set, accounts, categories, goals, dialog);
  const heading = ({ contribute: "Record a contribution", withdraw: "Record a withdrawal", plan: "Create a savings plan", repayment: "Record a repayment" })[kind] || `${isEdit ? "Edit" : "New"} ${metadata[screen].singular}`;
  const sourceAccount = accounts.find((account) => String(account.id) === String(values.from_account));
  const destinationAccount = accounts.find((account) => String(account.id) === String(values.to_account));
  const showTransferPreview = screen === "Transfers" && !isEdit && sourceAccount && destinationAccount && sourceAccount.currency !== destinationAccount.currency && values.rate_source === "live";
  const loanTermsNotice = loanHasRepayments
    ? "After the first repayment, loan type, principal amount, interest agreement, currency, and loan date are locked by Budgetly."
    : noInterestLoanLocked
      ? "This loan was saved with no interest. The API does not allow an interest agreement to be enabled retroactively."
      : "";

  async function submit(event) {
    event.preventDefault(); setError("");setFieldErrors({});setFormErrors([]);
    const canUpdateLoanInterest = screen === "Loans" && (kind === "create" || isEdit) && !loanHasRepayments && !noInterestLoanLocked;
    const loanInterestPayload = canUpdateLoanInterest ? buildLoanInterestPayload(values, dialog.row, isEdit) : {};
    if (canUpdateLoanInterest && !loanInterestPayload) {
      const field = values.interest_type === "percentage" ? values.interest_frequency === "annual" ? "annual_interest_rate" : "periodic_interest_rate" : "fixed_interest_amount";
      setFieldErrors({ [field]: loanInterestValidationMessage(values) });setError("Please check the highlighted details.");focusFormError(formRef.current);
      return;
    }
    setBusy(true);
    try {
      const payload = fields.reduce((result, field) => {
        if (field.type === "submit-hidden" || field.type === "checkbox") return result;
        const value = values[field.name];
        if (screen === "Loans" && ["interest_type", "interest_frequency"].includes(field.name)) return result;
        if (screen === "Loans" && isEdit && field.disabled) return result;
        if (field.name === "exchange_rate" && values.rate_source === "live") return result;
        if (field.optional && (value === "" || value == null) && field.name !== "annual_interest_rate") return result;
        result[field.name] = field.type === "number" && value !== "" ? String(value) : value;
        return result;
      }, {});
      for (const field of fields) if (field.type === "checkbox") payload[field.name] = Boolean(values[field.name]);
      Object.assign(payload, loanInterestPayload);
      if (screen === "Budgets & Savings" && values.period_type === "weekly") payload.end_date = addDays(payload.start_date, 6);
      let path = endpoints[screen];
      let method = "POST";
      if (kind === "contribute") { path = "/api/savings/contributions/"; payload.goal = dialog.row?.id || values.goal; }
      if (kind === "withdraw") { path = "/api/savings/withdrawals/"; payload.goal = dialog.row?.id || values.goal; }
      if (kind === "plan") { path = "/api/savings/plans/"; }
      if (kind === "repayment") { path = "/api/loan-repayments/"; payload.loan = dialog.row?.id || values.loan; }
      if (kind === "repayment" && dialog.row && !values.loan) payload.loan = dialog.row.id;
      if (isEdit) { path += `${dialog.row.id}/`; method = "PATCH"; }
      if (kind === "edit" && screen === "Transfers") {
        delete payload.from_account; delete payload.to_account; delete payload.from_amount; delete payload.rate_source; delete payload.exchange_rate;
      }
      if (screen === "Transfers" && values.rate_source === "live" && !isEdit) { delete payload.exchange_rate; }
      await api(path, { method, body: jsonBody(payload) });
      const label = metadata[screen].singular;
      await onSaved(isEdit ? `${label[0].toUpperCase()}${label.slice(1)} updated.` : `${label[0].toUpperCase()}${label.slice(1)} created.`);
    } catch (err) {
      const result = normalizeError(err, { context: "record", fields, aliases: { interest_method: "interest_type" } });
      setFieldErrors(result.fieldErrors);setFormErrors(result.formErrors);setError(result.message);focusFormError(formRef.current);
    }
    finally { setBusy(false); }
  }
  const hasMatchingCategory = categories.some((category) => category.category_type === values.transaction_type);
  return <Modal title={heading} onClose={onClose}><form ref={formRef} className="resource-form" onSubmit={submit}>
    <ErrorNotice message={error} messages={formErrors} />
    {loanTermsNotice && <p className="form-message form-message-info" role="note">{loanTermsNotice}</p>}
    {screen === "Transactions" && !hasMatchingCategory && <p className="form-message form-message-info" role="status">There are no {values.transaction_type} categories yet. <button className="text-button" type="button" onClick={() => { onClose(); navigate("/categories?new=1"); }}>Create a category</button>, then return to record this transaction.</p>}
    <div className="dialog-fields">{fields.map((field) => <FieldControl key={field.name} field={field} value={values[field.name]} set={set} setError={setError} error={fieldErrors[field.name]} onFieldError={(name, message) => setFieldErrors(current => ({ ...current, [name]: message }))} accounts={accounts} categories={categories} goals={goals} isEdit={isEdit} />)}</div>
    {showTransferPreview && <TransferPreview from={sourceAccount.currency} to={destinationAccount.currency} amount={values.from_amount} />}
    <div className="dialog-actions"><button className="secondary-button" type="button" onClick={onClose}>Cancel</button><LoadingButton className="primary-button" type="submit" busy={busy} loadingLabel="Saving…">{isEdit ? "Save changes" : heading}</LoadingButton></div>
  </form></Modal>;
}

function dialogFields(screen, kind, values, set, accounts, categories, goals, dialog) {
  if (kind === "contribute" || kind === "withdraw") return [
    ...(!dialog.row ? [{ name: "goal", label: "Savings goal", type: "select", options: goals.map((g) => [g.id, g.name]), required: true }] : []),
    { name: "amount", label: "Amount", type: "number", min: ".01", step: ".01", required: true },
    { name: kind === "contribute" ? "contribution_date" : "withdrawal_date", label: "Date", type: "date", required: true },
    { name: "note", label: "Note", type: "textarea" },
  ];
  if (kind === "plan") return [
    { name: "goal", label: "Savings goal", type: "select", options: goals.map((g) => [g.id, g.name]), required: true },
    { name: "amount", label: "Amount per period", type: "number", min: ".01", step: ".01", required: true },
    { name: "frequency", label: "Frequency", type: "select", options: [["weekly", "Weekly"], ["monthly", "Monthly"]], required: true },
    { name: "start_date", label: "Start date", type: "date", required: true },
    { name: "end_date", label: "End date (optional)", type: "date", optional: true },
  ];
  if (kind === "repayment") return [
    ...(!dialog.row ? [{ name: "loan", label: "Loan", type: "select", options: goals.filter((item) => Number(item.total_outstanding ?? item.remaining_amount) > 0).map((item) => [item.id, `${item.person_name} · ${money(item.total_outstanding ?? item.remaining_amount, item.currency)} outstanding`]), required: true }] : []),
    { name: "account", label: "Account", type: "select", options: accounts.filter((account) => account.currency === (dialog.row?.currency || goals.find((loan) => String(loan.id) === String(values.loan))?.currency)).map((a) => [a.id, `${a.name} · ${a.currency}`]), required: true },
    { name: "amount", label: "Amount", type: "number", min: ".01", step: ".01", required: true },
    { name: "repayment_date", label: "Date", type: "date", required: true }, { name: "note", label: "Note", type: "textarea" },
  ];
  if (screen === "Accounts") return [
    { name: "name", label: "Account name", required: true },
    { name: "account_type", label: "Account type", type: "select", options: [["mobile_money", "Mobile money"], ["bank", "Bank"], ["cash", "Cash"], ["other", "Other"]], required: true },
    { name: "currency", label: "Currency", type: "select", options: [["KES", "KES · Kenyan shilling"], ["USD", "USD · US dollar"]], required: true },
    { name: "starting_balance", label: "Opening balance", type: "number", min: "0", step: ".01", required: true },
  ];
  if (screen === "Transactions") {
    const filteredCategories = categories.filter((item) => item.category_type === values.transaction_type);
    return [
      { name: "transaction_type", label: "Type", type: "select", options: [["expense", "Expense"], ["income", "Income"]], required: true, onChange: (value) => { set("transaction_type", value); set("category", ""); } },
      { name: "description", label: "Description", required: true },
      { name: "amount", label: "Amount", type: "number", min: ".01", step: ".01", required: true },
      { name: "account", label: "Account", type: "select", options: accounts.map((a) => [a.id, `${a.name} · ${a.currency}`]), required: true },
      { name: "category", label: "Category", type: "select", options: filteredCategories.map((c) => [c.id, c.name]), required: true },
      { name: "transaction_date", label: "Date", type: "date", required: true }, { name: "notes", label: "Notes", type: "textarea" },
    ];
  }
  if (screen === "Transfers") {
    if (kind === "edit") return [{ name: "description", label: "Description" }, { name: "transaction_date", label: "Date", type: "date" }];
    const source = accounts.find((a) => String(a.id) === String(values.from_account));
    const destination = accounts.find((a) => String(a.id) === String(values.to_account));
    return [
      { name: "from_account", label: "From account", type: "select", options: accounts.map((a) => [a.id, `${a.name} · ${a.currency}`]), required: true, onChange: async (value) => { set("from_account", value); set("exchange_rate", ""); } },
      { name: "to_account", label: "To account", type: "select", options: accounts.filter((a) => String(a.id) !== String(values.from_account)).map((a) => [a.id, `${a.name} · ${a.currency}`]), required: true, onChange: (value) => { set("to_account", value); set("exchange_rate", ""); } },
      { name: "from_amount", label: `Amount to send${source ? ` (${source.currency})` : ""}`, type: "number", min: ".01", step: ".01", required: true },
      ...(source?.currency !== destination?.currency ? [{ name: "rate_source", label: "Exchange rate", type: "select", options: [["live", "Use current live rate"], ["custom", "Enter a rate manually"]], required: true }] : []),
      ...(source?.currency !== destination?.currency && values.rate_source === "custom" ? [{ name: "exchange_rate", label: `Rate · 1 ${source?.currency || "source"} in ${destination?.currency || "destination"}`, type: "number", min: ".00000001", step: ".00000001", required: true }] : []),
      { name: "transaction_date", label: "Date", type: "date", required: true }, { name: "description", label: "Description" },
    ];
  }
  if (screen === "Budgets & Savings") return [
    { name: "category", label: "Expense category", type: "select", options: categories.filter((c) => c.category_type === "expense").map((c) => [c.id, c.name]), required: true },
    { name: "amount", label: "Budget limit", type: "number", min: ".01", step: ".01", required: true },
    { name: "period_type", label: "Period", type: "select", options: [["monthly", "Monthly"], ["weekly", "Weekly"], ["custom", "Custom dates"]], required: true, onChange: (value) => { set("period_type", value); if (value === "monthly") { const start = values.start_date || `${month()}-01`; set("start_date", `${start.slice(0, 7)}-01`); set("end_date", lastDay(start.slice(0, 7))); } if (value === "weekly") set("end_date", addDays(values.start_date || today(), 6)); } },
    { name: "start_date", label: "Start date", type: "date", required: true, onChange: (value) => { set("start_date", value); if (values.period_type === "monthly") set("end_date", lastDay(value.slice(0, 7))); if (values.period_type === "weekly") set("end_date", addDays(value, 6)); } },
    { name: "end_date", label: "End date", type: "date", required: true, disabled: values.period_type === "monthly" || values.period_type === "weekly" },
    { name: "rollover", label: "Carry unused amount into the next period", type: "checkbox" },
  ];
  if (screen === "Savings goals") return [
    { name: "name", label: "Goal name", required: true }, { name: "description", label: "What are you saving for?", type: "textarea" },
    { name: "target_amount", label: "Target amount", type: "number", min: ".01", step: ".01", required: true },
    { name: "currency", label: "Currency", type: "select", options: [["KES", "KES · Kenyan shilling"], ["USD", "USD · US dollar"]], required: true },
    { name: "target_date", label: "Target date (optional)", type: "date", optional: true },
    { name: "saving_method", label: "Where you keep it", type: "select", options: [["mpesa", "M-Pesa"], ["bank", "Bank"], ["cash", "Cash"], ["sacco", "SACCO"], ["other", "Other"]], required: true },
    { name: "account", label: "Related account (optional)", type: "select", options: [["", "No linked account"], ...accounts.filter((a) => a.currency === values.currency).map((a) => [a.id, a.name])], optional: true },
  ];
  if (screen === "Loans") {
    const hasRepayments = (dialog.row?.repayments?.length || 0) > 0;
    const lockFinancialTerms = kind === "edit" && hasRepayments;
    const existingMethod = dialog.row?.interest_method || (Number(dialog.row?.annual_interest_rate ?? 0) > 0 ? "annual_percentage" : "none");
    const lockNoInterest = kind === "edit" && existingMethod === "none";
    return [
    { name: "loan_type", label: "Type", type: "select", options: [["borrowed", "I borrowed"], ["lent", "I lent"]], required: true, disabled: lockFinancialTerms },
    { name: "person_name", label: "Person or organisation", required: true },
    { name: "original_amount", label: "Amount", type: "number", min: ".01", step: ".01", required: true, disabled: lockFinancialTerms },
    { name: "account", label: "Related account", type: "select", options: accounts.map((a) => [a.id, `${a.name} · ${a.currency}`]), required: true, onChange: (value) => { set("account", value); const account = accounts.find((a) => String(a.id) === String(value)); if (account) set("currency", account.currency); } },
    { name: "currency", label: "Currency", type: "select", options: [["KES", "KES"], ["USD", "USD"]], required: true, disabled: lockFinancialTerms },
    { name: "loan_date", label: "Date", type: "date", required: true, disabled: lockFinancialTerms },
    { name: "interest_type", label: "Interest type", type: "select", required: true, disabled: lockFinancialTerms || lockNoInterest, options: [["none", "No interest"], ["percentage", "Percentage interest"], ["fixed_recurring", "Fixed recurring interest"], ["fixed_total", "Fixed total interest"]], onChange: (value) => { set("interest_type", value); if (value === "percentage" && !["annual", "daily", "weekly", "monthly"].includes(values.interest_frequency)) set("interest_frequency", "annual"); if (value === "fixed_recurring" && !["daily", "weekly", "monthly"].includes(values.interest_frequency)) set("interest_frequency", "monthly"); }, hint: lockNoInterest ? "This saved no-interest loan cannot be switched to an interest-bearing agreement." : "Choose the interest agreement recorded for this loan." },
    ...(["percentage", "fixed_recurring"].includes(values.interest_type) ? [{ name: "interest_frequency", label: "Frequency", type: "select", required: true, disabled: lockFinancialTerms || lockNoInterest, options: values.interest_type === "percentage" ? [["daily", "Daily"], ["weekly", "Weekly"], ["monthly", "Monthly"], ["annual", "Annually"]] : [["daily", "Daily"], ["weekly", "Weekly"], ["monthly", "Monthly"]] }] : []),
    ...(values.interest_type === "percentage" && values.interest_frequency === "annual" ? [{ name: "annual_interest_rate", label: "Annual percentage rate (%)", type: "number", min: ".0001", step: ".0001", required: true, disabled: lockFinancialTerms || lockNoInterest, hint: "Enter a positive annual percentage rate, for example 12.5000%." }] : []),
    ...(values.interest_type === "percentage" && values.interest_frequency !== "annual" ? [{ name: "periodic_interest_rate", label: `Percentage per ${values.interest_frequency} (%)`, type: "number", min: ".0001", step: ".0001", required: true, disabled: lockFinancialTerms || lockNoInterest, hint: ["weekly", "monthly"].includes(values.interest_frequency) ? `Interest applies only after each full ${values.interest_frequency} has completed.` : "Interest applies for each completed day." }] : []),
    ...(["fixed_recurring", "fixed_total"].includes(values.interest_type) ? [{ name: "fixed_interest_amount", label: values.interest_type === "fixed_total" ? "Agreed total interest" : `Fixed charge per ${values.interest_frequency}`, type: "number", min: ".01", step: ".01", required: true, disabled: lockFinancialTerms || lockNoInterest, hint: values.interest_type === "fixed_total" ? "This agreed total remains payable even if you repay early." : values.fixed_charge_behavior === "proportional_to_principal" ? "Each recurring charge decreases in proportion to the remaining principal." : `This full fixed charge recurs each completed ${values.interest_frequency} until settlement.` }] : []),
    ...(values.interest_type === "fixed_recurring" ? [{ name: "fixed_charge_behavior", label: "How should recurring charges work?", type: "select", required: true, disabled: lockFinancialTerms || lockNoInterest, options: [["full_until_settled", "Full fixed charge until settlement"], ["proportional_to_principal", "Charge proportional to remaining principal"]], hint: "Choose whether each period keeps the full charge or reduces it with the principal." }] : []),
    { name: "due_date", label: "Due date (optional)", type: "date", optional: true }, { name: "description", label: "Notes", type: "textarea" },
  ];
  }
  if (screen === "Categories") return [
    { name: "name", label: "Category name", required: true },
    { name: "category_type", label: "Category type", type: "select", options: [["expense", "Expense"], ["income", "Income"]], required: true },
  ];
  return [];
}

function FieldControl({ field, value, set, setError, isEdit, error, onFieldError }) {
  const errorId = `record-${field.name}-error`, hintId = `record-${field.name}-hint`;
  const onChange = (event) => { setError("");onFieldError(field.name, "");field.onChange ? field.onChange(event.target.type === "checkbox" ? event.target.checked : event.target.value) : set(field.name, event.target.type === "checkbox" ? event.target.checked : event.target.value); };
  const onInvalid = (event) => {
    event.preventDefault();onFieldError(field.name, nativeValidationMessage(event.currentTarget));setError("Please check the highlighted details.");focusFormError(event.currentTarget.form);
  };
  if (field.type === "checkbox") return <label className="checkbox-field"><input type="checkbox" name={field.name} checked={Boolean(value)} onChange={onChange} aria-invalid={error ? true : undefined} aria-describedby={error ? errorId : undefined} /><span>{field.label}<FieldError id={errorId} message={error} /></span></label>;
  const common = { name: field.name, value: value ?? "", onChange, onInvalid, required: field.required, disabled: field.disabled, min: field.min, step: field.step, "aria-invalid": error ? true : undefined, "aria-describedby": [field.hint ? hintId : "", error ? errorId : ""].filter(Boolean).join(" ") || undefined };
  return <label className={`field ${field.type === "textarea" ? "field-wide" : ""}`}><span>{field.label}{isEdit && field.name === "exchange_rate" ? " · historical rate cannot change" : ""}</span>{field.hint && <small id={hintId} className="field-hint">{field.hint}</small>}{field.type === "select" ? <select {...common}>{!field.options?.length ? <option value="">No compatible options available</option> : <>{field.required && !field.options.some(([optionValue]) => String(optionValue) === "") && <option value="">Select {field.label.toLowerCase()}</option>}{field.options.map(([optionValue, label]) => <option key={optionValue} value={optionValue}>{label}</option>)}</>}</select> : field.type === "textarea" ? <textarea {...common} rows={3} /> : <input {...common} type={field.type || "text"} />}<FieldError id={errorId} message={error} /></label>;
}

function TransferPreview({ from, to, amount }) {
  const [state, setState] = useState({ loading: true, rate: null, error: "" });
  useEffect(() => {
    let active = true;
    api("/api/exchange-rates/", { query: { from, to } }).then((result) => { if (active) setState({ loading: false, rate: Number(result.rate), error: "" }); })
      .catch((err) => { if (active) setState({ loading: false, rate: null, error: formErrorMessage(err, { context: "exchange" }) }); });
    return () => { active = false; };
  }, [from, to]);
  if (state.loading) return <p className="form-message form-message-info transfer-preview"><InlineLoading>Checking the current {from} to {to} rate…</InlineLoading></p>;
  if (state.error) return <p className="form-message form-message-info transfer-preview" role="status">A live preview isn’t available. Budgetly will validate the rate when you save the transfer.</p>;
  return <p className="form-message form-message-info transfer-preview" role="status">Estimated received amount: <strong>{money(Number(amount || 0) * state.rate, to)}</strong><span> · Rate {state.rate.toLocaleString(undefined, { maximumFractionDigits: 8 })} {to} per {from}. The backend records its live rate on save.</span></p>;
}

function SavingsPlans({ plans, goalRows, onAction, pendingAction }) {
  if (!plans.length) return null;
  return <section className="plans-section"><div className="section-heading"><div><h2>Saving plans</h2><p>Contribution schedules linked to your goals</p></div></div><div className="plan-list">{plans.map((plan) => { const goal = goalRows.find((item) => item.id === plan.goal); return <div className="plan-row" key={plan.id}><span><strong>{money(plan.amount, goal?.currency || "KES")} · {plan.frequency}</strong><small>{goal?.name || `Goal #${plan.goal}`} · starts {formatDate(plan.start_date)}</small></span><Status value={plan.status} /><span className="plan-actions">{plan.status === "active" && <LoadingButton className="small-action" disabled={Boolean(pendingAction)} busy={pendingAction?.kind === "plan" && pendingAction.id === plan.id && pendingAction.action === "pause"} loadingLabel="Pausing…" onClick={() => onAction(plan, "pause")}>Pause</LoadingButton>}{plan.status === "paused" && <LoadingButton className="small-action" disabled={Boolean(pendingAction)} busy={pendingAction?.kind === "plan" && pendingAction.id === plan.id && pendingAction.action === "resume"} loadingLabel="Resuming…" onClick={() => onAction(plan, "resume")}>Resume</LoadingButton>}{["active", "paused"].includes(plan.status) && <><LoadingButton className="small-action" disabled={Boolean(pendingAction)} busy={pendingAction?.kind === "plan" && pendingAction.id === plan.id && pendingAction.action === "complete"} loadingLabel="Completing…" onClick={() => onAction(plan, "complete")}>Complete</LoadingButton><LoadingButton className="small-action danger-text" disabled={Boolean(pendingAction)} busy={pendingAction?.kind === "plan" && pendingAction.id === plan.id && pendingAction.action === "cancel"} loadingLabel="Cancelling…" onClick={() => onAction(plan, "cancel")}>Cancel</LoadingButton></>}</span></div>; })}</div></section>;
}

function SavingsActivity({ contributions, withdrawals, goalRows }) {
  const records = [
    ...contributions.map((item) => ({ ...item, type: "Contribution", date: item.contribution_date })),
    ...withdrawals.map((item) => ({ ...item, type: "Withdrawal", date: item.withdrawal_date })),
  ].sort((a, b) => b.date.localeCompare(a.date));
  return <section className="plans-section"><div className="section-heading"><div><h2>Goal activity</h2><p>Contributions and withdrawals recorded against your goals</p></div></div>{records.length ? <div className="activity-list">{records.map((item) => { const goal = goalRows.find((row) => row.id === item.goal); return <article className="activity-row" key={`${item.type}-${item.id}`}><span className={`activity-icon ${item.type === "Contribution" ? "income" : "expense"}`} aria-hidden="true">{item.type === "Contribution" ? <ArrowDownLeft size={17} /> : <ArrowUpRight size={17} />}</span><span className="activity-copy"><strong>{item.type} · {goal?.name || `Goal #${item.goal}`}</strong><small>{formatDate(item.date)}{item.note ? ` · ${item.note}` : ""}</small></span><strong className={item.type === "Contribution" ? "amount-positive" : ""}>{item.type === "Contribution" ? "+" : "−"}{money(item.amount, goal?.currency || "KES")}</strong></article>; })}</div> : <p className="muted-text">Goal contributions and withdrawals will appear here.</p>}</section>;
}

function ExchangePage() {
  const [from, setFrom] = useState("KES"); const [to, setTo] = useState("USD"); const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function lookup(event) { event.preventDefault(); setBusy(true); setError(""); setResult(null); try { setResult(await api("/api/exchange-rates/", { query: { from, to } })); } catch (err) { setError(formErrorMessage(err, { context: "exchange" })); } finally { setBusy(false); } }
  return <div className="page-content"><div className="page-intro"><div><h1>Exchange rates</h1><p className="muted-text">Check the live rate used for cross-currency transfers.</p></div></div><section className="exchange-panel"><div className="exchange-panel-head"><BadgeDollarSign size={22} /><div><h2>Look up a rate</h2><p>Rates are retrieved from the exchange-rate service configured by Budgetly.</p></div></div><form className="exchange-form" onSubmit={lookup}><label className="field"><span>From</span><select value={from} onChange={(e) => setFrom(e.target.value)}><option>KES</option><option>USD</option></select></label><ArrowRight className="exchange-arrow" size={20} /><label className="field"><span>To</span><select value={to} onChange={(e) => setTo(e.target.value)}><option>USD</option><option>KES</option></select></label><LoadingButton className="primary-button" busy={busy} disabled={from === to} loadingLabel="Checking rate…">Get current rate</LoadingButton></form><ErrorNotice message={error} />{result && <div className="rate-result"><span>1 {result.from} equals</span><strong>{Number(result.rate).toLocaleString(undefined, { maximumFractionDigits: 6 })} {result.to}</strong><small>Source: {result.source} · checked just now. Transfer records keep their original rate.</small></div>}</section><p className="muted-text exchange-note">For transfers, Budgetly records the conversion rate and received amount at the time you create the transfer.</p></div>;
}

function SettingsPage({ logoutBusy, profile, theme, onThemeChange, onReopenOnboarding, onProfileChange, onLogout, navigate }) {
  const [form, setForm] = useState({ first_name: profile?.first_name || "", last_name: profile?.last_name || "", email: profile?.email || "", username: profile?.username || "" });
  const [password, setPassword] = useState({ old_password: "", new_password: "", confirm_password: "" });
  const [deleteForm, setDeleteForm] = useState({ password: "", confirmation: "" });
  const [pendingAction, setPendingAction] = useState("");
  const [busy, setBusy] = useState(false), [notice, setNotice] = useState("");
  const [failure, setFailure] = useState({ scope: "", result: null });
  const fields = { profile: { first_name: "First name", last_name: "Last name", email: "Email address" }, password: { old_password: "Current password", new_password: "New password", confirm_password: "Confirm new password" }, deleteAccount: { password: "Password" } };
  function start(scope) { setPendingAction(scope === "deleteAccount" ? "delete" : scope);setBusy(true);setFailure({ scope: "", result: null });setNotice(""); }
  function showFailure(error, scope, form) { setFailure({ scope, result: normalizeError(error, { context: scope, fields: fields[scope] || {} }) });focusFormError(form); }
  function clear(scope, name) {
    setFailure(current => {
      if (current.scope !== scope) return current;
      const fieldErrors = { ...current.result?.fieldErrors, [name]: "" };
      const message = current.result?.kind === "validation" && !Object.values(fieldErrors).some(Boolean) && !current.result?.formErrors?.length ? "" : current.result?.message;
      return { ...current, result: { ...current.result, message, fieldErrors } };
    });
  }
  const fieldError = (scope, name) => failure.scope === scope ? failure.result?.fieldErrors[name] : "";
  const feedback = scope => failure.scope === scope ? <ErrorNotice message={failure.result?.message} messages={failure.result?.formErrors} /> : null;
  function invalid(event, scope) {
    event.preventDefault();const control = event.target;setNotice("");
    setFailure(current => ({ scope, result: { kind: "validation", message: "Please check the highlighted details.", fieldErrors: { ...(current.scope === scope ? current.result?.fieldErrors : {}), [control.name]: nativeValidationMessage(control) } } }));
    focusFormError(control.form);
  }
    async function downloadExport() {
    start("export");
    try {
      const paths = [
        ["profile", "/api/auth/profile/"], ["accounts", "/api/accounts/"], ["categories", "/api/categories/"],
        ["transactions", "/api/transactions/"], ["transfers", "/api/transfers/"], ["budgets", "/api/budgets/"],
        ["loans", "/api/loans/"], ["loan_repayments", "/api/loan-repayments/"], ["savings_goals", "/api/savings/goals/"],
        ["savings_plans", "/api/savings/plans/"], ["savings_contributions", "/api/savings/contributions/"], ["savings_withdrawals", "/api/savings/withdrawals/"],
      ];
      const entries = await Promise.all(paths.map(async ([key, path]) => [key, key === "profile" ? await api(path) : await fetchAllPages(path)]));
      const exportData = { product: "Budgetly", exported_at: new Date().toISOString(), data: Object.fromEntries(entries) };
      const objectUrl = URL.createObjectURL(new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" }));
      const download = document.createElement("a");
      download.href = objectUrl;
      download.download = `budgetly-data-export-${today()}.json`;
      document.body.append(download); download.click(); download.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      setNotice("Your Budgetly data export has been downloaded to this device.");
    } catch (err) { showFailure(err, "export"); }
    finally { setBusy(false); }
  }

  async function saveProfile(event) {
    event.preventDefault();const submitted = event.currentTarget;start("profile");
    try { const updated = await api("/api/auth/profile/", { method: "PATCH", body: jsonBody({ first_name: form.first_name, last_name: form.last_name, email: form.email }) });onProfileChange(updated);setNotice("Profile updated."); }
    catch (error) { showFailure(error, "profile", submitted); } finally { setBusy(false); }
  }
  async function changePassword(event) {
    event.preventDefault();const submitted = event.currentTarget;start("password");
    try { await api("/api/auth/change-password/", { method: "POST", body: jsonBody(password) });setPassword({ old_password: "", new_password: "", confirm_password: "" });setNotice("Password changed."); }
    catch (error) { showFailure(error, "password", submitted); } finally { setBusy(false); }
  }
  async function deleteAccount(event) {
    event.preventDefault();if (deleteForm.confirmation !== "DELETE") return;const submitted = event.currentTarget;start("deleteAccount");
    try { await api("/api/auth/delete-account/", { method: "DELETE", body: jsonBody({ password: deleteForm.password }) });sessionStorage.removeItem("budgetly.access");sessionStorage.removeItem("budgetly.refresh");onLogout("/logout"); }
    catch (error) { showFailure(error, "deleteAccount", submitted); } finally { setBusy(false); }
  }
  return <div className="page-content">
    <div className="page-intro"><div><h1>Settings</h1><p className="muted-text">Manage the personal details and sign-in credentials on your account.</p></div></div>
    {notice && <p className="inline-notice" role="status"><Check size={16} />{notice}</p>}
    <div className="settings-grid">
      <section className="settings-section"><div className="section-heading"><div><h2>Personal details</h2><p>Your profile information</p></div></div>
        {!profileDisplayName(profile, "") && <p className="muted-text">Add your name so Budgetly can greet you. Your sign-in username stays the same.</p>}
        <form className="settings-form" onSubmit={saveProfile} onInvalid={event => invalid(event, "profile")}>
          {feedback("profile")}
          <SettingsField label="Username" name="username" value={form.username} disabled />
          <div className="form-row">{["first_name", "last_name"].map(name => <SettingsField key={name} label={fields.profile[name]} name={name} value={form[name]} error={fieldError("profile", name)} onChange={value => { setForm({ ...form, [name]: value });clear("profile", name); }} />)}</div>
          <SettingsField label="Email address" name="email" type="email" required value={form.email} error={fieldError("profile", "email")} onChange={value => { setForm({ ...form, email: value });clear("profile", "email"); }} />
          <LoadingButton className="primary-button" busy={busy && pendingAction === "profile"} disabled={busy} loadingLabel="Saving profile…">Save profile</LoadingButton>
        </form>
      </section>
      <section className="settings-section"><div className="section-heading"><div><h2>Password &amp; security</h2><p>Change a known password or reset one you’ve forgotten.</p></div></div>
        <form className="settings-form" onSubmit={changePassword} onInvalid={event => invalid(event, "password")}>
          {feedback("password")}
          {Object.keys(fields.password).map(name => <PasswordInput key={name} label={fields.password[name]} name={name} value={password[name]} error={fieldError("password", name)} onChange={value => { setPassword({ ...password, [name]: value });clear("password", name); }} />)}
          <LoadingButton className="secondary-button" busy={busy && pendingAction === "password"} disabled={busy} loadingLabel="Updating password…">Update password</LoadingButton>
        </form>
        <button className="settings-reset-link" type="button" onClick={() => navigate("/forgot-password")}>Forgot your password? Reset it <ArrowRight size={15} /></button>
        <GoogleAccountLink key={profile?.id} profile={profile} theme={theme} busy={busy} logoutBusy={logoutBusy} onBusyChange={active => { setBusy(active);if (active) setPendingAction("google"); }} />
        <div className="settings-session"><h3>Session</h3><p>The app stores this session’s tokens in this browser tab. Signing out sends the refresh token to Budgetly’s revocation endpoint.</p><LoadingButton className="text-button danger-text" announce={false} busy={logoutBusy} loadingLabel="Signing out…" onClick={() => onLogout("/logout")}>Sign out <ArrowRight size={15} /></LoadingButton></div>
      </section>
      <section className="settings-section"><div className="section-heading"><div><h2>Appearance</h2><p>Choose how Budgetly looks on this device.</p></div></div><div className="settings-form"><label className="field"><span>Theme</span><select value={theme} onChange={event => onThemeChange(event.target.value)}><option value="light">Light · luminous mist</option><option value="dark">Dark · midnight blue</option></select></label><button type="button" className="text-button" onClick={onReopenOnboarding}>Reopen getting started guide <ArrowRight size={15} /></button></div></section>
      <section className="settings-section"><div className="section-heading"><div><h2>Your data</h2><p>Save a copy of your Budgetly records as JSON.</p></div></div><div className="settings-form"><p className="muted-text">The export downloads to this device and may contain sensitive financial information. Store it somewhere private.</p>{feedback("export")}<LoadingButton type="button" className="secondary-button" onClick={downloadExport} busy={busy && pendingAction === "export"} disabled={busy} loadingLabel="Preparing export…">Download my data</LoadingButton></div></section>
    </div>
    <section className="delete-account-section"><h2>Delete account</h2><p>This permanently removes your Budgetly account and its associated records. Enter your password and type DELETE to continue.</p>
      <div className="deletion-guidance" role="note" aria-labelledby="google-deletion-title">
        <h3 id="google-deletion-title">Use Google without a Budgetly password?</h3>
        <ol>
          <li>Request a <button type="button" className="inline-link" onClick={() => navigate("/forgot-password")}>password reset</button> using the email shown in Personal details.</li>
          <li>Follow the email link to set a Budgetly password. This does not change your Google password.</li>
          <li>Return to Sign in, continue with Google, then open Settings. Enter your new Budgetly password and type DELETE to confirm deletion.</li>
        </ol>
        <p>If you can’t complete these steps, contact <a href={SUPPORT_MAILTO}>{SUPPORT_EMAIL}</a> to request help with account deletion. Don’t send your password, reset link, verification codes or financial records.</p>
      </div>
      <form className="settings-form" onSubmit={deleteAccount} onInvalid={event => invalid(event, "deleteAccount")}>
        {feedback("deleteAccount")}
        <PasswordInput label="Password" name="password" value={deleteForm.password} error={fieldError("deleteAccount", "password")} onChange={value => { setDeleteForm({ ...deleteForm, password: value });clear("deleteAccount", "password"); }} />
        <SettingsField label="Type DELETE to confirm" name="confirmation" value={deleteForm.confirmation} onChange={value => setDeleteForm({ ...deleteForm, confirmation: value })} required />
        <LoadingButton className="danger-button" busy={busy && pendingAction === "delete"} disabled={busy || deleteForm.confirmation !== "DELETE"} loadingLabel="Deleting account…">Delete account and records</LoadingButton>
      </form>
    </section>
  </div>;
}

function SettingsField({ label, name, value, onChange, error, type = "text", ...props }) {
  const id = `settings-${name}-error`;
  return <label className="field"><span>{label}</span><input {...props} name={name} type={type} value={value} onChange={onChange ? event => onChange(event.target.value) : undefined} aria-invalid={error ? true : undefined} aria-describedby={error ? id : undefined} /><FieldError id={id} message={error} /></label>;
}

async function fetchAllPages(path) {
  const records = [];
  let next = path;
  let pageCount = 0;
  const trustedOrigin = new URL(apiBaseUrl).origin;
  while (next) {
    if (++pageCount > 100) throw new Error("The export stopped because a collection returned too many pages.");
    const page = await api(next);
    if (Array.isArray(page)) return records.concat(page);
    if (!Array.isArray(page?.results)) throw new Error("The export stopped because a collection returned an unexpected response. No partial file was downloaded.");
    records.push(...page.results);
    if (!page?.next) break;
    const nextUrl = new URL(page.next, apiBaseUrl);
    if (nextUrl.origin !== trustedOrigin) throw new Error("The export stopped because a collection returned an untrusted next page.");
    next = `${nextUrl.pathname}${nextUrl.search}`;
  }
  return records;
}

function PasswordInput({ label, name, value, onChange, error }) { return <SettingsField label={label} name={name} value={value} onChange={onChange} error={error} type="password" minLength={8} required={label !== "Current password"} autoComplete={name === "old_password" || name === "password" ? "current-password" : "new-password"} />; }

function Modal({ title, onClose, children }) {
  const panel = useRef(null);
  const closeHandler = useRef(onClose);
  useEffect(() => { closeHandler.current = onClose; }, [onClose]);
  useEffect(() => {
    const previous = document.activeElement;
    const dialog = panel.current;
    const focusable = () => [...dialog.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]')];
    focusable()[0]?.focus();
    const onKeyDown = (event) => {
      if (event.key === "Escape") { event.preventDefault(); closeHandler.current(); }
      if (event.key === "Tab") {
        const items = focusable();
        if (!items.length) { event.preventDefault(); dialog.focus(); return; }
        if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items.at(-1).focus(); }
        else if (!event.shiftKey && document.activeElement === items.at(-1)) { event.preventDefault(); items[0].focus(); }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("keydown", onKeyDown); previous?.focus?.(); };
  }, []);
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section ref={panel} className="modal-dialog" tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="modal-title"><header className="modal-header"><h2 id="modal-title">{title}</h2><button className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={18} /></button></header>{children}</section></div>;
}
function Status({ value }) { return <span className={`status status-${value}`}>{titleCase(value)}</span>; }
function ErrorState({ error, retry, compact = false }) { return <div className={`error-state ${compact ? "compact" : ""}`} role="alert"><strong>We couldn’t load this information.</strong><p>{error}</p><button className="secondary-button" onClick={retry}>Try again</button></div>; }
function EmptyState({ title, copy, action, onClick, icon: Icon = Wallet }) { return <div className="empty-state"><span className="empty-mark"><Icon size={20} /></span><h2>{title}</h2><p>{copy}</p>{action && <button className="secondary-button" onClick={onClick}>{action}<ArrowRight size={15} /></button>}</div>; }
function loanInterestFormState(loan) {
  const method = loan?.interest_method || (Number(loan?.annual_interest_rate ?? 0) > 0 ? "annual_percentage" : "none");
  if (method === "annual_percentage") return { interest_type: "percentage", interest_frequency: "annual", annual_interest_rate: loan?.annual_interest_rate ?? "", periodic_interest_rate: loan?.periodic_interest_rate ?? "", fixed_interest_amount: loan?.fixed_interest_amount ?? "", fixed_charge_behavior: loan?.fixed_charge_behavior || "full_until_settled" };
  if (["daily_percentage", "weekly_percentage", "monthly_percentage"].includes(method)) return { interest_type: "percentage", interest_frequency: method.replace("_percentage", ""), annual_interest_rate: loan?.annual_interest_rate ?? "", periodic_interest_rate: loan?.periodic_interest_rate ?? "", fixed_interest_amount: loan?.fixed_interest_amount ?? "", fixed_charge_behavior: loan?.fixed_charge_behavior || "full_until_settled" };
  if (["fixed_daily", "fixed_weekly", "fixed_monthly"].includes(method)) return { interest_type: "fixed_recurring", interest_frequency: method.replace("fixed_", ""), annual_interest_rate: loan?.annual_interest_rate ?? "", periodic_interest_rate: loan?.periodic_interest_rate ?? "", fixed_interest_amount: loan?.fixed_interest_amount ?? "", fixed_charge_behavior: loan?.fixed_charge_behavior || "full_until_settled" };
  if (method === "fixed_total") return { interest_type: "fixed_total", interest_frequency: "monthly", annual_interest_rate: loan?.annual_interest_rate ?? "", periodic_interest_rate: loan?.periodic_interest_rate ?? "", fixed_interest_amount: loan?.fixed_interest_amount ?? "", fixed_charge_behavior: loan?.fixed_charge_behavior || "full_until_settled" };
  return { interest_type: "none", interest_frequency: "annual", annual_interest_rate: loan?.annual_interest_rate ?? "", periodic_interest_rate: loan?.periodic_interest_rate ?? "", fixed_interest_amount: loan?.fixed_interest_amount ?? "", fixed_charge_behavior: loan?.fixed_charge_behavior || "full_until_settled" };
}

function loanInterestMethod(values) {
  if (values.interest_type === "percentage") return values.interest_frequency === "annual" ? "annual_percentage" : `${values.interest_frequency}_percentage`;
  if (values.interest_type === "fixed_recurring") return `fixed_${values.interest_frequency}`;
  if (values.interest_type === "fixed_total") return "fixed_total";
  return "none";
}

function decimalString(value, places, requirePositive = true) {
  const raw = String(value ?? "").trim();
  const pattern = new RegExp(`^\\d+(?:\\.\\d{1,${places}})?$`);
  if (!pattern.test(raw)) return null;
  const [whole, fraction = ""] = raw.split(".");
  const normalized = `${whole}.${fraction.padEnd(places, "0")}`;
  return requirePositive && Number(normalized) <= 0 ? null : normalized;
}

function buildLoanInterestPayload(values, loan, isEdit) {
  const method = loanInterestMethod(values);
  const previousMethod = loan?.interest_method || (Number(loan?.annual_interest_rate ?? 0) > 0 ? "annual_percentage" : "none");
  const switched = isEdit && method !== previousMethod;
  const payload = { interest_method: method };

  if (method === "annual_percentage") {
    const rate = decimalString(values.annual_interest_rate, 4);
    if (!rate) return null;
    payload.annual_interest_rate = rate;
  } else if (method.endsWith("_percentage")) {
    const rate = decimalString(values.periodic_interest_rate, 4);
    if (!rate) return null;
    payload.periodic_interest_rate = rate;
  } else if (method.startsWith("fixed_") || method === "fixed_total") {
    const amount = decimalString(values.fixed_interest_amount, 2);
    if (!amount) return null;
    payload.fixed_interest_amount = amount;
    if (["fixed_daily", "fixed_weekly", "fixed_monthly"].includes(method)) {
      if (!["full_until_settled", "proportional_to_principal"].includes(values.fixed_charge_behavior)) return null;
      payload.fixed_charge_behavior = values.fixed_charge_behavior;
    }
  }

  if (switched) {
    if (method !== "annual_percentage") payload.annual_interest_rate = "0.0000";
    if (!["daily_percentage", "weekly_percentage", "monthly_percentage"].includes(method)) payload.periodic_interest_rate = null;
    if (!method.startsWith("fixed_") && method !== "fixed_total") payload.fixed_interest_amount = null;
  }
  return payload;
}

function loanInterestValidationMessage(values) {
  if (values.interest_type === "percentage") return "Enter a positive percentage with no more than four decimal places.";
  if (["fixed_recurring", "fixed_total"].includes(values.interest_type)) return "Enter a positive fixed interest amount with no more than two decimal places.";
  return "Choose a supported interest agreement.";
}

function loanInterestAgreement(loan) {
  const method = loan.interest_method || (Number(loan.annual_interest_rate ?? 0) > 0 ? "annual_percentage" : "none");
  const percentage = (value) => `${String(value ?? "0").replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "")}%`;
  if (method === "none") return "No interest";
  if (method === "annual_percentage") return `${percentage(loan.annual_interest_rate)} annual percentage`;
  if (["daily_percentage", "weekly_percentage", "monthly_percentage"].includes(method)) {
    const period = method.replace("_percentage", "");
    const periodRule = period === "daily" ? "after each completed day" : `only after each full ${period}`;
    return `${percentage(loan.periodic_interest_rate)} ${period} percentage · ${periodRule}`;
  }
  if (["fixed_daily", "fixed_weekly", "fixed_monthly"].includes(method)) {
    const period = method.replace("fixed_", "");
    const amount = money(loan.fixed_interest_amount, loan.currency);
    const periodRule = period === "daily" ? "after each completed day" : `only after each full ${period}`;
    return loan.fixed_charge_behavior === "proportional_to_principal"
      ? `${amount} fixed ${period} charge · ${periodRule} · decreases with principal`
      : `${amount} fixed ${period} charge · ${periodRule} · full charge until settlement`;
  }
  if (method === "fixed_total") return `${money(loan.fixed_interest_amount, loan.currency)} fixed total · remains payable after early repayment`;
  return "Interest agreement details unavailable";
}
function formatDate(value) { if (!value) return "—"; const date = new Date(`${value.slice(0, 10)}T00:00:00`); return new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "short", year: "numeric" }).format(date); }
function numberAmount(value) { return Number(value || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function localDate(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function lastDay(value) { const [year, monthIndex] = value.split("-").map(Number); return localDate(new Date(year, monthIndex, 0)); }
function addDays(value, count) { const date = new Date(`${value}T12:00:00`); date.setDate(date.getDate() + count); return localDate(date); }
