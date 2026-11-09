import { ArrowRight, FileText } from "lucide-react";
import { useAccountLegal } from "../../legal/policyRecords";

export default function LegalUpdateNotice({ navigate, screen }) {
  const legal = useAccountLegal();
  if (screen === "Legal updates" || legal?.status !== "ready" || !legal.acceptanceRequired) return null;
  return <aside className="legal-update-notice" aria-label="Legal policy update"><FileText size={19} aria-hidden="true" /><p><strong>Updated legal documents are ready to review.</strong><span>Your workspace and data settings remain available.</span></p><a href="/legal-updates" onClick={event => { if (!event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) { event.preventDefault();navigate("/legal-updates"); } }}>Review documents<ArrowRight size={16} aria-hidden="true" /></a></aside>;
}
