import { ArrowLeft, ArrowRight, FileText } from "lucide-react";

const documents = {
  "/privacy-policy": {
    title: "Privacy policy",
    eyebrow: "PRIVACY · DRAFT V0.1 · 31 OCT 2026",
    intro: "This draft describes the data flows visible in the current Budgetly frontend and backend source. It is incomplete and must be reviewed and completed before publication.",
    sections: [
      ["Who is responsible", "[Add the controller’s legal name, registration details, postal address and privacy contact. Confirm who operates Budgetly and who determines why and how personal data is used.]"],
      ["Information Budgetly handles", "The current service asks for a username, email address, name and password. It stores financial records you enter, including account names and starting balances, transactions, categories, transfers, budgets, savings goals and loans. The app also stores a light/dark preference and navigation preference in this browser. Authentication tokens are currently kept in session storage for this browser tab."],
      ["Why it is used", "The current product uses account information to provide sign-in, profile and password recovery, and uses financial records to display the personal finance tools you request. The lawful basis for each purpose, including any optional analytics or product improvement, must be confirmed and recorded by the operator before launch."],
      ["Service providers and transfers", "The source uses Alwaysdata for the deployed Django API and calls the Frankfurter exchange-rate service with currency codes for rate lookups. Confirm the hosting and backup locations, provider terms, subprocessors, international transfer safeguards and email provider before publication. The current reset email configuration defaults to Django’s console backend; production delivery is not verified."],
      ["Analytics and cookies", "A source scan of this frontend found no analytics, session replay SDK, advertising pixel or cookie banner. This does not verify production hosting scripts, reverse proxies or backend logging. Recheck the deployed site and every provider before making a final disclosure."],
      ["Retention and security", "A retention schedule, backup deletion process, breach response contact and data-subject request workflow have not been verified. Do not publish until these are defined. Production Django security settings depend on environment variables; the deployed values have not been inspected."],
      ["Your choices and rights", "The app currently provides a JSON download of data available from its existing API and an account deletion action. Account deletion is immediate in the current source; it is not a reviewable deletion request and does not describe any legal retention exceptions. Add a verified channel and procedure for access, correction, objection, restriction, withdrawal and other applicable rights before launch."],
      ["Children and age eligibility", "The product brief proposes an 18+ eligibility rule. The current registration API and UI do not enforce it. Do not represent the age gate as active until it is enforced server-side and the handling of mistaken or ineligible registrations is defined."],
      ["Contact and changes", "[Add a monitored privacy contact and the process for complaints and policy updates. Do not publish this placeholder.]"],
    ],
  },
  "/terms-of-service": {
    title: "Terms of service",
    eyebrow: "TERMS · DRAFT V0.1 · 31 OCT 2026",
    intro: "This is a working product-language draft only. It is not an approved contract and must be reviewed by Kenyan counsel before users are asked to accept it.",
    sections: [
      ["Operator and agreement", "[Identify the legal entity or individual operating Budgetly, contact details, governing law, dispute process and effective date. Define how users receive and retain a copy of the final terms.]"],
      ["Eligibility", "The product brief proposes access for adults aged 18 or older, without collecting date of birth. The current backend does not enforce this requirement. This draft must not be treated as an age gate or accepted as final until the eligibility rule is implemented and tested on the server."],
      ["What Budgetly does", "Budgetly provides tools to record and review accounts, transactions, transfers, budgets, savings goals and loans. Records are based on information entered or saved in your account; the app does not verify that those records match balances held by a bank, mobile-money provider or another person."],
      ["Currency and calculations", "The app supports KES and USD records and displays balances grouped by currency. Exchange-rate lookups use an external rate service; rates can change. The backend currently calculates interest-free loan balances by subtracting recorded repayments from the original amount. No interest calculation is currently supported."],
      ["Your account and records", "Keep your sign-in details private and review entries before saving. Confirm which security, acceptable-use, account suspension, correction and recovery rules should apply. Do not include a liability exclusion, warranty, indemnity or dispute term without legal review."],
      ["Ending an account", "The current Settings page can immediately delete an account and associated records after password confirmation. The operator must decide and document applicable retention, backup, tax, dispute and deletion-request handling before launch."],
      ["Changes and contact", "[Set the process for notice, acceptance and retained versions of material changes. Add the operator’s monitored support/contact details. Do not publish this placeholder.]"],
    ],
  },
};

export default function LegalDraftPage({ path, navigate }) {
  const document = documents[path] || documents["/privacy-policy"];
  return <main className="legal-page">
    <header className="legal-header"><button className="legal-brand" onClick={() => navigate("/login")} aria-label="Budgetly sign in"><span className="brand-mark">B</span><span>budgetly</span></button><button className="text-button" onClick={() => navigate("/login")}>Sign in <ArrowRight size={15} /></button></header>
    <article className="legal-document"><button className="legal-back" onClick={() => navigate("/register")}><ArrowLeft size={15} />Back to create account</button><h1>{document.title}</h1><p className="legal-intro">{document.intro}</p><aside className="legal-draft-alert" role="note"><FileText size={18} /><p><strong>Draft — not approved for use.</strong> Bracketed items need verified details. Kenyan legal review and operator approval are required before publication or acceptance.</p></aside><div className="legal-sections">{document.sections.map(([heading, copy], index) => <section key={heading}><span className="legal-index">{index + 1}</span><div><h2>{heading}</h2><p>{copy}</p></div></section>)}</div><footer className="legal-footer"><button className="secondary-button" onClick={() => navigate(document.title === "Privacy policy" ? "/terms-of-service" : "/privacy-policy")}>{document.title === "Privacy policy" ? "Read draft terms" : "Read draft privacy policy"}<ArrowRight size={15} /></button><span>Budgetly · Working draft · Not legal advice</span></footer></article>
  </main>;
}
