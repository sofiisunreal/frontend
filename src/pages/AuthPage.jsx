import { useState } from "react";
import { ArrowRight, Eye, EyeOff, Leaf, LockKeyhole } from "lucide-react";
import { api, formErrorMessage, jsonBody } from "../lib/api";

const views = {
  "/login": { title: "Welcome back", intro: "Sign in to pick up where you left off.", submit: "Sign in" },
  "/register": { title: "A clearer view of your money", intro: "Create your personal Budgetly account.", submit: "Create account" },
  "/forgot-password": { title: "Reset your password", intro: "We’ll send instructions to the email on your account.", submit: "Send instructions" },
};

export default function AuthPage({ path, navigate, onAuthenticated, onSessionCleared }) {
  const cleanPath = path.split("?")[0];
  const query = new URLSearchParams(path.split("?")[1] || "");
  const resetMatch = cleanPath.match(/^\/reset-password\/([^/]+)\/([^/]+)\/?$/);
  const mode = resetMatch ? "reset" : cleanPath;
  const isRegister = mode === "/register";
  const isForgot = mode === "/forgot-password";
  const isReset = mode === "reset";
  const info = views[mode] || { title: "Welcome back", intro: "Sign in to pick up where you left off.", submit: "Sign in" };
  const [form, setForm] = useState({ username: "", email: "", first_name: "", last_name: "", password: "", password_confirm: "", confirm_password: "", age_eligibility: false, accept_terms: false, accept_privacy_policy: false });
  const [fieldErrors, setFieldErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(() => query.get("created") ? "Account created. Sign in with your new credentials." : query.get("reset") ? "Password reset. You can sign in now." : "");
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  async function submit(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    setFieldErrors({});
    if (!isForgot && form.password.length < 8) { setError("Use a password with at least 8 characters."); return; }
    if (isRegister && form.password !== form.password_confirm) { setError("Your passwords don’t match."); return; }
    if (isRegister) {
      const declarations = {
        age_eligibility: "Please confirm that you are at least 18 years old.",
        accept_terms: "Please agree to the Terms of Service draft.",
        accept_privacy_policy: "Please read and agree to the Privacy Policy draft.",
      };
      const missing = Object.fromEntries(Object.entries(declarations).filter(([key]) => !form[key]));
      if (Object.keys(missing).length) {
        setFieldErrors(missing);
        setError("Complete each required confirmation before creating your account.");
        return;
      }
    }
    if ((isReset || isForgot) && isReset && form.password !== form.confirm_password) { setError("Your passwords don’t match."); return; }
    setBusy(true);
    try {
      if (isRegister) {
        await api("/api/auth/register/", { method: "POST", auth: false, body: jsonBody({ username: form.username, email: form.email, first_name: form.first_name, last_name: form.last_name, password: form.password, password_confirm: form.password_confirm, age_eligibility: form.age_eligibility, accept_terms: form.accept_terms, accept_privacy_policy: form.accept_privacy_policy }) });
        navigate("/login?created=1");
      } else if (isForgot) {
        await api("/api/auth/forgot-password/", { method: "POST", auth: false, body: jsonBody({ email: form.email }) });
        setNotice("If an account uses this email, reset instructions have been sent.");
      } else if (isReset) {
        const [, uid, token] = resetMatch;
        await api(`/api/auth/reset-password/${uid}/${token}/`, { method: "POST", auth: false, body: jsonBody({ new_password: form.password, confirm_password: form.confirm_password }) });
        onSessionCleared?.();
        navigate("/login?reset=1");
      } else {
        const tokens = await api("/api/auth/login/", { method: "POST", auth: false, body: jsonBody({ username: form.username, password: form.password }) });
        sessionStorage.setItem("budgetly.access", tokens.access);
        sessionStorage.setItem("budgetly.refresh", tokens.refresh);
        try {
          const profile = await api("/api/auth/profile/");
          onAuthenticated(profile);
        } catch (profileError) {
          sessionStorage.removeItem("budgetly.access"); sessionStorage.removeItem("budgetly.refresh");
          throw profileError;
        }
      }
    } catch (requestError) {
      if (isForgot && requestError.status === 404) setNotice("If an account uses this email, reset instructions have been sent.");
      else {
        if (isRegister && requestError.details && typeof requestError.details === "object") {
          const declarationFields = ["age_eligibility", "accept_terms", "accept_privacy_policy"];
          const backendErrors = Object.fromEntries(declarationFields.flatMap((key) => {
            const value = requestError.details[key];
            return value ? [[key, Array.isArray(value) ? value.join(" ") : String(value)]] : [];
          }));
          setFieldErrors(backendErrors);
        }
        setError(formErrorMessage(requestError));
      }
    } finally { setBusy(false); }
  }

  const passwordFields = !isForgot;
  return (
    <main className="auth-shell">
      <section className="auth-story" aria-label="About Budgetly">
        <button className="auth-brand" onClick={() => navigate("/login")} aria-label="Budgetly home">
          <span className="brand-mark"><Leaf size={21} /></span><span>budgetly</span>
        </button>
        <div className="auth-story-copy">
          <h1>Know where you stand.</h1>
          <p>One calm place to understand your accounts, make a plan, and keep track of the little things that add up.</p>
        </div>
        <div className="auth-story-foot"><LockKeyhole size={15} /> Your finances stay yours.</div>
      </section>
      <section className="auth-form-side">
        <div className="auth-mobile-brand"><span className="brand-mark"><Leaf size={19} /></span><strong>budgetly</strong></div>
        <form className="auth-form" onSubmit={submit}>
          <div className="auth-heading"><h2>{isReset ? "Choose a new password" : info.title}</h2><p>{isReset ? "Choose a new password for your account." : info.intro}</p></div>
          {error && <p className="form-message form-message-error" role="alert">{error}</p>}
          {notice && <p className="form-message form-message-success" role="status">{notice}</p>}
          {isRegister && <div className="form-row"><Field label="First name" name="first_name" value={form.first_name} set={set} autoComplete="given-name" /><Field label="Last name" name="last_name" value={form.last_name} set={set} autoComplete="family-name" /></div>}
          {!isForgot && !isReset && <Field label="Username" name="username" value={form.username} set={set} autoComplete="username" required />}
          {(isRegister || isForgot) && <Field label="Email address" name="email" value={form.email} set={set} autoComplete="email" type="email" required />}
          {passwordFields && <PasswordField label={isReset ? "New password" : "Password"} name="password" value={form.password} set={set} visible={showPassword} toggle={() => setShowPassword((value) => !value)} autoComplete={isReset ? "new-password" : isRegister ? "new-password" : "current-password"} />}
          {isRegister && <PasswordField label="Confirm password" name="password_confirm" value={form.password_confirm} set={set} visible={showPassword} toggle={() => setShowPassword((value) => !value)} autoComplete="new-password" />}
          {isRegister && <fieldset className="legal-declarations"><legend>Before you create your account</legend>
            <CheckField id="age-eligibility" checked={form.age_eligibility} error={fieldErrors.age_eligibility} onChange={(checked) => { setForm((current) => ({ ...current, age_eligibility: checked })); setFieldErrors((current) => ({ ...current, age_eligibility: "" })); setError(""); }}>I confirm that I am at least 18 years old.</CheckField>
            <CheckField id="accept-terms" checked={form.accept_terms} error={fieldErrors.accept_terms} onChange={(checked) => { setForm((current) => ({ ...current, accept_terms: checked })); setFieldErrors((current) => ({ ...current, accept_terms: "" })); setError(""); }}>I agree to the <a className="inline-link" href="/terms-of-service" target="_blank" rel="noreferrer">Terms of Service draft (opens in a new tab)</a>.</CheckField>
            <CheckField id="accept-privacy" checked={form.accept_privacy_policy} error={fieldErrors.accept_privacy_policy} onChange={(checked) => { setForm((current) => ({ ...current, accept_privacy_policy: checked })); setFieldErrors((current) => ({ ...current, accept_privacy_policy: "" })); setError(""); }}>I have read and agree to the <a className="inline-link" href="/privacy-policy" target="_blank" rel="noreferrer">Privacy Policy draft (opens in a new tab)</a>.</CheckField>
          </fieldset>}
          {(isReset) && <PasswordField label="Confirm new password" name="confirm_password" value={form.confirm_password} set={set} visible={showPassword} toggle={() => setShowPassword((value) => !value)} autoComplete="new-password" />}
          {!isRegister && !isForgot && !isReset && <div className="auth-inline-link"><button type="button" onClick={() => navigate("/forgot-password")}>Forgot password?</button></div>}
          <button className="primary-button auth-submit" disabled={busy} type="submit">{busy ? "Please wait…" : info.submit}<ArrowRight size={17} /></button>
          <p className="auth-switch">{isRegister ? "Already have an account?" : isForgot || isReset ? "Remembered your password?" : "New to Budgetly?"} <button type="button" onClick={() => navigate(isRegister || isForgot || isReset ? "/login" : "/register")}>{isRegister || isForgot || isReset ? "Sign in" : "Create an account"}</button></p>
        </form>
        <footer className="auth-footer"><span>Personal finance, at your pace.</span><nav aria-label="Draft policies"><button type="button" onClick={() => navigate("/privacy-policy")}>Privacy policy · Draft</button><button type="button" onClick={() => navigate("/terms-of-service")}>Terms · Draft</button></nav></footer>
      </section>
    </main>
  );
}

function Field({ label, name, value, set, type = "text", autoComplete, required = false }) {
  return <label className="field"><span>{label}</span><input name={name} value={value} onChange={set(name)} type={type} autoComplete={autoComplete} required={required} /></label>;
}

function PasswordField({ label, name, value, set, visible, toggle, autoComplete }) {
  return <label className="field"><span>{label}</span><span className="password-input"><input name={name} value={value} onChange={set(name)} type={visible ? "text" : "password"} autoComplete={autoComplete} minLength={8} required /><button type="button" aria-label={visible ? "Hide password" : "Show password"} onClick={toggle}>{visible ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label>;
}

function CheckField({ id, checked, onChange, error, children }) {
  return <div className="check-field-wrap"><div className="check-field"><input id={id} type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} /><label htmlFor={id}>{children}</label></div>{error && <p className="field-error" id={`${id}-error`}>{error}</p>}</div>;
}
