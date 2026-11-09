import { policyDate, policyTypes } from "../../legal/policyRecords";

export default function PolicyRecord({ record }) {
  const effective = policyDate(record.effective_at), published = policyDate(record.published_at);
  return <section className="legal-official-record" aria-labelledby="official-policy-title">
    <div className="legal-record-heading"><span className="legal-status">Active official record</span><h2 id="official-policy-title">{policyTypes[record.document_type].title}</h2></div>
    <dl className="legal-record-meta"><div><dt>Version</dt><dd>{record.version}</dd></div><div><dt>Effective date</dt><dd>{effective ? <time dateTime={record.effective_at}>{effective}</time> : "Not supplied"}</dd></div><div><dt>Published</dt><dd>{published ? <time dateTime={record.published_at}>{published}</time> : "Not supplied"}</dd></div></dl>
    {!effective && <p className="legal-notice" role="note">An effective date has not been supplied for this record. The publication date is shown separately.</p>}
    {/* Literal text, not HTML. Preserve every character from the verified record. */}
    <div className="legal-canonical-text" id="legal-document-text">{record.content}</div>
    <details className="legal-record-fingerprint"><summary>Document fingerprint</summary><p>SHA-256</p><code>{record.content_sha256}</code></details>
  </section>;
}
