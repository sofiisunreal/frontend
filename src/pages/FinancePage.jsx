import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownLeft, ArrowLeftRight, ArrowRight, ArrowUpRight, BadgeDollarSign, CalendarDays, Check, Filter, HandCoins, Leaf, LoaderCircle, Plus, Search, Target, Wallet, X } from "lucide-react";
import { api, apiBaseUrl, asList, formErrorMessage, jsonBody } from "../lib/api";
import HelpPage from "./HelpPage";
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

export default function FinancePage({ screen, initialAction, profile, theme, onThemeChange, onProfileChange, onReopenOnboarding, navigate }) {
  if (screen === "Overview") return <Dashboard navigate={navigate} profile={profile} />;
  if (screen === "Help") return <HelpPage navigate={navigate} onReopenOnboarding={onReopenOnboarding} />;
  if (screen === "Privacy policy") return <LegalDraftPage path="/privacy-policy" navigate={navigate} />;
  if (screen === "Terms of service") return <LegalDraftPage path="/terms-of-service" navigate={navigate} />;
  if (screen === "Exchange rates") return <ExchangePage />;
  if (screen === "Settings") return <SettingsPage profile={profile} theme={theme} onThemeChange={onThemeChange} onReopenOnboarding={onReopenOnboarding} onProfileChange={onProfileChange} onLogout={navigate} navigate={navigate} />;
  return <ResourcePage key={screen} screen={screen} initialAction={initialAction} navigate={navigate} />;
}

function Dashboard({ navigate, profile }) {
  const [data, setData] = useState(null);
  const [monthValue, setMonthValue] = useState(() => today().slice(0, 7));
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [monthlyTransactions, setMonthlyTransactions] = useState([]);
  const [spendingError, setSpendingError] = useState("");
  const [onboardingData, setOnboardingData] = useState(null);
  const [onboardingHidden, setOnboardingHidden] = useState(() => localStorage.getItem(`budgetly.onboarding.hidden.${profile?.id}`) === "true");
  const [onboardingCompletedBefore] = useState(() => localStorage.getItem(`budgetly.onboarding.complete.${profile?.id}`) === "true");
  useEffect(() => {
    if (!profile?.id) return undefined;
    let active = true;
    Promise.all([api("/api/accounts/"), api("/api/categories/"), api("/api/transactions/")])
      .then(([accounts, categories, transactions]) => {
        if (!active) return;
        const ownedCategories = asList(categories).filter((category) => String(category.user?.id ?? category.user) === String(profile.id));
        setOnboardingData({ accounts: asList(accounts).length, categories: ownedCategories.length, transactions: asList(transactions).length });
      }).catch(() => { if (active) setOnboardingData(null); });
    return () => { active = false; };
  }, [profile?.id]);
  const onboardingComplete = Boolean(onboardingData && onboardingData.accounts > 0 && onboardingData.categories > 0 && onboardingData.transactions > 0);
  useEffect(() => {
    if (!onboardingComplete || !profile?.id) return;
    localStorage.setItem(`budgetly.onboarding.complete.${profile.id}`, "true");
  }, [onboardingComplete, profile?.id]);
  const load = useCallback(async () => {
    setBusy(true); setError("");
    try { setData(await api("/api/dashboard/summary/", { query: { month: monthValue } })); }
    catch (err) { setError(formErrorMessage(err)); }
    finally { setBusy(false); }
  }, [monthValue]);
  useEffect(() => {
    let active = true;
    api("/api/dashboard/summary/", { query: { month: monthValue } }).then((value) => { if (active) { setData(value); setError(""); } })
      .catch((err) => { if (active) setError(formErrorMessage(err)); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [monthValue]);
  useEffect(() => {
    if (!data?.month) return;
    let active = true;
    api("/api/transactions/", { query: { month: data.month } }).then((value) => { if (active) setMonthlyTransactions(asList(value)); })
      .catch((err) => { if (active) setSpendingError(formErrorMessage(err)); });
    return () => { active = false; };
  }, [data?.month]);
  const balanceEntries = Object.entries(data?.balances || {});
  const currencyEntries = [...new Set([...Object.keys(data?.income || {}), ...Object.keys(data?.expenses || {}), ...Object.keys(data?.cash_flow || {})])];
  return <div className="page-content">
    <div className="page-intro"><div><h1>Good day.</h1><p className="muted-text">A current view of the accounts and activity you track.</p></div><div className="overview-actions"><label className="month-picker"><span>Month</span><input type="month" value={monthValue} onChange={(event) => { setBusy(true); setError(""); setMonthValue(event.target.value); }} /></label><button className="primary-button" onClick={() => navigate("/transactions?new=1")}><Plus size={17} />Add transaction</button></div></div>
    {busy ? <LoadingState label="Loading your overview" /> : error ? <ErrorState error={error} retry={load} /> : !data ? <EmptyState title="Your overview is ready when you are" copy="Add an account and your real totals will appear here." action="Add an account" onClick={() => navigate("/accounts?new=1")} /> : <>
      {!onboardingHidden && !onboardingCompletedBefore && onboardingData && <GettingStartedChecklist progress={onboardingData} complete={onboardingComplete} onDismiss={() => { localStorage.setItem(`budgetly.onboarding.hidden.${profile.id}`, "true"); setOnboardingHidden(true); }} navigate={navigate} profile={profile} />}
      <section className="overview-lead" aria-label="Account balances"><div className="overview-lead-copy"><p>Across your active accounts</p>{balanceEntries.length ? <div className="balance-total-list">{balanceEntries.map(([code, amount]) => <strong key={code}>{money(amount, code)}</strong>)}</div> : <strong className="lead-empty">No account balances yet</strong>}<span>Balances are grouped by currency.</span></div><div className="overview-lead-mark"><Wallet size={31} strokeWidth={1.5} /></div></section>
      <div className="summary-strip"><div className="summary-strip-title"><CalendarDays size={16} /><span>{monthLabel(data.month)}</span></div>{currencyEntries.map((code) => <div className="summary-currency" key={code}><span>{code}</span><div><small>Income</small><strong className="amount-positive">+{money(data.income?.[code], code)}</strong></div><div><small>Expenses</small><strong>−{money(data.expenses?.[code], code)}</strong></div><div><small>Cash flow</small><strong className={Number(data.cash_flow?.[code]) >= 0 ? "amount-positive" : "amount-negative"}>{money(data.cash_flow?.[code], code)}</strong></div></div>)}{!currencyEntries.length && <p className="muted-text">No transactions recorded this month.</p>}</div>
      <div className="overview-columns"><div className="overview-primary"><SpendingChart transactions={monthlyTransactions} error={spendingError} /><section className="content-section"><div className="section-heading"><div><h2>Recent activity</h2><p>Your latest recorded transactions</p></div><button className="text-button" onClick={() => navigate("/transactions")}>All transactions <ArrowRight size={15} /></button></div>{data.recent_transactions?.length ? <div className="activity-list">{data.recent_transactions.map((item) => <article className="activity-row" key={item.id}><span className={`activity-icon ${item.type}`} aria-hidden="true">{item.type === "income" ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}</span><span className="activity-copy"><strong>{item.description}</strong><small>{item.category} · {formatDate(item.date)}</small></span><strong className={item.type === "income" ? "amount-positive" : ""}>{item.type === "income" ? "+" : "−"}{money(item.amount, item.currency)}</strong></article>)}</div> : <p className="muted-text">No transactions recorded yet.</p>}</section></div>
        <aside className="overview-side"><h2>Your money, in view</h2><p>Everything here comes from your Budgetly records. A figure appears once you add the related account or activity.</p><div className="overview-counts"><button onClick={() => navigate("/accounts")}><Wallet size={17} /><span>Active accounts</span><strong>{data.accounts?.total ?? 0}</strong></button><button onClick={() => navigate("/budgets")}><Target size={17} /><span>Active budgets</span><strong>{data.budgets?.active ?? 0}</strong></button><button onClick={() => navigate("/savings")}><Leaf size={17} /><span>Active goals</span><strong>{data.savings?.active_goals ?? 0}</strong></button><button onClick={() => navigate("/loans")}><HandCoins size={17} /><span>Open loans</span><strong>{data.loans?.active ?? 0}</strong></button></div></aside></div>
    </>}
  </div>;
}

function GettingStartedChecklist({ progress, complete, onDismiss, navigate, profile }) {
  const steps = [
    { key: "accounts", title: "Add an account", copy: "Choose where your money lives and set its current starting balance.", url: "/accounts?new=1", count: progress.accounts },
    { key: "categories", title: "Create a category", copy: "Add a personal income or expense category that matches your day-to-day spending.", url: "/categories?new=1", count: progress.categories },
    { key: "transactions", title: "Record your first transaction", copy: "Log income or an expense against one of your accounts.", url: "/transactions?new=1", count: progress.transactions },
  ];
  const finished = steps.filter((step) => step.count > 0).length;
  return <section className={`getting-started ${complete ? "getting-started-complete" : ""}`} aria-labelledby="getting-started-title">
    <div className="getting-started-head"><div><span className="guide-progress">{complete ? "Guide complete" : `${finished} of 3 steps saved`}</span><h2 id="getting-started-title">{complete ? `You’re all set${profile?.first_name ? `, ${profile.first_name}` : ""}.` : `Welcome${profile?.first_name ? `, ${profile.first_name}` : ""}.`}</h2><p>{complete ? "Your first account, category and transaction are saved. Your overview will reflect your Budgetly records." : "A few simple steps will make your overview useful. Your progress updates from saved Budgetly data."}</p></div><button type="button" className="icon-button" aria-label="Dismiss getting started guide" onClick={onDismiss}><X size={18} /></button></div>
    {!complete && <ol className="getting-started-steps">{steps.map((step, index) => <li key={step.key} className={step.count ? "step-complete" : ""}><span className="step-index">{step.count ? <Check size={16} /> : index + 1}</span><div><h3>{step.title}</h3><p>{step.copy}</p></div>{step.count ? <span className="step-status">Saved</span> : <button className="text-button" onClick={() => navigate(step.url)}>Start <ArrowRight size={15} /></button>}</li>)}</ol>}
    {complete && <button className="secondary-button" onClick={onDismiss}>Continue to overview <ArrowRight size={15} /></button>}
  </section>;
}

function monthLabel(value) {
  if (!value) return "This month";
  const [year, monthIndex] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(new Date(year, monthIndex - 1, 1));
}

function SpendingChart({ transactions, error }) {
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
  return <section className="spending-chart-section"><div className="section-heading"><div><h2>Spending by category</h2><p>Share of recorded expenses, grouped by currency</p></div></div>{error ? <p className="muted-text">Category spending could not be loaded. You can still view your transactions.</p> : groups.length ? <div className="spending-chart-list">{groups.map((item) => { const percent = totals[item.code] ? item.amount / totals[item.code] * 100 : 0; return <div className="spending-chart-row" key={`${item.code}-${item.name}`}><div className="spending-chart-top"><span>{item.name} <small>{item.code} · {Math.round(percent)}%</small></span><strong>{money(item.amount, item.code)}</strong></div><div className="spending-chart-track" role="progressbar" aria-label={`${item.name} share of ${item.code} expenses`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(percent)}><i style={{ width: `${percent}%` }} /></div></div>; })}</div> : <p className="muted-text">No expenses recorded this month.</p>}</section>;
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
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
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
    catch (err) { setError(formErrorMessage(err)); }
    finally { setBusy(false); }
  }, [applyResource, loadResource]);
  useEffect(() => {
    let active = true;
    loadResource().then((result) => { if (active) applyResource(result); })
      .catch((err) => { if (active) setError(formErrorMessage(err)); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [applyResource, loadResource]);

  const visibleRows = useMemo(() => rows.filter((row) => {
    const text = JSON.stringify(row).toLowerCase();
    return text.includes(query.toLowerCase()) && (typeFilter === "all" || row.transaction_type === typeFilter || row.category_type === typeFilter || row.loan_type === typeFilter || row.status === typeFilter);
  }), [rows, query, typeFilter]);

  const startCreate = (kind = "create", row = null) => setDialog({ kind, row });
  async function remove(row) {
    setNotice("");
    try {
      if (screen === "Accounts") await api(`${endpoint}${row.id}/archive/`, { method: "POST" });
      else await api(`${endpoint}${row.id}/`, { method: "DELETE" });
      setNotice(screen === "Accounts" ? "Account archived." : `${info.singular[0].toUpperCase()}${info.singular.slice(1)} deleted.`);
      await load();
    } catch (err) { setError(formErrorMessage(err)); }
  }
  async function goalAction(row, action) {
    try { await api(`/api/savings/goals/${row.id}/${action}/`, { method: "POST" }); setNotice(({ pause: "Goal paused.", resume: "Goal resumed.", close: "Goal closed.", cancel: "Goal cancelled." })[action]); await load(); }
    catch (err) { setError(formErrorMessage(err)); }
  }
  async function planAction(plan, action) {
    try { await api(`/api/savings/plans/${plan.id}/${action}/`, { method: "POST" }); setNotice(`Savings plan ${action === "pause" ? "paused" : action === "resume" ? "resumed" : `${action}d`}.`); await load(); }
    catch (err) { setError(formErrorMessage(err)); }
  }
  async function changeGoal(row, newStatus) {
    const action = newStatus === "paused" ? "pause" : "resume";
    await goalAction(row, action);
  }

  const columns = buildColumns(screen, { accounts, categories });
  const setupAction = !busy && !error && ((screen === "Transactions" && accounts.length === 0) || (screen === "Transfers" && accounts.length < 2) || (screen === "Loans" && accounts.length === 0) || (screen === "Budgets & Savings" && categories.filter((item) => item.category_type === "expense").length === 0));
  return <div className="page-content">
    <div className="page-intro"><div><h1>{info.title}</h1><p className="muted-text">{info.description}</p></div><button className="primary-button" disabled={setupAction} onClick={() => startCreate()}><Plus size={17} />New {info.singular}</button></div>
    {notice && <p className="inline-notice" role="status"><Check size={16} />{notice}<button aria-label="Dismiss message" onClick={() => setNotice("")}><X size={15} /></button></p>}
    {error && <ErrorState error={error} retry={load} compact />}
    {screen === "Transactions" && <div className="filter-row"><label className="table-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search transactions" aria-label="Search transactions" /></label><select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} aria-label="Filter by type"><option value="all">All activity</option><option value="income">Income</option><option value="expense">Expenses</option></select></div>}
    {screen === "Budgets & Savings" && <p className="backend-note">The current budget API does not include a currency field. Amounts are shown as entered and the API does not convert spending across currencies.</p>}
    {screen === "Savings goals" && <p className="backend-note">Goal contributions are tracked separately. The current API does not post them as account transactions.</p>}
    {setupAction && <p className="backend-note">{screen === "Transfers" ? "Add at least two active accounts before creating a transfer." : screen === "Budgets & Savings" ? "Create an expense category before setting a budget." : "Add an account before recording this activity."}</p>}
    {screen === "Savings goals" && <div className="goal-action-row"><button className="secondary-button" onClick={() => startCreate("contribute")}><Plus size={15} />Record contribution</button><button className="secondary-button" onClick={() => startCreate("withdraw")}><ArrowUpRight size={15} />Record withdrawal</button><button className="secondary-button" onClick={() => startCreate("plan")}><CalendarDays size={15} />Create saving plan</button></div>}
    {screen === "Loans" && <div className="goal-action-row"><button className="secondary-button" onClick={() => startCreate("repayment")}><ArrowLeftRight size={15} />Record repayment</button></div>}
    {busy ? <LoadingState label={`Loading ${info.title.toLowerCase()}`} /> : error ? null : visibleRows.length ? <div className="table-wrap"><table className="data-table"><thead><tr>{columns.map((col) => <th key={col.key}>{col.label}</th>)}<th><span className="visually-hidden">Actions</span></th></tr></thead><tbody>{visibleRows.map((row) => <tr key={row.id}>{columns.map((col) => <td key={col.key} data-label={col.label}>{col.render ? col.render(row) : row[col.key] ?? "—"}</td>)}<td className="row-actions" data-label="Actions">{screen === "Savings goals" && <><button className="small-action" onClick={() => setDialog({ kind: "contribute", row })}>Add funds</button><button className="small-action" onClick={() => startCreate("edit", row)}>Edit</button>{["active", "paused"].includes(row.status) && <button className="small-action" onClick={() => changeGoal(row, row.status === "paused" ? "active" : "paused")}>{row.status === "paused" ? "Resume" : "Pause"}</button>}{["active", "paused", "target_reached"].includes(row.status) && <button className="small-action" onClick={() => goalAction(row, "close")}>Close</button>}{!["closed", "cancelled"].includes(row.status) && <button className="small-action danger-text" onClick={() => goalAction(row, "cancel")}>Cancel</button>}</>}{screen === "Loans" && <><button className="small-action" onClick={() => setDialog({ kind: "repayment", row })} disabled={Number(row.total_outstanding ?? row.remaining_amount) <= 0}>Repay</button><button className="small-action" onClick={() => startCreate("edit", row)}>Edit</button><button className="small-action danger-text" onClick={() => setDialog({ kind: "confirm-delete", row })}>Delete</button></>}{screen === "Accounts" && <><button className="small-action" onClick={() => startCreate("edit", row)}>Edit</button><button className="small-action" onClick={() => setDialog({ kind: "confirm-delete", row })}>Archive</button></>}{screen !== "Accounts" && screen !== "Savings goals" && screen !== "Loans" && !(screen === "Categories" && row.user == null) && <><button className="small-action" onClick={() => startCreate("edit", row)}>Edit</button><button className="small-action danger-text" onClick={() => setDialog({ kind: "confirm-delete", row })}>Delete</button></>}</td></tr>)}</tbody></table></div> : <EmptyState icon={screen === "Categories" ? Filter : Wallet} title={query ? "No matching records" : setupAction ? "One thing to add first" : screen === "Categories" ? "Start with your first category" : emptyTitle(screen)} copy={query ? "Try another search or clear the filter." : setupAction ? screen === "Transfers" ? "Create two accounts before recording a transfer." : screen === "Budgets & Savings" ? "Add an expense category first so your limit is attached to the right spending." : "Add an account first so this activity changes the right balance." : screen === "Categories" ? "Categories keep income and spending organised. Create one now, then use it straight away when you add a matching transaction." : `Add your first ${info.singular} to see it here.`} action={query ? null : setupAction ? (screen === "Transfers" ? "Add accounts" : screen === "Budgets & Savings" ? "Add an expense category" : "Add an account") : screen === "Categories" ? "Add category" : `Add ${info.singular}`} onClick={() => query ? setQuery("") : setupAction ? navigate(screen === "Budgets & Savings" ? "/categories?new=1" : "/accounts?new=1") : startCreate()} />}
    {screen === "Savings goals" && <SavingsPlans plans={goals} goalRows={rows} onAction={planAction} />}
    {screen === "Savings goals" && <SavingsActivity contributions={contributions} withdrawals={withdrawals} goalRows={rows} />}
    {dialog && <ResourceDialog screen={screen} dialog={dialog} accounts={accounts} categories={categories} goals={screen === "Savings goals" || screen === "Loans" ? rows : []} navigate={navigate} onClose={() => setDialog(null)} onSaved={async (message) => { setDialog(null); setNotice(message); await load(); }} onDelete={async (row) => { setDialog(null); await remove(row); }} />}
  </div>;
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
    { key: "person_name", label: "Loan", render: (r) => <div className="table-primary"><strong>{r.person_name}</strong><small>{titleCase(r.loan_type)} · {r.description || "No description"}</small><small className="loan-agreement">{loanInterestAgreement(r)}</small><small>Original amount · {money(r.original_amount, r.currency)}</small></div> },
    { key: "total_outstanding", label: "Total outstanding", render: (r) => <div className="loan-balance-cell"><strong>{money(r.total_outstanding ?? r.remaining_amount ?? r.original_amount, r.currency)}</strong><small>Principal · {money(r.outstanding_principal ?? r.remaining_amount, r.currency)}</small><small>{r.accrued_interest != null ? `Accrued interest · ${money(r.accrued_interest, r.currency)}` : "Interest breakdown unavailable"}</small>{r.interest_as_of_date && <small>Interest as of · {formatDate(r.interest_as_of_date)}</small>}</div> },
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
  const kind = dialog.kind;
  const isEdit = kind === "edit";
  const loanHasRepayments = screen === "Loans" && isEdit && (dialog.row?.repayments?.length || 0) > 0;
  const noInterestLoanLocked = screen === "Loans" && isEdit && (dialog.row?.interest_method || (Number(dialog.row?.annual_interest_rate ?? 0) > 0 ? "annual_percentage" : "none")) === "none";
  const set = (name, value) => setValues((current) => ({ ...current, [name]: value }));
  if (kind === "confirm-delete") {
    const isArchive = screen === "Accounts";
    const recordName = dialog.row.description || dialog.row.name || dialog.row.person_name;
    return <Modal title={isArchive ? "Archive this account?" : "Delete this record?"} onClose={onClose}><p className="dialog-copy">{isArchive ? `“${dialog.row.name}” will be removed from your active account list and overview totals. Its transaction history remains recorded.` : `This removes “${recordName}” from your records.`}</p>{error && <p className="form-message form-message-error">{error}</p>}<div className="dialog-actions"><button className="secondary-button" onClick={onClose}>Keep record</button><button className="danger-button" disabled={busy} onClick={async () => { setBusy(true); try { await onDelete(dialog.row); } catch (e) { setError(formErrorMessage(e)); setBusy(false); } }}>{isArchive ? "Archive account" : "Delete record"}</button></div></Modal>;
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
    event.preventDefault(); setError("");
    const canUpdateLoanInterest = screen === "Loans" && (kind === "create" || isEdit) && !loanHasRepayments && !noInterestLoanLocked;
    const loanInterestPayload = canUpdateLoanInterest ? buildLoanInterestPayload(values, dialog.row, isEdit) : {};
    if (canUpdateLoanInterest && !loanInterestPayload) {
      setError(loanInterestValidationMessage(values));
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
    } catch (err) { setError(formErrorMessage(err)); }
    finally { setBusy(false); }
  }
  const hasMatchingCategory = categories.some((category) => category.category_type === values.transaction_type);
  return <Modal title={heading} onClose={onClose}><form className="resource-form" onSubmit={submit}>
    {error && <p className="form-message form-message-error" role="alert">{error}</p>}
    {loanTermsNotice && <p className="form-message form-message-info" role="note">{loanTermsNotice}</p>}
    {screen === "Transactions" && !hasMatchingCategory && <p className="form-message form-message-info" role="status">There are no {values.transaction_type} categories yet. <button className="text-button" type="button" onClick={() => { onClose(); navigate("/categories?new=1"); }}>Create a category</button>, then return to record this transaction.</p>}
    <div className="dialog-fields">{fields.map((field) => <FieldControl key={field.name} field={field} value={values[field.name]} set={set} setError={setError} accounts={accounts} categories={categories} goals={goals} isEdit={isEdit} />)}</div>
    {showTransferPreview && <TransferPreview from={sourceAccount.currency} to={destinationAccount.currency} amount={values.from_amount} />}
    <div className="dialog-actions"><button className="secondary-button" type="button" onClick={onClose}>Cancel</button><button className="primary-button" type="submit" disabled={busy}>{busy ? "Saving…" : isEdit ? "Save changes" : heading}</button></div>
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

function FieldControl({ field, value, set, setError, isEdit }) {
  const onChange = (event) => { setError(""); field.onChange ? field.onChange(event.target.type === "checkbox" ? event.target.checked : event.target.value) : set(field.name, event.target.type === "checkbox" ? event.target.checked : event.target.value); };
  const onInvalid = (event) => {
    if (["annual_interest_rate", "periodic_interest_rate"].includes(field.name)) { setError("Enter a positive percentage with no more than four decimal places."); return; }
    if (field.name === "fixed_interest_amount") { setError("Enter a positive fixed interest amount with no more than two decimal places."); return; }
    if (!field.required) return;
    setError(field.name === "account_type" && !event.currentTarget.value ? "Choose an account type before saving." : event.currentTarget.validationMessage || `${field.label} is required.`);
  };
  if (field.type === "checkbox") return <label className="checkbox-field"><input type="checkbox" name={field.name} checked={Boolean(value)} onChange={onChange} /><span>{field.label}</span></label>;
  const common = { name: field.name, value: value ?? "", onChange, onInvalid, required: field.required, disabled: field.disabled, min: field.min, step: field.step };
  return <label className={`field ${field.type === "textarea" ? "field-wide" : ""}`}><span>{field.label}{isEdit && field.name === "exchange_rate" ? " · historical rate cannot change" : ""}</span>{field.hint && <small className="field-hint">{field.hint}</small>}{field.type === "select" ? <select {...common}>{!field.options?.length ? <option value="">No compatible options available</option> : <>{field.required && !field.options.some(([optionValue]) => String(optionValue) === "") && <option value="">Select {field.label.toLowerCase()}</option>}{field.options.map(([optionValue, label]) => <option key={optionValue} value={optionValue}>{label}</option>)}</>}</select> : field.type === "textarea" ? <textarea {...common} rows={3} /> : <input {...common} type={field.type || "text"} />}</label>;
}

function TransferPreview({ from, to, amount }) {
  const [state, setState] = useState({ loading: true, rate: null, error: "" });
  useEffect(() => {
    let active = true;
    api("/api/exchange-rates/", { query: { from, to } }).then((result) => { if (active) setState({ loading: false, rate: Number(result.rate), error: "" }); })
      .catch((err) => { if (active) setState({ loading: false, rate: null, error: formErrorMessage(err) }); });
    return () => { active = false; };
  }, [from, to]);
  if (state.loading) return <p className="form-message form-message-info transfer-preview" role="status">Checking the current {from} to {to} rate…</p>;
  if (state.error) return <p className="form-message form-message-info transfer-preview" role="status">A live preview isn’t available. Budgetly will validate the rate when you save the transfer.</p>;
  return <p className="form-message form-message-info transfer-preview" role="status">Estimated received amount: <strong>{money(Number(amount || 0) * state.rate, to)}</strong><span> · Rate {state.rate.toLocaleString(undefined, { maximumFractionDigits: 8 })} {to} per {from}. The backend records its live rate on save.</span></p>;
}

function SavingsPlans({ plans, goalRows, onAction }) {
  if (!plans.length) return null;
  return <section className="plans-section"><div className="section-heading"><div><h2>Saving plans</h2><p>Contribution schedules linked to your goals</p></div></div><div className="plan-list">{plans.map((plan) => { const goal = goalRows.find((item) => item.id === plan.goal); return <div className="plan-row" key={plan.id}><span><strong>{money(plan.amount, goal?.currency || "KES")} · {plan.frequency}</strong><small>{goal?.name || `Goal #${plan.goal}`} · starts {formatDate(plan.start_date)}</small></span><Status value={plan.status} /><span className="plan-actions">{plan.status === "active" && <button className="small-action" onClick={() => onAction(plan, "pause")}>Pause</button>}{plan.status === "paused" && <button className="small-action" onClick={() => onAction(plan, "resume")}>Resume</button>}{["active", "paused"].includes(plan.status) && <><button className="small-action" onClick={() => onAction(plan, "complete")}>Complete</button><button className="small-action danger-text" onClick={() => onAction(plan, "cancel")}>Cancel</button></>}</span></div>; })}</div></section>;
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
  async function lookup(event) { event.preventDefault(); setBusy(true); setError(""); setResult(null); try { setResult(await api("/api/exchange-rates/", { query: { from, to } })); } catch (err) { setError(formErrorMessage(err)); } finally { setBusy(false); } }
  return <div className="page-content"><div className="page-intro"><div><h1>Exchange rates</h1><p className="muted-text">Check the live rate used for cross-currency transfers.</p></div></div><section className="exchange-panel"><div className="exchange-panel-head"><BadgeDollarSign size={22} /><div><h2>Look up a rate</h2><p>Rates are retrieved from the exchange-rate service configured by Budgetly.</p></div></div><form className="exchange-form" onSubmit={lookup}><label className="field"><span>From</span><select value={from} onChange={(e) => setFrom(e.target.value)}><option>KES</option><option>USD</option></select></label><ArrowRight className="exchange-arrow" size={20} /><label className="field"><span>To</span><select value={to} onChange={(e) => setTo(e.target.value)}><option>USD</option><option>KES</option></select></label><button className="primary-button" disabled={busy || from === to}>{busy ? "Checking…" : "Get current rate"}</button></form>{error && <p className="form-message form-message-error" role="alert">{error}</p>}{result && <div className="rate-result"><span>1 {result.from} equals</span><strong>{Number(result.rate).toLocaleString(undefined, { maximumFractionDigits: 6 })} {result.to}</strong><small>Source: {result.source} · checked just now. Transfer records keep their original rate.</small></div>}</section><p className="muted-text exchange-note">For transfers, Budgetly records the conversion rate and received amount at the time you create the transfer.</p></div>;
}

function SettingsPage({ profile, theme, onThemeChange, onReopenOnboarding, onProfileChange, onLogout, navigate }) {
  const [form, setForm] = useState({ first_name: profile?.first_name || "", last_name: profile?.last_name || "", email: profile?.email || "", username: profile?.username || "" });
  const [password, setPassword] = useState({ old_password: "", new_password: "", confirm_password: "" });
  const [deleteForm, setDeleteForm] = useState({ password: "", confirmation: "" });
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  async function downloadExport() {
    setBusy(true); setError(""); setNotice("");
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
    } catch (err) { setError(formErrorMessage(err)); }
    finally { setBusy(false); }
  }
  async function saveProfile(event) { event.preventDefault(); setBusy(true); setError(""); setNotice(""); try { const updated = await api("/api/auth/profile/", { method: "PATCH", body: jsonBody({ first_name: form.first_name, last_name: form.last_name, email: form.email }) }); onProfileChange(updated); setNotice("Profile updated."); } catch (err) { setError(formErrorMessage(err)); } finally { setBusy(false); } }
  async function changePassword(event) { event.preventDefault(); setBusy(true); setError(""); setNotice(""); try { await api("/api/auth/change-password/", { method: "POST", body: jsonBody(password) }); setPassword({ old_password: "", new_password: "", confirm_password: "" }); setNotice("Password changed."); } catch (err) { setError(formErrorMessage(err)); } finally { setBusy(false); } }
  async function deleteAccount(event) { event.preventDefault(); if (deleteForm.confirmation !== "DELETE") return; setBusy(true); setError(""); try { await api("/api/auth/delete-account/", { method: "DELETE", body: jsonBody({ password: deleteForm.password }) }); sessionStorage.removeItem("budgetly.access"); sessionStorage.removeItem("budgetly.refresh"); onLogout("/logout"); } catch (err) { setError(formErrorMessage(err)); } finally { setBusy(false); } }
  return <div className="page-content"><div className="page-intro"><div><h1>Settings</h1><p className="muted-text">Manage the personal details and sign-in credentials on your account.</p></div></div>{notice && <p className="inline-notice" role="status"><Check size={16} />{notice}</p>}{error && <p className="form-message form-message-error" role="alert">{error}</p>}<div className="settings-grid"><section className="settings-section"><div className="section-heading"><div><h2>Personal details</h2><p>Your profile information</p></div></div><form className="settings-form" onSubmit={saveProfile}><label className="field"><span>Username</span><input value={form.username} disabled /></label><div className="form-row"><label className="field"><span>First name</span><input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></label><label className="field"><span>Last name</span><input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /></label></div><label className="field"><span>Email address</span><input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label><button className="primary-button" disabled={busy}>Save profile</button></form></section><section className="settings-section"><div className="section-heading"><div><h2>Password & security</h2><p>Change a known password or reset one you’ve forgotten.</p></div></div><form className="settings-form" onSubmit={changePassword}><PasswordInput label="Current password" value={password.old_password} onChange={(value) => setPassword({ ...password, old_password: value })} /><PasswordInput label="New password" value={password.new_password} onChange={(value) => setPassword({ ...password, new_password: value })} /><PasswordInput label="Confirm new password" value={password.confirm_password} onChange={(value) => setPassword({ ...password, confirm_password: value })} /><button className="secondary-button" disabled={busy}>Update password</button></form><button className="settings-reset-link" type="button" onClick={() => navigate("/forgot-password")}>Forgot your password? Reset it <ArrowRight size={15} /></button><div className="settings-session"><h3>Session</h3><p>The app stores this session’s tokens in this browser tab. Signing out sends the refresh token to Budgetly’s revocation endpoint.</p><button className="text-button danger-text" onClick={() => onLogout("/logout")}>Sign out <ArrowRight size={15} /></button></div></section><section className="settings-section"><div className="section-heading"><div><h2>Appearance</h2><p>Choose how Budgetly looks on this device.</p></div></div><div className="settings-form"><label className="field"><span>Theme</span><select value={theme} onChange={(event) => onThemeChange(event.target.value)}><option value="light">Light · warm paper</option><option value="dark">Dark · forest night</option></select></label><button type="button" className="text-button" onClick={onReopenOnboarding}>Reopen getting started guide <ArrowRight size={15} /></button></div></section><section className="settings-section"><div className="section-heading"><div><h2>Your data</h2><p>Save a copy of your Budgetly records as JSON.</p></div></div><div className="settings-form"><p className="muted-text">The export downloads to this device and may contain sensitive financial information. Store it somewhere private.</p><button type="button" className="secondary-button" onClick={downloadExport} disabled={busy}>{busy ? "Preparing export…" : "Download my data"}</button></div></section></div><section className="delete-account-section"><h2>Delete account</h2><p>This permanently removes your Budgetly account and its associated records. Enter your password and type DELETE to continue.</p><form className="settings-form" onSubmit={deleteAccount}><PasswordInput label="Password" value={deleteForm.password} onChange={(value) => setDeleteForm({ ...deleteForm, password: value })} /><label className="field"><span>Type DELETE to confirm</span><input value={deleteForm.confirmation} onChange={(e) => setDeleteForm({ ...deleteForm, confirmation: e.target.value })} required /></label><button className="danger-button" disabled={busy || deleteForm.confirmation !== "DELETE"}>Delete account and records</button></form></section></div>;
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

function PasswordInput({ label, value, onChange }) { return <label className="field"><span>{label}</span><input type="password" minLength={8} required={label !== "Current password"} value={value} onChange={(e) => onChange(e.target.value)} autoComplete="new-password" /></label>; }

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
function LoadingState({ label }) { return <div className="loading-state"><LoaderCircle size={19} className="spin" /><span>{label}…</span></div>; }
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
