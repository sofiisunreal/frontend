import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BookOpen, Search } from "lucide-react";
import { api, asList, formErrorMessage, jsonBody } from "../lib/api";

const topics = [
  { title: "Getting started", section: "Start here", keywords: "welcome first account category transaction", copy: "Start by adding an account, then create a personal category and record a transaction. The overview uses saved records from your Budgetly account; it does not add sample records.", links: [{ label: "Open the getting started guide", action: "onboarding" }, { label: "Add an account", path: "/accounts?new=1" }, { label: "Create a category", path: "/categories?new=1" }] },
  { title: "Create and manage accounts", section: "Accounts and activity", keywords: "cash bank mobile money edit archive balance", copy: "Accounts represent places where you keep money, such as cash, a bank account or mobile money. Open Accounts to add, edit or deactivate an account. Transactions need an active account.", links: [{ label: "Open accounts", path: "/accounts" }] },
  { title: "Starting balances", section: "Accounts and activity", keywords: "opening balance initial current", copy: "Enter the account's current balance when you create it. Budgetly uses that starting balance as the baseline for the account; do not also record earlier activity unless you want that history reflected in your records.", links: [{ label: "Add an account", path: "/accounts?new=1" }] },
  { title: "Create categories", section: "Accounts and activity", keywords: "income expense default", copy: "Categories label income and expenses. Budgetly provides shared default categories and lets you add personal categories. Shared defaults can be selected but cannot be edited or deleted.", links: [{ label: "Manage categories", path: "/categories" }] },
  { title: "Record income and expenses", section: "Accounts and activity", keywords: "transaction payment spending", copy: "Add a transaction, choose an account and category, set its type, amount and date, then save. The overview and category spending view update from saved transactions.", links: [{ label: "Record a transaction", path: "/transactions?new=1" }, { label: "View transactions", path: "/transactions" }] },
  { title: "Transfer between your accounts", section: "Accounts and activity", keywords: "move transfer exchange conversion rate", copy: "Use Transfers to move money between accounts you own. A transfer is tracked separately from income and expenses. When currencies differ, the conversion details are recorded with the transfer.", links: [{ label: "Create a transfer", path: "/transfers?new=1" }] },
  { title: "Use budgets", section: "Plans and goals", keywords: "limit category period spending", copy: "Create a budget for a category and period to compare planned spending with recorded expenses. Budgets are plans; they do not move or reserve money.", links: [{ label: "Manage budgets", path: "/budgets" }] },
  { title: "Savings goals and contributions", section: "Plans and goals", keywords: "target deposit withdrawal progress", copy: "Create a savings goal with a target, then record contributions or withdrawals to update its progress. A goal tracks your plan; it does not create a separate bank account.", links: [{ label: "Manage savings goals", path: "/savings" }] },
  { title: "Loans and repayments", section: "Plans and goals", keywords: "borrow lend repayment installment", copy: "Record whether you lent or borrowed, the amount and the other details. Add repayments from the loan page to keep the remaining balance current.", links: [{ label: "Manage loans", path: "/loans" }] },
  { title: "KSh and USD", section: "Currency", keywords: "KES Kenya dollars exchange rate currencies", copy: "Accounts keep their selected currency, shown as KSh for KES or USD. The overview groups balances and activity by currency rather than combining unlike amounts. Exchange rates can be looked up on the Exchange rates page; transfers preserve their recorded conversion details.", links: [{ label: "Exchange rates", path: "/exchange-rates" }, { label: "Accounts", path: "/accounts" }] },
  { title: "Change your password or recover access", section: "Account and access", keywords: "forgot reset email password token", copy: "If you can sign in, change your password in Settings. If you forgot it, use the password reset form and enter the email on your account. The backend must have working email delivery and the correct frontend reset URL configured for the message to arrive and open correctly.", links: [{ label: "Password and security settings", path: "/settings" }, { label: "Reset a forgotten password", path: "/forgot-password" }] },
  { title: "Profile and settings", section: "Account and access", keywords: "name email appearance theme light dark sign out", copy: "Settings lets you update your name and email, change your password, choose the light or dark theme, reopen this guide, sign out or request account deletion. Account deletion removes associated records.", links: [{ label: "Open settings", path: "/settings" }] },
  { title: "Common problems", section: "Troubleshooting", keywords: "connection loading login saved error category", copy: "If a page cannot load, check your connection and retry. If a transaction form has no suitable category or account, add one first. If you change your profile email, use that address for future password resets. For a missing reset email, check spam and confirm the backend email and reset-link configuration with whoever manages the deployment.", links: [{ label: "Accounts", path: "/accounts" }, { label: "Categories", path: "/categories" }, { label: "Settings", path: "/settings" }] },
];

export default function HelpPage({ navigate, onReopenOnboarding }) {
  const [query, setQuery] = useState("");
  const [feedback, setFeedback] = useState({ category: "bug", title: "", description: "" });
  const [feedbackBusy, setFeedbackBusy] = useState(false);
  const [feedbackError, setFeedbackError] = useState("");
  const [feedbackNotice, setFeedbackNotice] = useState("");
  const [feedbackItems, setFeedbackItems] = useState([]);
  const [feedbackLoading, setFeedbackLoading] = useState(true);
  const [feedbackLoadError, setFeedbackLoadError] = useState("");
  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    return topics.filter((topic) => !term || `${topic.title} ${topic.section} ${topic.keywords} ${topic.copy}`.toLocaleLowerCase().includes(term));
  }, [query]);
  const groups = [...new Set(filtered.map((topic) => topic.section))];
  useEffect(() => {
    let active = true;
    api("/api/feedback/").then((response) => {
      if (active) setFeedbackItems((current) => {
        const itemsById = new Map([...asList(response), ...current].map((item) => [item.id, item]));
        return [...itemsById.values()].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      });
    }).catch((error) => {
      if (active) setFeedbackLoadError(formErrorMessage(error));
    }).finally(() => {
      if (active) setFeedbackLoading(false);
    });
    return () => { active = false; };
  }, []);

  async function submitFeedback(event) {
    event.preventDefault();
    setFeedbackError("");
    setFeedbackNotice("");
    const title = feedback.title.trim();
    const description = feedback.description.trim();
    if (!title || !description) {
      setFeedbackError(!title && !description ? "Add a title and description." : !title ? "Add a title for your feedback." : "Add a description for your feedback.");
      return;
    }
    setFeedbackBusy(true);
    try {
      const savedFeedback = await api("/api/feedback/", { method: "POST", body: jsonBody({ category: feedback.category, title, description }) });
      setFeedbackItems((current) => [savedFeedback, ...current]);
      setFeedbackLoadError("");
      setFeedbackLoading(false);
      setFeedback({ category: "bug", title: "", description: "" });
      setFeedbackNotice("Thank you. Your feedback has been sent to Budgetly.");
    } catch (error) {
      setFeedbackError(formErrorMessage(error));
    } finally {
      setFeedbackBusy(false);
    }
  }
  return <div className="page-content help-page">
    <div className="page-intro"><div><h1>Help, when you need it.</h1><p className="muted-text">Short guides to the main parts of Budgetly and what your saved financial records mean.</p></div><button className="secondary-button" onClick={onReopenOnboarding}><BookOpen size={16} />Getting started</button></div>
    <label className="help-search"><Search size={18} aria-hidden="true" /><span className="visually-hidden">Search help topics</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search accounts, transfers, passwords…" /></label>
    {filtered.length ? groups.map((section) => <section className="help-section" key={section}><div className="section-heading"><div><h2>{section}</h2><p>{filtered.filter((topic) => topic.section === section).length} guide{filtered.filter((topic) => topic.section === section).length === 1 ? "" : "s"}</p></div></div><div className="help-topics">{filtered.filter((topic) => topic.section === section).map((topic) => <article className="help-topic" key={topic.title}><h3>{topic.title}</h3><p>{topic.copy}</p><div>{topic.links.map((link) => <button key={link.label} className="help-link" onClick={() => link.action === "onboarding" ? onReopenOnboarding() : navigate(link.path)}>{link.label}<ArrowRight size={14} /></button>)}</div></article>)}</div></section>) : <div className="help-no-results"><h2>No matching guides</h2><p>Try a shorter search, such as “account” or “password”.</p></div>}
    <section className="feedback-section" aria-labelledby="feedback-title"><div className="section-heading"><div><h2 id="feedback-title">Send feedback</h2><p>Report a problem, suggest an improvement, or share a general thought.</p></div></div>{feedbackError && <p className="form-message form-message-error" role="alert">{feedbackError}</p>}{feedbackNotice && <p className="form-message form-message-success" role="status">{feedbackNotice}</p>}<form className="feedback-form" onSubmit={submitFeedback}><label className="field"><span>Type</span><select value={feedback.category} onChange={(event) => setFeedback({ ...feedback, category: event.target.value })}><option value="bug">Bug report</option><option value="feature">Feature request</option><option value="general">General feedback</option></select></label><label className="field"><span>Title</span><input value={feedback.title} maxLength={150} required onChange={(event) => { setFeedback({ ...feedback, title: event.target.value }); setFeedbackError(""); }} placeholder="A short summary" /></label><label className="field"><span>Description</span><textarea value={feedback.description} maxLength={4000} required onChange={(event) => { setFeedback({ ...feedback, description: event.target.value }); setFeedbackError(""); }} placeholder="What happened, what you expected, or what would help?" /></label><button className="primary-button" disabled={feedbackBusy}>{feedbackBusy ? "Sending…" : "Send feedback"}<ArrowRight size={16} /></button></form>
      <div className="my-feedback" aria-labelledby="my-feedback-title"><div className="section-heading"><div><h3 id="my-feedback-title">My feedback</h3><p>Only feedback submitted from your account is shown here.</p></div></div>{feedbackLoading ? <p className="muted-text" role="status">Loading your feedback…</p> : feedbackLoadError ? <p className="form-message form-message-error" role="alert">{feedbackLoadError}</p> : feedbackItems.length ? <ul className="feedback-history">{feedbackItems.map((item) => <li key={item.id}><div><strong>{item.title}</strong><span>{item.category === "bug" ? "Bug report" : item.category === "feature" ? "Feature request" : "General feedback"} · {formatFeedbackDate(item.created_at)}</span></div><p>{item.description}</p></li>)}</ul> : <p className="muted-text">You haven’t sent feedback yet.</p>}</div>
    </section>
  </div>;
}

function formatFeedbackDate(value) {
  if (!value) return "Just now";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Recently" : new Intl.DateTimeFormat("en-KE", { dateStyle: "medium" }).format(date);
}
