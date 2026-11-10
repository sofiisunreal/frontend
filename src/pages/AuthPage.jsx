import { useEffect, useRef, useState } from "react";
import { LoadingButton } from "../components/Loading";
import PaymentSupport from "../components/PaymentSupport";
import { ArrowLeft, ArrowRight, Eye, EyeOff, Moon, Sun } from "lucide-react";
import BrandMark from "../components/BrandMark";
import { GlassMonogram } from "../components/landing/LandingArtwork";
import { api, captureSession, commitSession, isCurrentSession, jsonBody } from "../lib/api";
import { focusFormError, nativeValidationMessage, normalizeError } from "../lib/errors";
import { ErrorNotice, FieldError } from "../components/FormFeedback";
import GoogleIdentityButton from "../components/GoogleIdentityButton";
import { authenticateGoogle, readGoogleSessionProfile } from "../lib/googleAuth";
import { cancelGoogleIdentityRequests } from "../lib/googleIdentity";
import { LIFETIME_PRICE_LABEL } from "../lib/billingState.js";
import { legalAcceptanceBody, policyIdentity, policyLink, staleLegalDocuments, usePolicies } from "../legal/policyRecords";
import "../styles/orbit-public.css";
import "../styles/orbit-auth.css";
import "../styles/orbit-pricing.css";

const views = {
  "/login": { title: "Welcome back", intro: "Sign in to pick up where you left off.", submit: "Sign in" },
  "/register": { title: "A clearer view of your money", intro: `Create your account, then unlock Budgetly for ${LIFETIME_PRICE_LABEL} once. Lifetime access lasts while Budgetly continues offering the service. This is not a subscription and has no recurring charges.`, submit: "Create account" },
  "/forgot-password": { title: "Reset your password", intro: "We’ll send instructions to the email on your account.", submit: "Send instructions" },
};

export default function AuthPage({ path, navigate, onAuthenticated, onSessionStarted, onSessionCleared, theme, onThemeChange }) {
  const cleanPath = path.split("?")[0];
  const query = new URLSearchParams(path.split("?")[1] || "");
  const resetMatch = cleanPath.match(/^\/reset-password\/([^/]+)\/([^/]+)\/?$/);
  const mode = resetMatch ? "reset" : cleanPath;
  const isRegister = mode === "/register";
  const isForgot = mode === "/forgot-password";
  const isReset = mode === "reset";
  const policies = usePolicies();
  const official = policies.status === "active";
  const termsKey = official ? JSON.stringify(policyIdentity(policies.documents.terms)) : "";
  const privacyKey = official ? JSON.stringify(policyIdentity(policies.documents.privacy)) : "";
  const policyBlocked = isRegister && !official;
  const info = views[mode] || { title: "Welcome back", intro: "Sign in to pick up where you left off.", submit: "Sign in" };
  const [form, setForm] = useState({ username: "", email: "", first_name: "", last_name: "", password: "", password_confirm: "", confirm_password: "", age_eligibility: false, accept_terms: false, accept_privacy_policy: false, termsDocumentKey: "", privacyDocumentKey: "" });
  const acceptedTerms = form.accept_terms && form.termsDocumentKey === termsKey;
  const acknowledgedPrivacy = form.accept_privacy_policy && form.privacyDocumentKey === privacyKey;
  const [fieldErrors, setFieldErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(() => query.get("session") === "expired" ? "Your session has expired. Please sign in again." : "");
  const [formErrors, setFormErrors] = useState([]);
  const authLock = useRef(false), googleRequest = useRef(null), mounted = useRef(false);
  const [googleCancelKey, setGoogleCancelKey] = useState(0), [googleBusy, setGoogleBusy] = useState(false), [googleAction, setGoogleAction] = useState(null);
  useEffect(() => { mounted.current = true;return () => { mounted.current = false;googleRequest.current?.abort(); }; }, []);
  const [notice, setNotice] = useState(() => query.get("created") ? "Account created. Sign in to continue. We’ll check your access before you unlock Budgetly; no payment has started." : query.get("reset") ? "Password reset. You can sign in now." : "");
  const set = (key) => (event) => { setForm((current) => ({ ...current, [key]: event.target.value }));setFieldErrors(current => ({ ...current, [key]: "" }));setError("");setFormErrors([]); };

  async function submit(event) {
    event.preventDefault();
    if (authLock.current || busy) return;
    cancelGoogleIdentityRequests();setGoogleCancelKey(value => value + 1);setGoogleAction(null);
    const submittedForm = event.currentTarget;
    let errorContext = isRegister ? "register" : isForgot ? "forgot" : isReset ? "reset" : "login";
    setError("");
    setFormErrors([]);
    setNotice("");
    setFieldErrors({});
    if (policyBlocked) { setError("The official documents and registration agreement are not ready. Please try again later.");focusFormError(submittedForm);return; }
    if (!isForgot && form.password.length < 8) { setFieldErrors({ password: "Use a password with at least 8 characters." });setError("Please check the highlighted details.");focusFormError(submittedForm);return; }
    if (isRegister && form.password !== form.password_confirm) { setFieldErrors({ password_confirm: "Your passwords don't match." });setError("Please check the highlighted details.");focusFormError(submittedForm);return; }
    if (isRegister) {
      const declarations = {
        age_eligibility: "Please confirm that you are at least 18 years old.",
        accept_terms: "Please read and agree to the linked Terms of Service.",
        accept_privacy_policy: "Please read and acknowledge the linked Privacy Policy.",
      };
      const confirmations = { ...form, accept_terms: acceptedTerms, accept_privacy_policy: acknowledgedPrivacy };
      const missing = Object.fromEntries(Object.entries(declarations).filter(([key]) => !confirmations[key]));
      if (Object.keys(missing).length) {
        setFieldErrors(missing);
        setError("Complete each required confirmation before creating your account.");
        focusFormError(submittedForm);
        return;
      }
    }
    if (isReset && form.password !== form.confirm_password) { setFieldErrors({ confirm_password: "Your passwords don't match." });setError("Please check the highlighted details.");focusFormError(submittedForm);return; }
    authLock.current = true;setBusy(true);
    const scope = captureSession(), controller = new AbortController();googleRequest.current = controller;
    const signal = AbortSignal.any([scope.signal, controller.signal, AbortSignal.timeout(20000)]);
    try {
      if (isRegister) {
        const registration = { username: form.username, email: form.email, first_name: form.first_name, last_name: form.last_name, password: form.password, password_confirm: form.password_confirm, age_eligibility: form.age_eligibility, accept_terms: acceptedTerms, accept_privacy_policy: acknowledgedPrivacy };
        const body = { ...registration, ...legalAcceptanceBody(policies.documents) };
        await api("/api/auth/register/", { method: "POST", auth: false, body: jsonBody(body), signal });
        if (!mounted.current || !isCurrentSession(scope)) return;
        navigate("/login?created=1");
      } else if (isForgot) {
        await api("/api/auth/forgot-password/", { method: "POST", auth: false, body: jsonBody({ email: form.email }), signal });
        if (!mounted.current || !isCurrentSession(scope)) return;
        setNotice("If an account uses this email, reset instructions have been sent.");
      } else if (isReset) {
        const [, uid, token] = resetMatch;
        await api(`/api/auth/reset-password/${uid}/${token}/`, { method: "POST", auth: false, body: jsonBody({ new_password: form.password, confirm_password: form.confirm_password }), signal });
        if (!mounted.current || !isCurrentSession(scope)) return;
        onSessionCleared?.();
        navigate("/login?reset=1");
      } else {
        const tokens = await api("/api/auth/login/", { method: "POST", auth: false, body: jsonBody({ username: form.username, password: form.password }), signal });
        if (!mounted.current || !isCurrentSession(scope)) return;
        errorContext = "session";
        onSessionStarted(commitSession(tokens, scope));
      }
    } catch (requestError) {
      if (!mounted.current || !isCurrentSession(scope) || controller.signal.aborted) return;
      if (isRegister && staleLegalDocuments(requestError)) {
        setForm(current => ({ ...current, accept_terms: false, accept_privacy_policy: false, termsDocumentKey: "", privacyDocumentKey: "" }));
        setError("The legal documents changed or are temporarily unavailable. Review the updated versions and confirm again before creating your account.");
        focusFormError(submittedForm);
        await policies.refresh();
        return;
      }
      const result = normalizeError(requestError, { context: errorContext, fields: isRegister ? { first_name: "First name", last_name: "Last name", username: "Username", email: "Email address", password: "Password", password_confirm: "Confirm password", age_eligibility: "Age confirmation", accept_terms: "Terms agreement", accept_privacy_policy: "Privacy acknowledgement" } : isForgot ? { email: "Email address" } : isReset ? { password: "New password", confirm_password: "Confirm new password" } : { username: "Username", password: "Password" }, aliases: isReset ? { new_password: "password" } : {} });
      setFieldErrors(result.fieldErrors);setFormErrors(result.formErrors);setError(result.message);
      focusFormError(submittedForm);
    } finally { authLock.current = false;if (mounted.current) setBusy(false); }
  }

  async function submitGoogle(credential) {
    if (authLock.current || busy || !mounted.current) return;
    setError("");setNotice("");setFormErrors([]);setFieldErrors({});setGoogleAction(null);
    const formElement = document.querySelector(".auth-form");
    if (isRegister && (policyBlocked || !form.age_eligibility || !acceptedTerms || !acknowledgedPrivacy)) {
      setError("Review the current documents and complete all three confirmations before creating an account with Google.");focusFormError(formElement);return;
    }
    const scope = captureSession(), controller = new AbortController();googleRequest.current = controller;
    const signal = AbortSignal.any([scope.signal, controller.signal, AbortSignal.timeout(20000)]);
    authLock.current = true;setBusy(true);setGoogleBusy(true);
    try {
      const registration = isRegister ? { identities: legalAcceptanceBody(policies.documents), declarations: { age_eligibility: form.age_eligibility, accept_terms: acceptedTerms, accept_privacy_policy: acknowledgedPrivacy } } : undefined;
      const tokens = await authenticateGoogle(credential, { registration, signal });
      const user = await readGoogleSessionProfile(tokens.access, { signal });
      if (!mounted.current || !isCurrentSession(scope) || controller.signal.aborted) return;
      onAuthenticated(user, commitSession(tokens, scope));
    } catch (requestError) {
      if (!mounted.current || !isCurrentSession(scope) || controller.signal.aborted) return;
      if (isRegister && staleLegalDocuments(requestError)) {
        setForm(current => ({ ...current, accept_terms: false, accept_privacy_policy: false, termsDocumentKey: "", privacyDocumentKey: "" }));
        setError("The legal documents changed or are temporarily unavailable. Review the updated versions and confirm again before creating your account.");await policies.refresh();
      } else {
        const result = normalizeError(requestError, { context: isRegister ? "googleRegister" : "googleLogin", fields: { age_eligibility: "Age confirmation", accept_terms: "Terms agreement", accept_privacy_policy: "Privacy acknowledgement" } });
        setError(result.message);setFormErrors(result.formErrors);setFieldErrors(result.fieldErrors);setGoogleAction(result.action || null);
      }
      focusFormError(formElement);
    } finally {
      authLock.current = false;
      if (mounted.current) { setBusy(false);setGoogleBusy(false); }
    }
  }

  const passwordFields = !isForgot;
  return (
    <main className={`auth-shell orbit-auth orbit-public ${isRegister ? "auth-registration" : ""}`}>
      <div className="auth-atmosphere" aria-hidden="true" />
      <header className="auth-public-header">
        <a className="auth-home-brand" href="/" aria-label="Budgetly homepage" onClick={(event) => { if (!event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) { event.preventDefault(); navigate("/"); } }}><BrandMark size={32} /><span>budgetly<span>.</span></span></a>
        <div className="auth-floating-controls"><a href="/" onClick={(event) => { if (!event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) { event.preventDefault(); navigate("/"); } }}><ArrowLeft size={15} /><span>Back to Budgetly</span></a><button type="button" className="auth-theme-toggle" aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`} onClick={() => onThemeChange(theme === "dark" ? "light" : "dark")}>{theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}</button></div>
      </header>
      <section className="auth-story" aria-label="About Budgetly">
        <GlassMonogram />
        <div className="auth-story-copy">
          <span className="auth-story-label">A little more clarity.</span>
          <h1><span>Money, without</span><span>the overwhelm.</span></h1>
          <p>Your spending, savings and plans,<br />all in one calmer place.</p>
        </div>
        <div className="auth-story-foot"><BrandMark size={20} /><span>Personal finance, at your pace.</span></div>
      </section>
      <section className="auth-form-side">
        <form className={`auth-form ${!isForgot && !isReset ? "auth-with-google" : ""}`} onSubmit={submit} onInvalid={event => { event.preventDefault();const control = event.target;setFieldErrors(current => ({ ...current, [control.name]: nativeValidationMessage(control) }));setError("Please check the highlighted details.");focusFormError(control.form); }} aria-labelledby="auth-title">
          <div className="auth-heading"><span className="auth-form-eyebrow">{isRegister ? "Your next chapter" : isForgot || isReset ? "A fresh start" : "Your calmer place"}</span><h2 id="auth-title">{isReset ? "Choose a new password" : info.title}</h2><p>{isReset ? "Choose a new password for your account." : info.intro}</p></div>
          <ErrorNotice message={error} messages={formErrors} />
          {query.get("linkGoogle") === "1" && !isRegister && <p className="form-message form-message-info" role="note">Sign in with your Budgetly password first. You'll be taken to Settings, where you can choose the Google account to connect.</p>}
          {notice && <p className="form-message form-message-success" role="status">{notice}</p>}
          {isRegister && <div className="google-consent">
          {isRegister && <fieldset className="legal-declarations" disabled={busy}><legend>Before you create your account</legend>
            <p className="auth-policy-note" role="note">{official ? "Review the linked versions before agreeing. If they change, we’ll ask you to confirm again." : "The linked local drafts are unpublished. Account creation requires the verified official documents."}</p>
            {policyBlocked && <div className="form-message form-message-error" role={policies.status === "loading" ? "status" : "alert"}>{policies.status === "loading" ? "Checking official documents…" : policies.status === "inactive" ? "Official policies have not been published yet. Account creation will be available once both documents are active." : "Official documents could not be loaded or verified. Account creation is temporarily unavailable."}{policies.refresh && policies.status !== "loading" && <button type="button" className="inline-link" onClick={policies.refresh}>Check documents again</button>}</div>}
            <CheckField name="age_eligibility" id="age-eligibility" checked={form.age_eligibility} error={fieldErrors.age_eligibility} onChange={(checked) => { setForm((current) => ({ ...current, age_eligibility: checked })); setFieldErrors((current) => ({ ...current, age_eligibility: "" })); setError(""); }}>I confirm that I am at least 18 years old.</CheckField>
            <CheckField name="accept_terms" id="accept-terms" checked={acceptedTerms} error={fieldErrors.accept_terms} onChange={(checked) => { setForm((current) => ({ ...current, accept_terms: checked, termsDocumentKey: termsKey })); setFieldErrors((current) => ({ ...current, accept_terms: "" })); setError(""); }}>I agree to the <a className="inline-link" href={policyLink("terms", policies.documents?.terms)} target="_blank" rel="noreferrer">Terms of Service {official ? `v${policies.documents.terms.version}` : "draft"} (opens in a new tab)</a>.</CheckField>
            <CheckField name="accept_privacy_policy" id="accept-privacy" checked={acknowledgedPrivacy} error={fieldErrors.accept_privacy_policy} onChange={(checked) => { setForm((current) => ({ ...current, accept_privacy_policy: checked, privacyDocumentKey: privacyKey })); setFieldErrors((current) => ({ ...current, accept_privacy_policy: "" })); setError(""); }}>I have read and acknowledge the <a className="inline-link" href={policyLink("privacy", policies.documents?.privacy)} target="_blank" rel="noreferrer">Privacy Policy {official ? `v${policies.documents.privacy.version}` : "draft"} (opens in a new tab)</a>.</CheckField>
          </fieldset>}
          </div>}
          {!isForgot && !isReset && query.get("linkGoogle") !== "1" && <section className="google-auth-section" aria-label="Google sign-in">
            <div className="google-action-panel">
              <div className="google-action-heading"><h3>Continue with Google</h3><p>{isRegister ? "No new password to remember." : "Use your Google account for faster sign-in."}</p></div>
              <GoogleIdentityButton theme={theme} intent={isRegister ? "signup" : "signin"} enabled={!isRegister || (official && form.age_eligibility && acceptedTerms && acknowledgedPrivacy)} busy={busy} cancelKey={googleCancelKey} disabledReason="Confirm your age and both documents above to continue with Google." onCredential={submitGoogle} onFallback={() => document.querySelector('.auth-form input[name="username"]')?.focus()} />
              {googleBusy && <p className="google-auth-progress" role="status">{isRegister ? "Confirming your account with Budgetly…" : "Signing in with Google…"}</p>}
            </div>
            <div className="google-auth-divider"><span>or use your password</span></div>
          </section>}
          {googleAction && <div className="google-feedback-actions">{googleAction === "password-link" ? <button type="button" className="text-button" onClick={() => navigate("/login?linkGoogle=1")}>Sign in with password, then connect Google</button> : <button type="button" className="text-button" onClick={() => navigate("/register")}>Create account and review documents</button>}</div>}
          <fieldset className="auth-inputs" disabled={busy}><legend className="visually-hidden">{isRegister ? "Account details" : isForgot ? "Recovery email" : isReset ? "New password" : "Sign-in details"}</legend>
          {isRegister && <div className="form-row"><Field errors={fieldErrors} label="First name" name="first_name" value={form.first_name} set={set} autoComplete="given-name" /><Field errors={fieldErrors} label="Last name" name="last_name" value={form.last_name} set={set} autoComplete="family-name" /></div>}
          {!isForgot && !isReset && <Field errors={fieldErrors} label="Username" name="username" value={form.username} set={set} autoComplete="username" required />}
          {(isRegister || isForgot) && <Field errors={fieldErrors} label="Email address" name="email" value={form.email} set={set} autoComplete="email" type="email" required />}
          {passwordFields && <PasswordField errors={fieldErrors} label={isReset ? "New password" : "Password"} name="password" value={form.password} set={set} visible={showPassword} toggle={() => setShowPassword((value) => !value)} autoComplete={isReset ? "new-password" : isRegister ? "new-password" : "current-password"} />}
          {(isRegister || isReset) && <p className="auth-password-help" id="auth-password-help">Use at least 8 characters. A long, unique password works best.</p>}
          {isRegister && <PasswordField errors={fieldErrors} label="Confirm password" name="password_confirm" value={form.password_confirm} set={set} visible={showPassword} toggle={() => setShowPassword((value) => !value)} autoComplete="new-password" />}

          {(isReset) && <PasswordField errors={fieldErrors} label="Confirm new password" name="confirm_password" value={form.confirm_password} set={set} visible={showPassword} toggle={() => setShowPassword((value) => !value)} autoComplete="new-password" />}
          {!isRegister && !isForgot && !isReset && <div className="auth-inline-link"><button type="button" onClick={() => navigate("/forgot-password")}>Forgot password?</button></div>}
          </fieldset>
          <LoadingButton className="primary-button auth-submit" busy={busy} disabled={policyBlocked} loadingLabel={isRegister ? "Creating account…" : isForgot ? "Sending instructions…" : isReset ? "Resetting password…" : "Signing in…"} type="submit">{isReset ? "Save new password" : info.submit}<ArrowRight size={17} /></LoadingButton>
          {isReset && <button className="auth-recovery-link" type="button" onClick={() => navigate("/forgot-password")}>Request another reset link</button>}
          <p className="auth-switch">{isRegister ? "Already have an account?" : isForgot || isReset ? "Remembered your password?" : "New to Budgetly?"} <button type="button" onClick={() => navigate(isRegister || isForgot || isReset ? "/login" : "/register")}>{isRegister || isForgot || isReset ? "Sign in" : "Create an account"}</button></p>
          {!isRegister && !isForgot && !isReset && <p className="auth-price-note">{LIFETIME_PRICE_LABEL} once. Lifetime access lasts while Budgetly continues offering the service. No subscription. No recurring charges.</p>}
        </form>
        {!isRegister && <PaymentSupport />}
        <footer className="auth-footer"><span>Personal finance, at your pace.</span><nav aria-label="Legal documents"><button type="button" onClick={() => navigate(policyLink("privacy", policies.documents?.privacy))}>Privacy policy{official ? ` · v${policies.documents.privacy.version}` : " · Draft"}</button><button type="button" onClick={() => navigate(policyLink("terms", policies.documents?.terms))}>Terms{official ? ` · v${policies.documents.terms.version}` : " · Draft"}</button></nav></footer>
      </section>
    </main>
  );
}

function Field({ label, name, value, set, errors = {}, type = "text", autoComplete, required = false }) {
  const error = errors[name], id = `auth-${name}-error`;
  return <label className="field"><span>{label}</span><input name={name} value={value} onChange={set(name)} type={type} autoComplete={autoComplete} required={required} aria-invalid={error ? true : undefined} aria-describedby={error ? id : undefined} /><FieldError id={id} message={error} /></label>;
}

function PasswordField({ label, name, value, set, visible, toggle, autoComplete, errors = {} }) {
  const error = errors[name], id = `auth-${name}-error`;
  return <label className="field"><span>{label}</span><span className="password-input"><input id={`auth-${name}`} name={name} value={value} onChange={set(name)} type={visible ? "text" : "password"} autoComplete={autoComplete} aria-invalid={error ? true : undefined} aria-describedby={[autoComplete === "new-password" ? "auth-password-help" : "", error ? id : ""].filter(Boolean).join(" ") || undefined} minLength={8} required /><button type="button" aria-label={visible ? "Hide password" : "Show password"} aria-pressed={visible} aria-controls={`auth-${name}`} onClick={toggle}>{visible ? <EyeOff size={17} /> : <Eye size={17} />}</button></span><FieldError id={id} message={error} /></label>;
}

function CheckField({ id, name, checked, onChange, error, children }) {
  return <div className="check-field-wrap"><div className="check-field"><input id={id} name={name} type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} /><label htmlFor={id}>{children}</label></div><FieldError id={`${id}-error`} message={error} /></div>;
}
