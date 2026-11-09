import { useEffect } from "react";
import { InlineLoading } from "../Loading";
import { useAccountLegal, usePolicies } from "../../legal/policyRecords";
import LegalUpdateReview from "./LegalUpdateReview";

export default function ConnectedLegalReview({ navigate, signedIn }) {
  const policies = usePolicies(), legal = useAccountLegal();
  const refresh = legal?.refresh;
  useEffect(() => { if (refresh) Promise.resolve().then(refresh); }, [refresh]);
  const ready = legal?.status === "ready";
  return <>
    {legal?.status === "loading" && <InlineLoading>Checking your legal update status…</InlineLoading>}
    {legal?.status === "error" && <div className="legal-notice legal-status-error" role="alert"><p>Your acceptance status could not be checked. {legal.error}</p><button className="legal-text-link" type="button" onClick={refresh}>Check status again</button></div>}
    {legal?.message && <p className="legal-notice legal-status-message" role="status">{legal.message}</p>}
    {ready && !legal.acceptanceRequired && <p className="legal-notice legal-status-message" role="status">Your agreement is recorded for both current documents.</p>}
    {!signedIn && policies.status === "active" && <p className="legal-notice legal-status-message">Sign in to check your legal update status and record your own agreement.</p>}
    {legal?.status === "inactive" && <p className="legal-notice legal-status-message">Official documents are not available for acceptance yet. The local working drafts remain available for review.</p>}
    {ready && <button className="legal-text-link legal-status-refresh" type="button" onClick={() => refresh()}>Check latest legal status</button>}
    <LegalUpdateReview documents={ready ? legal.documents : policies.documents} update={ready ? { acceptance_required: legal.acceptanceRequired } : null} acceptances={ready ? legal.acceptances : {}} onAgree={ready ? legal.accept : null} navigate={navigate} signedIn={signedIn} />
  </>;
}
