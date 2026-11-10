import { useId } from "react";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "../lib/support";

export default function PaymentSupport() {
  const titleId = useId();
  return <aside className="customer-support" aria-labelledby={titleId}>
    <h2 id={titleId}>Need help with a payment?</h2>
    <p>If a payment is pending, interrupted or unconfirmed, sign in with the account used at checkout and check the existing payment before paying again.</p>
    <p>Email <a href={SUPPORT_MAILTO}>{SUPPORT_EMAIL}</a> for payment help or to request a payment or refund review. A review does not guarantee a refund.</p>
    <p className="customer-support-privacy">Keep your first message brief. Don’t send passwords, reset links, verification codes, card or bank details, or financial records.</p>
  </aside>;
}
