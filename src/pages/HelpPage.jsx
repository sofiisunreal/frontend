import { FeedbackLoading, LoadingButton } from "../components/Loading";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, BookOpen, ChevronDown, HandCoins, Search, ShieldCheck, Target, Wallet, X } from "lucide-react";
import { api, asList, formErrorMessage, jsonBody } from "../lib/api";
import { focusFormError, nativeValidationMessage, normalizeError } from "../lib/errors";
import { ErrorNotice, FieldError } from "../components/FormFeedback";
import { LIFETIME_PRICE_LABEL } from "../lib/billingState.js";

const topics = [
  { title: "Getting started", section: "Start here", keywords: "welcome first account category transaction payment lifetime price", copy: `Create your account and sign in, then unlock lifetime access for ${LIFETIME_PRICE_LABEL} once. Account creation does not include a purchase. After unlocking, add an account, create a personal category and record a transaction. The overview uses saved records from your Budgetly account; it does not add sample records.`, links: [{ label: "Check lifetime access", path: "/payment-required" }, { label: "Open the getting started guide", action: "onboarding" }, { label: "Add an account", path: "/accounts?new=1" }, { label: "Create a category", path: "/categories?new=1" }] },
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

const helpGroups = [
  { id: "accounts", title: "Accounts & Transactions", copy: "Your everyday money, made clear.", icon: Wallet, matches: (topic) => topic.section === "Accounts and activity" },
  { id: "plans", title: "Budgets & Savings", copy: "Make room for what matters.", icon: Target, matches: (topic) => topic.section === "Plans and goals" && topic.title !== "Loans and repayments" },
  { id: "loans", title: "Loans & Repayments", copy: "Understand what is owed.", icon: HandCoins, matches: (topic) => topic.title === "Loans and repayments" },
  { id: "security", title: "Account & Security", copy: "Your profile, access and settings.", icon: ShieldCheck, matches: (topic) => topic.section === "Account and access" },
  { id: "more", title: "Currency & troubleshooting", copy: "A little extra clarity.", matches: (topic) => ["Currency", "Troubleshooting"].includes(topic.section) },
];

export default function HelpPage({ navigate, onReopenOnboarding }) {
  const [query, setQuery] = useState("");
  const [feedback, setFeedback] = useState({ category: "bug", title: "", description: "" });
  const [feedbackBusy, setFeedbackBusy] = useState(false);
  const [feedbackError, setFeedbackError] = useState("");
  const [feedbackFields, setFeedbackFields] = useState({}), [feedbackFormErrors, setFeedbackFormErrors] = useState([]);
  const [feedbackLoadAttempt, setFeedbackLoadAttempt] = useState(0);
  const [feedbackNotice, setFeedbackNotice] = useState("");
  const [feedbackItems, setFeedbackItems] = useState([]);
  const [feedbackLoading, setFeedbackLoading] = useState(true);
  const [feedbackLoadError, setFeedbackLoadError] = useState("");
  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    return topics.filter((topic) => !term || `${topic.title} ${topic.section} ${topic.keywords} ${topic.copy}`.toLocaleLowerCase().includes(term));
  }, [query]);
  const feedbackSection = useRef(null);
  const feedbackTitle = useRef(null);
  const searching = Boolean(query.trim());
  function clearSearch() {
    setQuery("");
    document.getElementById("help-search-input")?.focus();
  }
  const scrollTo = (element) => element?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  function openTopic(id) {
    setQuery("");
    requestAnimationFrame(() => {
      const heading = document.getElementById(`help-${id}`);
      scrollTo(heading);
      heading?.focus({ preventScroll: true });
    });
  }
  function openFeedback(category) {
    setFeedback((current) => ({ ...current, category }));
    requestAnimationFrame(() => {
      scrollTo(feedbackSection.current);
      feedbackTitle.current?.focus({ preventScroll: true });
    });
  }
  useEffect(() => {
    let active = true;
    api("/api/feedback/").then((response) => {
      if (active) setFeedbackItems((current) => {
        const itemsById = new Map([...asList(response), ...current].map((item) => [item.id, item]));
        return [...itemsById.values()].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      });
    }).catch((error) => {
      if (active) setFeedbackLoadError(formErrorMessage(error, { context: "feedbackLoad" }));
    }).finally(() => {
      if (active) setFeedbackLoading(false);
    });
    return () => { active = false; };
  }, [feedbackLoadAttempt]);

  async function submitFeedback(event) {
    event.preventDefault();
    const submittedForm = event.currentTarget;
    setFeedbackFields({});setFeedbackFormErrors([]);
    setFeedbackError("");
    setFeedbackNotice("");
    const title = feedback.title.trim();
    const description = feedback.description.trim();
    if (!title || !description) {
      setFeedbackFields({ ...(!title ? { title: "Add a title for your feedback." } : {}), ...(!description ? { description: "Add a description for your feedback." } : {}) });setFeedbackError("Please check the highlighted details.");focusFormError(submittedForm);
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
      const result = normalizeError(error, { context: "feedback", fields: { category: "Type", title: "Title", description: "Description" } });
      setFeedbackFields(result.fieldErrors);setFeedbackFormErrors(result.formErrors);setFeedbackError(result.message);focusFormError(submittedForm);
    } finally {
      setFeedbackBusy(false);
    }
  }
  const startingGuide = filtered.find((topic) => topic.section === "Start here");
  const renderLinks = (topic) => topic.links.map((link) => <button key={link.label} className="help-link" onClick={() => link.action === "onboarding" ? onReopenOnboarding() : navigate(link.path)}>{link.label}<ArrowRight size={14} aria-hidden="true" /></button>);
  return <div className={`page-content help-page orbit-help ${searching ? "help-searching" : ""}`}>
    <header className="help-hero">
      <div><h1>What can we help you with?</h1><p>Find your way around your money, plans and account.</p></div>
      <div className="help-search"><Search size={21} aria-hidden="true" /><label className="visually-hidden" htmlFor="help-search-input">Search help topics</label><input id="help-search-input" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search accounts, transfers, passwords…" aria-controls="help-content" />{searching && <button type="button" aria-label="Clear help search" onClick={clearSearch}><X size={17} /></button>}</div>
      <p className="help-search-caption" role="status" aria-live="polite">{searching ? `${filtered.length} matching guide${filtered.length === 1 ? "" : "s"}` : "A good place to start. A clear next step."}</p>
    </header>

    <nav className="help-topic-tiles" aria-label="Help topics">{helpGroups.slice(0, 4).map(({ id, title, copy, icon: Icon, matches }) => <button className={`help-topic-tile help-tile-${id}`} key={id} onClick={() => openTopic(id)}><Icon size={23} strokeWidth={1.6} aria-hidden="true" /><span className="help-tile-title">{title}</span><span className="help-tile-copy">{copy}</span><span className="help-tile-footer">{topics.filter(matches).length} guide{topics.filter(matches).length === 1 ? "" : "s"}<ArrowRight size={16} aria-hidden="true" /></span></button>)}</nav>

    <div id="help-content">
      {(startingGuide || !searching) && <div className={`help-welcome-grid ${!startingGuide ? "help-welcome-single" : ""}`}>
        {startingGuide && <section className="help-start" aria-labelledby="help-start-title"><div className="help-start-heading"><BookOpen size={21} strokeWidth={1.7} aria-hidden="true" /><h2 id="help-start-title">{startingGuide.title}</h2></div><p>{startingGuide.copy}</p><div className="help-start-actions">{renderLinks(startingGuide)}<button className="help-link" onClick={() => navigate("/transactions?new=1")}>Record a transaction<ArrowRight size={14} aria-hidden="true" /></button></div></section>}
        {!searching && <aside className="help-feedback-invite" aria-labelledby="help-invite-title"><h2 id="help-invite-title">Help shape Budgetly.</h2><p>Found a snag or have an idea? Send it straight from your account.</p><div>{[["general", "Send feedback"], ["bug", "Report a bug"], ["feature", "Suggest a feature"]].map(([category, label]) => <button key={category} onClick={() => openFeedback(category)}>{label}<ArrowRight size={16} aria-hidden="true" /></button>)}</div></aside>}
      </div>}

      {filtered.length ? <div className="help-library" aria-label="Help article library">{helpGroups.map((group) => {
        const articles = filtered.filter(group.matches);
        return articles.length ? <section className={`help-group help-group-${group.id}`} key={group.id} aria-labelledby={`help-${group.id}`}><div className="help-group-heading"><h2 id={`help-${group.id}`} tabIndex={-1}>{group.title}</h2><span>{articles.length} guide{articles.length === 1 ? "" : "s"}</span></div>{articles.map((topic) => <article className="help-article" key={topic.title}><details open={searching || undefined}><summary><h3>{topic.title}</h3><ChevronDown size={17} aria-hidden="true" /></summary><div className="help-article-body"><p>{topic.copy}</p><div>{renderLinks(topic)}</div></div></details></article>)}</section> : null;
      })}</div> : <div className="help-no-results"><h2>No matching guides</h2><p>Try a shorter search, such as “account” or “password”.</p><button className="secondary-button" onClick={clearSearch}>Clear search</button></div>}
    </div>

    <section ref={feedbackSection} className="feedback-section help-feedback-panel" aria-labelledby="feedback-title"><div className="help-feedback-heading"><h2 id="feedback-title">Send feedback</h2><p>Report a problem, suggest an improvement, or share a general thought.</p><span>Your feedback stays linked to your account.</span></div><div className="help-feedback-compose">
      {feedbackNotice && <p className="form-message form-message-success" role="status">{feedbackNotice}</p>}
      <form className="feedback-form" onSubmit={submitFeedback} onInvalid={event => { event.preventDefault();setFeedbackFields(current => ({ ...current, [event.target.name]: nativeValidationMessage(event.target) }));setFeedbackError("Please check the highlighted details.");focusFormError(event.target.form); }}>
        <ErrorNotice message={feedbackError} messages={feedbackFormErrors} />
        <label className="field"><span>Type</span><select name="category" value={feedback.category} aria-invalid={feedbackFields.category ? true : undefined} aria-describedby={feedbackFields.category ? "feedback-category-error" : undefined} onChange={event => { setFeedback({ ...feedback, category: event.target.value });setFeedbackFields(current => ({ ...current, category: "" })); }}><option value="bug">Bug report</option><option value="feature">Feature request</option><option value="general">General feedback</option></select><FieldError id="feedback-category-error" message={feedbackFields.category} /></label>
        <label className="field"><span>Title</span><input name="title" ref={feedbackTitle} value={feedback.title} maxLength={150} required aria-invalid={feedbackFields.title ? true : undefined} aria-describedby={feedbackFields.title ? "feedback-title-error" : undefined} onChange={event => { setFeedback({ ...feedback, title: event.target.value });setFeedbackError("");setFeedbackFields(current => ({ ...current, title: "" })); }} placeholder="A short summary" /><FieldError id="feedback-title-error" message={feedbackFields.title} /></label>
        <label className="field help-feedback-description"><span>Description</span><textarea name="description" value={feedback.description} maxLength={4000} required aria-invalid={feedbackFields.description ? true : undefined} aria-describedby={feedbackFields.description ? "feedback-description-error" : undefined} onChange={event => { setFeedback({ ...feedback, description: event.target.value });setFeedbackError("");setFeedbackFields(current => ({ ...current, description: "" })); }} placeholder="What happened, what you expected, or what would help?" /><FieldError id="feedback-description-error" message={feedbackFields.description} /></label>
        <LoadingButton className="primary-button" busy={feedbackBusy} loadingLabel="Sending feedback…">Send feedback<ArrowRight size={16} /></LoadingButton>
      </form>
    </div>

<div className="my-feedback" aria-labelledby="my-feedback-title"><div className="section-heading"><div><h3 id="my-feedback-title">My feedback</h3><p>Only feedback submitted from your account is shown here.</p></div></div>{feedbackLoading ? <FeedbackLoading /> : feedbackLoadError ? <div><ErrorNotice message={feedbackLoadError} /><button type="button" className="secondary-button" onClick={() => { setFeedbackLoadError("");setFeedbackLoading(true);setFeedbackLoadAttempt(value => value + 1); }}>Try again</button></div> : feedbackItems.length ? <ul className="feedback-history">{feedbackItems.map((item) => <li key={item.id}><div><strong>{item.title}</strong><span>{item.category === "bug" ? "Bug report" : item.category === "feature" ? "Feature request" : "General feedback"} · {formatFeedbackDate(item.created_at)}</span></div><p>{item.description}</p></li>)}</ul> : <p className="muted-text">You haven’t sent feedback yet.</p>}</div>
    </section>
  </div>;
}

function formatFeedbackDate(value) {
  if (!value) return "Just now";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Recently" : new Intl.DateTimeFormat("en-KE", { dateStyle: "medium" }).format(date);
}
