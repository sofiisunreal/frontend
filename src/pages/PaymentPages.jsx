import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, CircleAlert, Clock3, HandCoins, LockKeyhole, Moon, RefreshCw, Sun, Target, Wallet } from "lucide-react";
import BrandMark from "../components/BrandMark";
import { InlineLoading, LoadingButton } from "../components/Loading";
import { getAccessStatus, getPurchase, initializeLifetimePurchase, verifyPurchase } from "../lib/billingApi";
import { friendlyErrorMessage } from "../lib/errors";
import { clearPendingPurchaseReference, hasLifetimeAccess, INACTIVE_ENTITLEMENTS, LIFETIME_PRICE_LABEL, paymentReturnReference, pendingPurchaseReference, rememberPurchaseReference, TERMINAL_PURCHASE_STATUSES } from "../lib/billingState.js";
import "../styles/orbit-public.css";
import "../styles/orbit-billing.css";

const POLL_DELAYS = [1000, 2500, 5000, 8000];
const PRICE_LABEL = LIFETIME_PRICE_LABEL; // Display copy only. No amount is sent to checkout.

const errorMessage = (error, context = "paymentVerify") => friendlyErrorMessage(error, { context });

function AppLink({ to, navigate, children, className = "", ...props }) {
  return <a {...props} href={to} className={className} onClick={event => { if (!event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) { event.preventDefault();navigate(to); } }}>{children}</a>;
}

function BillingFrame({ children, navigate, theme, onThemeChange, compact = false }) {
  return <div className={`orbit-billing orbit-public billing-shell ${compact ? "billing-compact" : ""}`}>
    <a className="billing-skip" href="#billing-content">Skip to payment</a>
    <header className="billing-header"><AppLink to="/welcome" navigate={navigate} className="billing-brand" aria-label="Budgetly homepage"><BrandMark size={31} /><span>budgetly<span>.</span></span></AppLink><div className="billing-header-actions"><AppLink to="/welcome" navigate={navigate}><ArrowLeft size={15} />Budgetly home</AppLink>{onThemeChange && <button type="button" onClick={() => onThemeChange(theme === "dark" ? "light" : "dark")} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}>{theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}</button>}</div></header>
    <main id="billing-content" className="billing-content" tabIndex={-1} aria-labelledby="billing-title">{children}</main>
    <footer className="billing-page-footer"><span>Your money, in one calmer place.</span><nav aria-label="Payment and account links"><AppLink to="/privacy-policy" navigate={navigate}>Privacy Policy</AppLink><AppLink to="/terms-of-service" navigate={navigate}>Terms of Service</AppLink><AppLink to="/help" navigate={navigate}>Help</AppLink><AppLink to="/settings" navigate={navigate}>Account settings</AppLink></nav></footer>
  </div>;
}

export function PaymentRequiredPage({ profile, access, onRefreshAccess, navigate, theme, onThemeChange }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [pending, setPending] = useState({ reference: null, state: "idle", purchase: null });
  const checkoutLock = useRef(false);
  const reference = pendingPurchaseReference(profile?.id);
  const known = access?.state === "ready", active = known && hasLifetimeAccess(access.data);
  const accessUnknown = access?.state === "unavailable";
  const restricted = known && INACTIVE_ENTITLEMENTS.includes(access.data?.entitlement_status);

  useEffect(() => {
    if (!reference || !known || active) return;
    let current = true;
    const controller = new AbortController();
    getPurchase(reference, { signal: controller.signal }).then(purchase => {
      if (!current) return;
      if (["failed", "abandoned"].includes(purchase.status)) {
        clearPendingPurchaseReference(reference);setPending({ reference: null, state: "finished", purchase });
      } else setPending({ reference, state: "ready", purchase });
    }).catch(requestError => {
      if (!current) return;
      if (requestError.status === 404) { clearPendingPurchaseReference(reference);setPending({ reference: null, state: "missing", purchase: null }); }
      else setPending({ reference, state: "error", purchase: null });
    });
    return () => { current = false;controller.abort(); };
  }, [reference, known, active]);

  async function startCheckout() {
    if (checkoutLock.current || busy || !known || active || restricted || reference) return;
    checkoutLock.current = true;setBusy(true);setError("");setNotice("");
    let redirecting = false;
    try {
      // Access may have changed in another tab or through a webhook since the
      // offer loaded. Check again before creating any new purchase attempt.
      const currentAccess = await onRefreshAccess();
      if (!currentAccess) { setError("We couldn’t confirm your access. Check again before starting a payment.");return; }
      if (hasLifetimeAccess(currentAccess)) { setNotice("This account already has lifetime access.");return; }
      if (INACTIVE_ENTITLEMENTS.includes(currentAccess.entitlement_status)) return;
      const purchase = await initializeLifetimePurchase();
      rememberPurchaseReference(purchase.reference, profile?.id);
      setNotice("Opening Paystack checkout. Your price and payment are handled by Budgetly’s server.");
      window.location.assign(purchase.authorization_url);
      redirecting = true;
    } catch (requestError) {
      if (requestError.status === 409) {
        const refreshed = await onRefreshAccess();
        if (hasLifetimeAccess(refreshed)) { setNotice("This account already has lifetime access.");setError(""); }
        else setError(errorMessage(requestError, "checkout"));
      } else setError(errorMessage(requestError, "checkout"));
    } finally {
      if (!redirecting) { checkoutLock.current = false;setBusy(false); }
    }
  }

  const checkingPurchase = reference && (pending.reference !== reference || pending.state === "idle");
  return <BillingFrame navigate={navigate} theme={theme} onThemeChange={onThemeChange}>
    <div className="billing-purchase-layout">
      <section className="billing-story"><span className="billing-kicker">One-time lifetime access</span><h1 id="billing-title">{active ? <>Your Budgetly<br />workspace is ready.</> : <>One payment.<br />A clearer money<br className="billing-desktop-break" /> picture.</>}</h1><p>{active ? "Your account already has lifetime access. There’s no need to pay again." : "Your spending, savings and plans, together. Pay once for the complete Budgetly workspace."}</p><div className="billing-feature-list"><div><Wallet size={20} /><span><strong>Your everyday money</strong><small>Accounts, transactions and currencies</small></span></div><div><Target size={20} /><span><strong>Plans you can follow</strong><small>Budgets and savings goals</small></span></div><div><HandCoins size={20} /><span><strong>Every agreement in view</strong><small>Loans, interest and repayments</small></span></div></div><div className="billing-story-signature" aria-hidden="true"><BrandMark size={60} /><span>One workspace.<br />Your whole picture.</span></div></section>
      <section className="billing-panel" aria-labelledby="billing-offer-title"><div className="billing-offer-top"><span className="billing-offer-tag"><Check size={14} />Pay once</span><span>Personal account</span></div><h2 id="billing-offer-title">Lifetime access</h2><div className="billing-price"><strong>{PRICE_LABEL}</strong><span>One payment. No subscriptions.</span></div><p className="billing-offer-copy">Pay once. Enjoy Budgetly for life.</p><div className="billing-offer-rule"><span>Full Budgetly workspace</span><Check size={17} /></div>
        {profile?.email && <p className="billing-account"><span>For your account</span><strong>{profile.email}</strong></p>}
        {!known && !accessUnknown && <InlineLoading>Checking your access…</InlineLoading>}
        {accessUnknown && <div className="billing-message billing-message-warning" role="alert"><CircleAlert size={18} /><div><p>We couldn’t confirm your access. Check again before starting a payment.</p><button type="button" onClick={() => onRefreshAccess()}>Check access again<RefreshCw size={14} /></button></div></div>}
        {restricted && <div className="billing-message billing-message-warning" role="note"><CircleAlert size={18} /><p>Your account’s lifetime access is inactive. Review your account or contact Budgetly through Help before making another payment.</p></div>}
        {checkingPurchase && <InlineLoading>Checking your earlier payment…</InlineLoading>}
        {reference && !checkingPurchase && !active && <p className="billing-notice" role="status">{pending.purchase?.status === "successful" ? "A payment is already recorded. Confirm access before paying again." : "You have an earlier payment to check. Let’s confirm it before starting another checkout."}</p>}
        {pending.state === "finished" && !reference && <p className="billing-notice" role="status">Your previous attempt was not completed. You can start a new checkout.</p>}
        {error && <div className="billing-message billing-message-error" role="alert"><CircleAlert size={18} /><p>{error}</p></div>}{notice && <p className="billing-notice" role="status">{notice}</p>}
        {active ? <AppLink className="billing-primary" to="/" navigate={navigate}>Go to Dashboard<ArrowRight size={17} /></AppLink> : restricted ? <AppLink className="billing-primary" to="/help" navigate={navigate}>Open Help<ArrowRight size={17} /></AppLink> : reference ? <button className="billing-primary" type="button" disabled={!known || checkingPurchase} onClick={() => navigate(`/payment/complete?reference=${encodeURIComponent(reference)}`)}>Check existing payment<ArrowRight size={17} /></button> : <LoadingButton className="billing-primary" type="button" busy={busy} disabled={!known} loadingLabel="Preparing checkout…" onClick={startCheckout}>Unlock Budgetly<ArrowRight size={17} /></LoadingButton>}
        <p className="billing-assurance"><LockKeyhole size={15} />Continue to Paystack’s hosted checkout.</p><AppLink className="billing-back-link" to="/" navigate={navigate}>Back to Budgetly<ArrowLeft size={14} /></AppLink>
      </section>
    </div>
  </BillingFrame>;
}

export function PaymentAccessLoading({ navigate, theme, onThemeChange }) {
  return <BillingFrame navigate={navigate} theme={theme} onThemeChange={onThemeChange} compact><section className="billing-result-panel"><InlineLoading>Checking account access…</InlineLoading><h1 id="billing-title">A moment for your workspace.</h1><p>We’re checking your lifetime access with Budgetly before opening your financial workspace.</p></section></BillingFrame>;
}

export function PaymentCompletePage({ path, isAuthenticated, profile, onAccessChecked, navigate, theme, onThemeChange }) {
  const reference = paymentReturnReference(path);
  const [snapshot, setSnapshot] = useState({ state: "checking", polling: false, purchase: null, message: "" });
  const [run, setRun] = useState(0);
  useEffect(() => { if (reference) rememberPurchaseReference(reference, isAuthenticated ? profile?.id : undefined); }, [reference, isAuthenticated, profile?.id]);
  useEffect(() => {
    if (!isAuthenticated || !reference) return;
    let cancelled = false, timer;
    const controller = new AbortController();
    async function check(round) {
      setSnapshot(current => ({ ...current, state: "checking", polling: true, message: "Confirming the purchase and your current account access." }));
      try {
        const details = await getPurchase(reference, { signal: controller.signal });
        let result = details, verificationError;
        try { result = await verifyPurchase(reference, { signal: controller.signal }); }
        catch (error) { if (error.status === 401) throw error;verificationError = error; }
        if (cancelled) return;
        const access = await getAccessStatus({ signal: controller.signal });
        if (cancelled) return;
        onAccessChecked?.(access, profile?.id);
        if (hasLifetimeAccess(access)) {
          clearPendingPurchaseReference(reference);
          setSnapshot({ state: "success", polling: false, purchase: result, message: "Your lifetime access is confirmed by Budgetly. There are no renewals or recurring charges." });return;
        }
        if (INACTIVE_ENTITLEMENTS.includes(access.entitlement_status)) {
          clearPendingPurchaseReference(reference);
          setSnapshot({ state: "inactive", polling: false, purchase: result, message: "Your account’s lifetime access is inactive. Please review the account through Help before making another payment." });return;
        }
        if (verificationError) throw verificationError;
        if (TERMINAL_PURCHASE_STATUSES.includes(result.status)) {
          clearPendingPurchaseReference(reference);
          setSnapshot({ state: result.status === "reversed" ? "reversed" : "failed", polling: false, purchase: result, message: result.status === "reversed" ? "This payment was reversed. Please use Help before attempting another payment." : "This payment was not completed. You can return to the payment page and start a new checkout." });return;
        }
        const more = round < POLL_DELAYS.length;
        setSnapshot({ state: "pending", polling: more, purchase: result, message: result.status === "successful" ? "The payment is recorded, but lifetime access is not confirmed yet. Please don’t pay again while we check." : "The payment is still awaiting confirmation. You can check again without making another payment." });
        if (more) timer = window.setTimeout(() => check(round + 1), POLL_DELAYS[round]);
      } catch (error) {
        if (cancelled) return;
        if (error.status === 404) clearPendingPurchaseReference(reference);
        setSnapshot(current => ({ ...current, state: "error", polling: false, message: errorMessage(error) }));
      }
    }
    Promise.resolve().then(() => { if (!cancelled) check(0); });
    return () => { cancelled = true;window.clearTimeout(timer);controller.abort(); };
  }, [reference, isAuthenticated, profile?.id, run, onAccessChecked]);

  const working = snapshot.state === "checking" || snapshot.polling;
  const title = !reference ? "This payment link needs a valid reference." : !isAuthenticated ? "Sign in to finish checking your payment." : snapshot.state === "success" ? "Your Budgetly access is ready." : snapshot.state === "pending" && !working ? "Your payment is still pending." : working ? "Checking your payment." : snapshot.state === "failed" ? "The payment wasn’t completed." : snapshot.state === "reversed" ? "This payment was reversed." : snapshot.state === "inactive" ? "Your access needs a review." : "We couldn’t confirm your payment.";
  const message = !reference ? "Use the complete return link from Budgetly or return to the payment page. Nothing has been granted from this link." : !isAuthenticated ? "Sign in with the account you used at checkout. We’ll resume server verification after login." : snapshot.message;
  return <BillingFrame navigate={navigate} theme={theme} onThemeChange={onThemeChange} compact><section className="billing-result-panel" data-payment-state={!reference ? "invalid" : !isAuthenticated ? "sign-in" : snapshot.state}>
    <div className="billing-result-icon" aria-hidden="true" data-state={snapshot.state}>{reference && isAuthenticated && working ? <Clock3 size={28} /> : snapshot.state === "success" && isAuthenticated ? <CheckCircle2 size={28} /> : <CircleAlert size={28} />}</div><span className="billing-kicker">Payment confirmation</span><div aria-live="polite" aria-atomic="true"><h1 id="billing-title">{title}</h1><p>{message}</p></div>
    {reference && isAuthenticated && working && <InlineLoading>{snapshot.polling && snapshot.state === "pending" ? "Waiting for confirmation…" : "Checking with Budgetly…"}</InlineLoading>}
    {!reference ? <AppLink className="billing-primary" to="/payment-required" navigate={navigate}>Return to payment<ArrowRight size={17} /></AppLink> : !isAuthenticated ? <AppLink className="billing-primary" to="/login?payment=1" navigate={navigate}>Sign in to verify<ArrowRight size={17} /></AppLink> : snapshot.state === "success" ? <AppLink className="billing-primary" to="/" navigate={navigate}>Go to Dashboard<ArrowRight size={17} /></AppLink> : <>
      {!working && ["pending", "error"].includes(snapshot.state) && <button className="billing-primary" type="button" onClick={() => setRun(current => current + 1)}>Check payment again<RefreshCw size={17} /></button>}
      {!working && <AppLink className="billing-secondary" to={["inactive", "reversed"].includes(snapshot.state) ? "/help" : "/payment-required"} navigate={navigate}>{["inactive", "reversed"].includes(snapshot.state) ? "Open Help" : "Return to payment"}<ArrowRight size={16} /></AppLink>}
    </>}
    {reference && <p className="billing-reference">Reference<span>{reference}</span></p>}
  </section></BillingFrame>;
}
