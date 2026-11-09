import { useEffect, useRef } from "react";
import { ArrowLeft, ArrowRight, FileText, Moon, Sun } from "lucide-react";
import BrandMark from "../components/BrandMark";
import { InlineLoading } from "../components/Loading";
import PolicyRecord from "../components/legal/PolicyRecord";
import ConnectedLegalReview from "../components/legal/ConnectedLegalReview";
import ProposedPolicySections from "../components/legal/ProposedPolicySections";
import { proposedDrafts } from "../legal/proposedDrafts";
import { policyLink, usePolicies } from "../legal/policyRecords";
import "../styles/orbit-public.css";
import "../styles/orbit-legal.css";

export default function LegalDraftPage({ path, navigate, theme, onThemeChange, embedded = false }) {
  const policies = usePolicies(), root = useRef(null);
  const pathname = path.split("?")[0], query = new URLSearchParams(window.location.search);
  const updates = pathname === "/legal-updates", type = pathname === "/terms-of-service" ? "terms" : "privacy";
  const draft = proposedDrafts[pathname] || proposedDrafts["/privacy-policy"];
  const requestedId = query.get("document"), requestedVersion = query.get("version");
  const candidate = policies.documents?.[type];
  // A valid active record takes precedence even when an old draft link is used.
  const record = candidate && (!requestedId || String(candidate.id) === requestedId) && (!requestedVersion || candidate.version === requestedVersion) ? candidate : null;
  const missingVersion = (requestedId || requestedVersion) && !record;
  const loading = policies.status === "loading";
  const showContents = !updates && !loading && !missingVersion;
  const useDraft = !updates && !record && !missingVersion && !loading;
  const title = updates ? "Legal updates" : record ? (type === "terms" ? "Terms of Service" : "Privacy Policy") : draft.title;
  const sections = useDraft ? draft.sections.map(({ heading }, index) => ({ id: `legal-section-${index + 1}`, title: heading })) : [{ id: updates ? "legal-update-title" : "legal-document-text", title: updates ? "Review & data choices" : "Document text" }];
  useEffect(() => { const previous = document.title;document.title = `${title} | Budgetly`;return () => { document.title = previous; }; }, [title]);
  function followLink(event) {
    const anchor = event.target.closest("a[href]");
    if (!anchor || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || anchor.target) return;
    const href = anchor.getAttribute("href");
    if (href.startsWith("/")) { event.preventDefault();navigate(href);return; }
    if (!href.startsWith("#")) return;
    const target = root.current.querySelector(href);
    if (!target) return;
    event.preventDefault();
    const disclosure = anchor.closest(".legal-toc-mobile");
    if (disclosure) disclosure.open = false;
    target.setAttribute("tabindex", "-1");target.focus({ preventScroll: true });
    target.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
  }
  const contents = <ol>{sections.map((section, index) => <li key={section.id}><a href={`#${section.id}`}><span>{String(index + 1).padStart(2, "0")}</span>{section.title}</a></li>)}</ol>;
  const Container = embedded ? "section" : "main";
  return <Container ref={root} className={`orbit-legal orbit-public ${embedded ? "legal-embedded" : ""}`} onClick={followLink} aria-labelledby="legal-page-title">
    {!embedded && <a className="legal-skip-link" href="#legal-reading">Skip to document</a>}
    <header className="legal-orbit-header"><a className="legal-orbit-brand" href="/welcome" aria-label="Budgetly homepage"><BrandMark size={32} /><span>budgetly<span>.</span></span></a><div className="legal-header-controls">{onThemeChange && <button type="button" aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`} onClick={() => onThemeChange(theme === "dark" ? "light" : "dark")}>{theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}</button>}<a href={embedded ? "/" : "/login"}>{embedded ? "Overview" : "Sign in"}<ArrowRight size={16} /></a></div></header>
    <div className="legal-orbit-wrap">
      <nav className="legal-document-tabs" aria-label="Legal documents">{[["privacy", "Privacy Policy"], ["terms", "Terms of Service"]].map(([key, label]) => <a key={key} href={policyLink(key, policies.documents?.[key])} aria-current={!updates && type === key ? "page" : undefined}>{label}</a>)}<a href="/legal-updates" aria-current={updates ? "page" : undefined}>Legal updates</a></nav>
      <div className="legal-hero"><div><span className="legal-kicker">Budgetly · {updates ? "Review & choices" : loading ? "Checking documents" : missingVersion ? "Requested version" : record ? "Official document" : "Unpublished document"}</span><h1 id="legal-page-title">{title}</h1><p>{updates ? "Read clearly. Decide freely. Keep access to your data." : record ? "The version and text below come from the verified policy record." : "A clear place to review how Budgetly works and how your information is handled."}</p></div><FileText size={54} strokeWidth={1} aria-hidden="true" /></div>
      <div className={`legal-reader-layout ${updates ? "legal-reader-updates" : !showContents ? "legal-reader-full" : ""}`}>
        {showContents && <><nav className="legal-toc" aria-label="On this page"><h2>On this page</h2>{contents}</nav><details className="legal-toc-mobile"><summary>Browse document sections</summary><nav aria-label="Document sections">{contents}</nav></details></>}
        <article className="legal-reading-surface" id="legal-reading" tabIndex={-1}>
          {updates ? <ConnectedLegalReview navigate={navigate} signedIn={embedded} /> : loading ? <InlineLoading>Loading official documents…</InlineLoading> : missingVersion ? <div className="legal-unavailable" role="alert"><h2>This version is unavailable.</h2><p>We cannot show the document you requested. A different version has not been substituted.</p><a className="legal-text-link" href={policyLink(type, candidate)}>View the {candidate ? "active document" : "proposed draft"}<ArrowRight size={16} /></a>{policies.refresh && <button type="button" className="legal-text-link" onClick={policies.refresh}>Check official documents again</button>}</div> : record ? <PolicyRecord record={record} /> : <>
            <aside className="legal-proposed-notice" role="note"><span className="legal-status">Unpublished v{draft.version} · Not active</span><h2>Awaiting first publication.</h2><p>This document is prepared for publication but is not yet published or active. Its effective date is {draft.effectiveDateLabel}.</p>{policies.status === "error" && <p role="alert">Official documents could not be verified. {policies.error}</p>}{policies.refresh && <button className="legal-text-link" type="button" onClick={policies.refresh}>Try official documents again<ArrowRight size={16} /></button>}</aside>
            <dl className="legal-record-meta"><div><dt>Version</dt><dd>{draft.versionLabel}</dd></div><div><dt>Status</dt><dd>Unpublished · Not active</dd></div><div><dt>Effective date</dt><dd>{draft.effectiveDateLabel}</dd></div></dl>
            <ProposedPolicySections draft={draft} />
          </>}
          {!updates && <footer className="legal-reader-footer"><a href={policyLink(type === "terms" ? "privacy" : "terms", policies.documents?.[type === "terms" ? "privacy" : "terms"])}>Read the {type === "terms" ? "Privacy Policy" : "Terms of Service"}<ArrowRight size={17} /></a><a href="/legal-updates">Your data choices<ArrowRight size={17} /></a></footer>}
        </article>
      </div>
      <footer className="legal-site-footer"><a href={embedded ? "/" : "/register"}><ArrowLeft size={15} />{embedded ? "Back to Overview" : "Back to create account"}</a><span>Budgetly · {record ? `Version ${record.version}` : "Working drafts for review"}</span></footer>
    </div>
  </Container>;
}
