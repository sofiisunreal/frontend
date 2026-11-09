import BrandMark from "./BrandMark";

// The three ledger strokes fade gently; no rotation, travel or implied percentage.
export function ProgressMark() {
  return <span className="orbit-progress" aria-hidden="true"><i /><i /><i /></span>;
}

export function InlineLoading({ children, className = "" }) {
  return <span className={`orbit-inline-loading ${className}`} role="status" aria-live="polite" aria-atomic="true"><ProgressMark /><span>{children}</span></span>;
}

export function LoadingButton({ busy, loadingLabel = "Saving…", children, className = "", disabled, announce = true, ...props }) {
  return <><button {...props} className={`${className} orbit-loading-button`} disabled={disabled || busy} aria-busy={busy || undefined} data-loading={busy || undefined}>
    <span className="orbit-button-content"><span className="orbit-button-rest" aria-hidden={busy || undefined}>{children}</span><span className="orbit-button-pending" aria-hidden={!busy}><ProgressMark />{loadingLabel}</span></span>
  </button>{announce && <span className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">{busy ? loadingLabel : ""}</span>}</>;
}

export function StartupLoading() {
  return <main className="orbit-loading-screen session-loading" aria-labelledby="startup-title">
    <div className="orbit-startup-card">
      <div className="orbit-startup-brand"><BrandMark size={43} /><span>budgetly<span className="orbit-brand-dot">.</span></span></div>
      <div className="orbit-startup-caption"><h1 id="startup-title">Opening your workspace</h1><p>Your money. A little more clarity.</p></div>
      <InlineLoading className="orbit-startup-status">Connecting to Budgetly…</InlineLoading>
    </div>
  </main>;
}

function Skeleton({ className = "" }) {
  return <span className={`orbit-skeleton ${className}`} />;
}

function LoadingRegion({ label, className = "", children }) {
  return <><span className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">{label}</span><div className={`orbit-loading-region ${className}`} aria-busy="true"><div className="orbit-skeleton-content" aria-hidden="true">{children}</div></div></>;
}

function SkeletonRows({ count = 3, amount = true }) {
  return <div className="orbit-skeleton-rows">{Array.from({ length: count }, (_, index) => <div className="orbit-skeleton-row" key={index}><Skeleton className="sk-date" /><span className="sk-row-copy"><Skeleton className="sk-title" /><Skeleton className="sk-meta" /></span>{amount && <Skeleton className="sk-amount" />}</div>)}</div>;
}

function BalanceSkeleton() {
  return <><div className="sk-balances">{[0, 1].map(index => <div className="sk-balance" key={index}><Skeleton className="sk-currency" /><Skeleton className="sk-balance-amount" /></div>)}</div><Skeleton className="sk-footnote" /></>;
}

function CashFlowSkeleton() {
  return <><div className="orbit-cashflow-content sk-cashflow"><div className="orbit-flow-summary"><p>Net cash flow</p><Skeleton className="sk-financial" /><p className="orbit-flow-copy">Your recorded income,<br />less your expenses.</p></div><div className="orbit-flow-chart">{["Income", "Expenses"].map(label => <div className="orbit-flow-column" key={label}><Skeleton className="sk-bar-value" /><div className="sk-chart-void" /><span className="orbit-bar-label">{label}</span></div>)}</div></div><div className="orbit-card-foot"><Skeleton className="sk-meta" /></div></>;
}

function SpendingSkeletonContent() {
  return <><div className="sk-ring"><Skeleton className="sk-ring-total" /></div><div className="sk-legend">{[0, 1, 2].map(index => <div key={index}><Skeleton className="sk-title" /><Skeleton className="sk-amount" /></div>)}</div></>;
}

export function DashboardLoading() {
  return <LoadingRegion label="Loading your overview…" className="dashboard-loading"><div className="orbit-bento">
    <section className="orbit-card dashboard-ledger"><div className="dashboard-section-head"><h2>Account balances</h2></div><BalanceSkeleton /></section>
    <section className="orbit-card dashboard-month"><div className="dashboard-section-head"><h2>Monthly cash flow</h2></div><CashFlowSkeleton /></section>
    <section className="orbit-card dashboard-spending"><div className="dashboard-section-head"><h2>Spending mix</h2></div><p className="orbit-card-description">Spending by category</p><SpendingSkeletonContent /></section>
    <section className="orbit-card dashboard-activity"><div className="dashboard-section-head"><h2>Recent activity</h2></div><p className="orbit-card-description">The latest in your money story.</p><SkeletonRows /><Skeleton className="sk-footnote" /></section>
    <section className="orbit-card dashboard-plans"><div className="dashboard-section-head"><h2>Plans & commitments</h2></div><p className="orbit-card-description">For the bigger picture.</p><div className="dashboard-plan-links sk-plan-links">{["Active budgets", "Savings goals", "Open loans"].map(label => <div key={label}><span>{label}</span><Skeleton className="sk-count" /></div>)}</div><Skeleton className="sk-footnote" /></section>
  </div></LoadingRegion>;
}

export function SpendingLoading() {
  return <LoadingRegion label="Loading category spending…" className="orbit-spending-loading"><SpendingSkeletonContent /></LoadingRegion>;
}

export function FeedbackLoading() {
  return <LoadingRegion label="Loading your feedback…" className="orbit-feedback-loading"><SkeletonRows count={2} amount={false} /></LoadingRegion>;
}

export function ResourceLoading({ screen, title, columns }) {
  const loan = screen === "Loans";
  return <LoadingRegion label={`Loading ${title.toLowerCase()}…`} className={`orbit-resource-loading ${loan ? "orbit-loans-loading" : ""}`}><section className="resource-collection">
    <div className="resource-collection-heading"><h2>{loan ? "Your loan agreements" : screen === "Accounts" ? "Your accounts" : screen === "Transactions" ? "Your activity" : title}</h2><Skeleton className="sk-meta" /></div>
    {loan ? <div className="loan-records">{[0, 1].map(index => <article className="loan-record sk-loan" key={index}><div className="sk-loan-identity"><Skeleton className="sk-avatar" /><div><Skeleton className="sk-title" /><Skeleton className="sk-meta" /><Skeleton className="sk-agreement" /></div></div><div className="sk-loan-balance"><span>Total outstanding</span><Skeleton className="sk-loan-total" /><div className="sk-principal"><span>Principal<Skeleton /></span><span>Interest<Skeleton /></span></div><Skeleton className="sk-meta" /></div><div className="sk-loan-footer"><Skeleton className="sk-meta" /><Skeleton className="sk-action" /></div></article>)}</div> : <div className="table-wrap"><table className="data-table"><thead><tr>{columns.map(column => <th className={`record-col-${column.key}`} key={column.key}>{column.label}</th>)}<th><span className="visually-hidden">Actions</span></th></tr></thead><tbody>{Array.from({ length: screen === "Accounts" ? 2 : 4 }, (_, index) => <tr key={index}>{columns.map(column => <td className={`record-col-${column.key}`} data-label={column.label} key={column.key}><Skeleton className={["name", "description"].includes(column.key) ? "sk-title" : "sk-cell"} />{["name", "description"].includes(column.key) && <Skeleton className="sk-meta" />}</td>)}<td className="row-actions" data-label="Actions"><Skeleton className="sk-action" /></td></tr>)}</tbody></table></div>}
  </section>{screen === "Savings goals" && <><section className="plans-section"><div className="section-heading"><div><h2>Saving plans</h2><p>Contribution schedules linked to your goals</p></div></div><SkeletonRows count={2} /></section><section className="plans-section"><div className="section-heading"><div><h2>Goal activity</h2><p>Contributions and withdrawals recorded against your goals</p></div></div><SkeletonRows count={2} /></section></>}</LoadingRegion>;
}
