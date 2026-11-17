import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "../lib/support";

export default function SupportContact() {
  return <p className="support-contact">Need help? Contact <a href={SUPPORT_MAILTO}>{SUPPORT_EMAIL}</a></p>;
}
