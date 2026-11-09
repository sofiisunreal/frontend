import { useState } from "react";
import { ArrowRight, Download, FileText, ShieldCheck, UserRoundX } from "lucide-react";
import { LoadingButton } from "../Loading";
import { friendlyErrorMessage, focusFormError } from "../../lib/errors";
import { ErrorNotice } from "../FormFeedback";
import { policyDate, policyLink, policyPairKey } from "../../legal/policyRecords";
import { proposedDraftMetadata } from "../../legal/draftMetadata";

export default function LegalUpdateReview(props) {
  const key = policyPairKey(props.documents);
  return <Review key={key} {...props} />;
}

function Review({ documents, update = null, onAgree = null, navigate, signedIn = false, acceptances = {} }) {
  const [termsAgreed, setTermsAgreed] = useState(false), [privacyAcknowledged, setPrivacyAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const requested = update?.acceptance_required === true && documents?.terms && documents?.privacy;
  const canAgree = requested && typeof onAgree === "function";
  const available = documents?.terms && documents?.privacy ? "active documents" : "proposed documents";
  async function agree(event) {
    event.preventDefault();setError("");
    const submittedForm = event.currentTarget;
    if (!canAgree || !termsAgreed || !privacyAcknowledged || busy) return;
    setBusy(true);
    try { await onAgree({ terms: documents.terms, privacy: documents.privacy }); }
    catch (requestError) { setTermsAgreed(false);setPrivacyAcknowledged(false);setError(friendlyErrorMessage(requestError, { context: "legalAccept" }));focusFormError(submittedForm); }
    finally { setBusy(false); }
  }
  return <div className="legal-update-content">
    <section className="legal-update-intro" aria-labelledby="legal-update-title"><span className="legal-status">{requested ? "Review requested" : "Review only"}</span><h2 id="legal-update-title">{requested ? "A clear look at what’s changed." : "Your documents. Your choices."}</h2><p>{requested ? "Read both documents before deciding. Your export and account-deletion settings remain accessible while you review." : `The ${available} are available to review. This page does not record agreement or restrict your account.`}</p></section>
    <div className="legal-document-cards">{[["terms", "Terms of Service", FileText], ["privacy", "Privacy Policy", ShieldCheck]].map(([type, label, Icon]) => <a key={type} href={policyLink(type, documents?.[type])} className="legal-document-card"><Icon size={22} aria-hidden="true" /><span><strong>{label}</strong><small>{documents?.[type] ? `Version ${documents[type].version}` : `Unpublished · v${proposedDraftMetadata.version}`}</small>{documents?.[type] && <small>Effective <time dateTime={documents[type].effective_at}>{policyDate(documents[type].effective_at)}</time></small>}{acceptances[type] && <small>Agreement saved · <time dateTime={acceptances[type].accepted_at}>{policyDate(acceptances[type].accepted_at)}</time></small>}</span><ArrowRight size={18} aria-hidden="true" /></a>)}</div>
    {requested && <section className="legal-change-summary" aria-labelledby="legal-changes-title"><h3 id="legal-changes-title">What changed</h3>{typeof update.change_summary === "string" && update.change_summary.trim() ? <p>{update.change_summary}</p> : <p>A change summary has not been provided. Please read both documents in full.</p>}</section>}
    {canAgree ? <form className="legal-agreement-form" onSubmit={agree}>
      <fieldset disabled={busy}><legend>Your explicit agreement</legend><label><input type="checkbox" checked={termsAgreed} onChange={event => setTermsAgreed(event.target.checked)} required /><span>I agree to the Terms of Service, version {documents.terms.version}.</span></label><label><input type="checkbox" checked={privacyAcknowledged} onChange={event => setPrivacyAcknowledged(event.target.checked)} required /><span>I acknowledge the Privacy Policy, version {documents.privacy.version}.</span></label></fieldset>
      <ErrorNotice message={error} />
      <LoadingButton type="submit" className="primary-button" busy={busy} disabled={!termsAgreed || !privacyAcknowledged} loadingLabel="Submitting agreement…">Submit my agreement<ArrowRight size={17} /></LoadingButton>
    </form> : requested && <p className="legal-notice" role="note">Agreement cannot be recorded from this page yet. You can still review the documents and access your data settings.</p>}
    <section className="legal-data-choices" aria-labelledby="legal-data-choices-title"><div><h3 id="legal-data-choices-title">Your data choices stay available.</h3><p>{signedIn ? "Settings contains your JSON export and password-confirmed account deletion. Reviewing these documents does not require you to agree first." : "Sign in to access the data export and account-deletion options in Settings. This page does not request agreement before you can sign in."}</p></div><div className="legal-choice-links"><button type="button" onClick={() => navigate("/settings")}><Download size={18} aria-hidden="true" /><span>Open data export settings</span><ArrowRight size={16} /></button><button type="button" onClick={() => navigate("/settings")}><UserRoundX size={18} aria-hidden="true" /><span>Open account deletion settings</span><ArrowRight size={16} /></button></div></section>
  </div>;
}
