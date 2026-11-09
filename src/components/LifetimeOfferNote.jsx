import { LIFETIME_PRICE_LABEL } from "../lib/billingState.js";
import "../styles/orbit-pricing.css";

export default function LifetimeOfferNote() {
  return <p className="lifetime-offer-note"><span>Lifetime access · <strong>{LIFETIME_PRICE_LABEL} once</strong></span><span>No subscriptions. No recurring charges.</span></p>;
}
