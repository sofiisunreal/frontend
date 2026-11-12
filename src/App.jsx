import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Menu, Moon, Sun } from "lucide-react";
import Sidebar from "./components/Sidebar";
import { StartupLoading } from "./components/Loading";
import AuthPage from "./pages/AuthPage";
import LandingPage from "./pages/LandingPage";
import FinancePage from "./pages/FinancePage";
import LegalDraftPage from "./pages/LegalDraftPage";
import AccountLegalProvider from "./components/legal/AccountLegalProvider";
import LegalUpdateNotice from "./components/legal/LegalUpdateNotice";
import { captureSession, clearSession, isCurrentSession, readSessionProfile, revokeSessionTokens, suspendSession } from "./lib/api";
import { friendlyErrorMessage } from "./lib/errors";
import { profileDisplayName } from "./lib/profile";
import { disableGoogleAutoSelect } from "./lib/googleIdentity";
import { getAccessStatus } from "./lib/billingApi";
import { clearPendingPurchaseReference, hasLifetimeAccess, paymentReturnReference, pendingPurchaseReference, rememberPurchaseReference, validateAccessStatus } from "./lib/billingState.js";
import { PaymentAccessLoading, PaymentCompletePage, PaymentRequiredPage } from "./pages/PaymentPages";
import "./index.css";
import "./styles/orbit-theme.css";
import "./styles/orbit-support.css";
import "./styles/orbit-loading.css";

const routeScreens = {
  "/": "Overview", "/transactions": "Transactions", "/accounts": "Accounts", "/transfers": "Transfers",
  "/budgets": "Budgets & Savings", "/savings": "Savings goals", "/loans": "Loans",
  "/categories": "Categories", "/exchange-rates": "Exchange rates", "/settings": "Settings", "/help": "Help",
  "/privacy-policy": "Privacy policy", "/terms-of-service": "Terms of service", "/legal-updates": "Legal updates",
};
const routePaths = Object.fromEntries(Object.entries(routeScreens).map(([path, screen]) => [screen, path]));
const authRoutes = new Set(["/login", "/register", "/forgot-password"]);
const canonicalOrigin = "https://www.budgetlyke.com";
const canonicalPaths = new Map([
  ["/", "/"],
  ["/welcome", "/"],
  ["/privacy-policy", "/privacy-policy"],
  ["/terms-of-service", "/terms-of-service"],
]);
const currentPath = () => `${window.location.pathname}${window.location.search}`;
const paymentEnforcementEnabled = import.meta.env.VITE_ENFORCE_LIFETIME_ACCESS === "true";

export default function App() {
  const [path, setPath] = useState(currentPath);
  const [profile, setProfile] = useState(null);
  const [sessionState, setSessionState] = useState(() => sessionStorage.getItem("budgetly.access") || sessionStorage.getItem("budgetly.refresh") ? "checking" : "signed-out");
  const [sessionError, setSessionError] = useState(""), [validationAttempt, setValidationAttempt] = useState(0);
  const [access, setAccess] = useState({ state: "idle", data: null });
  const accessRequest = useRef(0), billingOwner = useRef(null), deniedOwner = useRef(null);
  const [serverPaymentRequired, setServerPaymentRequired] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem("budgetly.sidebarCollapsed") === "true");
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || localStorage.getItem("budgetly.theme") || "light");

  const clearPrivateState = useCallback((securityBoundary = false) => {
    accessRequest.current += 1;billingOwner.current = null;
    setProfile(null);setAccess({ state: "idle", data: null });setSidebarOpen(false);setSigningOut(false);
    if (securityBoundary) { deniedOwner.current = null;setServerPaymentRequired(false); }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("budgetly.theme", theme);
  }, [theme]);

  useEffect(() => {
    const sync = () => setPath(currentPath());
    window.addEventListener("popstate", sync);
    const expired = () => {
      // A stale JWT can expire before the callback page mounts. Preserve only
      // its validated reference so login can resume server-side verification.
      if (window.location.pathname === "/payment/complete") {
        const reference = paymentReturnReference(currentPath());
        if (reference) rememberPurchaseReference(reference, billingOwner.current ?? undefined);
      }
      clearPrivateState(true);setSessionError("");setSessionState("signed-out");
      window.history.replaceState({}, "", "/login?session=expired"); setPath(currentPath());
    };
    window.addEventListener("budgetly:unauthorized", expired);
    return () => { window.removeEventListener("popstate", sync); window.removeEventListener("budgetly:unauthorized", expired); };
  }, [clearPrivateState]);

  const refreshAccess = useCallback(async () => {
    const request = ++accessRequest.current, owner = billingOwner.current;
    setAccess({ state: "checking", data: null });
    try {
      const data = await getAccessStatus();
      if (request !== accessRequest.current || owner !== billingOwner.current) return null;
      setAccess({ state: "ready", data });
      if (hasLifetimeAccess(data)) { deniedOwner.current = null;setServerPaymentRequired(false); }
      return data;
    } catch {
      if (request === accessRequest.current && owner === billingOwner.current) setAccess({ state: "unavailable", data: null });
      return null;
    }
  }, []);

  useEffect(() => {
    if (!sessionStorage.getItem("budgetly.access") && !sessionStorage.getItem("budgetly.refresh")) return;
    let cancelled = false;
    const scope = captureSession(), controller = new AbortController();
    Promise.resolve().then(async () => {
      if (cancelled) return;
      try {
        const user = await readSessionProfile({ signal: controller.signal });
        if (!cancelled && isCurrentSession(scope)) { billingOwner.current = user.id;setProfile(user);setSessionError("");setSessionState("signed-in");refreshAccess(); }
      } catch (error) {
        if (cancelled || !isCurrentSession(scope)) return;
        suspendSession(scope);setSessionError(friendlyErrorMessage(error, { context: "session" }));
      }
    });
    return () => { cancelled = true;controller.abort(); };
  }, [refreshAccess, validationAttempt, clearPrivateState]);

  useEffect(() => {
    const checking = () => {
      // Startup already validates its own profile. Suspend an existing private
      // workspace once when a background request needs shared token refresh.
      if (billingOwner.current == null) return;
      clearPrivateState();setSessionError("");setSessionState("checking");setValidationAttempt(value => value + 1);
    };
    const unavailable = () => {
      if (!sessionStorage.getItem("budgetly.access") && !sessionStorage.getItem("budgetly.refresh")) return;
      clearPrivateState();setSessionError("We couldn’t confirm your sign-in right now. Please try again.");setSessionState("unavailable");
    };
    window.addEventListener("budgetly:session-checking", checking);
    window.addEventListener("budgetly:session-unavailable", unavailable);
    return () => { window.removeEventListener("budgetly:session-checking", checking);window.removeEventListener("budgetly:session-unavailable", unavailable); };
  }, [clearPrivateState]);

  const navigate = useCallback(async (destination, { replace = false } = {}) => {
    if (destination === "/logout") {
      disableGoogleAutoSelect();
      const tokens = clearSession();
      clearPrivateState(true);clearPendingPurchaseReference();setSessionError("");setSessionState("signed-out");destination = "/login";
      void revokeSessionTokens(tokens);
    }
    window.history[replace ? "replaceState" : "pushState"]({}, "", destination);
    setPath(currentPath()); setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [clearPrivateState]);

  const pathname = path.split("?")[0].replace(/\/$/, "") || "/";
  const query = new URLSearchParams(path.split("?")[1] || "");
  const isAuthPath = authRoutes.has(pathname) || pathname.startsWith("/reset-password/");
  const isRecoveryPath = pathname === "/forgot-password" || pathname.startsWith("/reset-password/");
  const isPublicDocument = ["/privacy-policy", "/terms-of-service", "/legal-updates"].includes(pathname);
  const isLandingPath = pathname === "/welcome" || (pathname === "/" && sessionState !== "signed-in");
  const signedInOverview = pathname === "/" && sessionState === "signed-in";
  const canonicalPath = pathname === "/" && sessionState !== "signed-out"
    ? undefined
    : canonicalPaths.get(pathname);

  useEffect(() => {
    // Vercel serves the same HTML at / for the public landing and private overview.
    if (signedInOverview) {
      const robots = document.createElement("meta");
      robots.name = "robots";
      robots.content = "noindex, nofollow";
      document.head.append(robots);
      return () => robots.remove();
    }
    if (!canonicalPath) return;

    const canonical = document.createElement("link");
    canonical.rel = "canonical";
    canonical.href = `${canonicalOrigin}${canonicalPath}`;
    document.head.append(canonical);
    return () => canonical.remove();
  }, [canonicalPath, signedInOverview]);

  const isPaymentCompletePath = pathname === "/payment/complete";
  const isPaymentRequiredPath = pathname === "/payment-required";
  const accountManagement = pathname === "/settings" || pathname === "/help";
  const billingBypass = isPublicDocument || isLandingPath || isRecoveryPath || isPaymentRequiredPath || isPaymentCompletePath || accountManagement;
  const confirmedAccess = access.state === "ready" && hasLifetimeAccess(access.data);
  const enforceAccess = paymentEnforcementEnabled || serverPaymentRequired;
  const resumeReference = pendingPurchaseReference(profile?.id);
  const authPaymentDestination = resumeReference ? `/payment/complete?reference=${encodeURIComponent(resumeReference)}` : query.get("returnTo") === "payment-required" ? "/payment-required" : null;
  const authDestination = authPaymentDestination || (query.get("linkGoogle") === "1" ? "/settings?connectGoogle=1" : null);

  const completeAuthentication = useCallback((user, scope) => {
    if (!isCurrentSession(scope)) return;
    deniedOwner.current = null;setServerPaymentRequired(false);
    billingOwner.current = user.id;
    setProfile(user); setSessionState("signed-in");
    refreshAccess();
  }, [refreshAccess]);

  const validateAuthentication = useCallback((scope) => {
    if (!isCurrentSession(scope)) return;
    clearPrivateState(true);setSessionError("");setSessionState("checking");setValidationAttempt(value => value + 1);
  }, [clearPrivateState]);

  const paymentAccessChecked = useCallback((data, owner) => {
    if (owner !== billingOwner.current) return;
    const validated = validateAccessStatus(data);
    accessRequest.current += 1;setAccess({ state: "ready", data: validated });
    if (hasLifetimeAccess(validated)) { deniedOwner.current = null;setServerPaymentRequired(false); }
  }, []);

  useEffect(() => {
    const paymentRequired = () => {
      const owner = billingOwner.current;
      if (owner == null || deniedOwner.current === owner) return;
      deniedOwner.current = owner;setServerPaymentRequired(true);
      const route = window.location.pathname.replace(/\/$/, "") || "/";
      const recoveryRoute = ["/welcome", "/settings", "/help", "/privacy-policy", "/terms-of-service", "/legal-updates", "/payment-required", "/payment/complete"].includes(route) || authRoutes.has(route) || route.startsWith("/reset-password/");
      if (!recoveryRoute) navigate("/payment-required", { replace: true });
      refreshAccess();
    };
    window.addEventListener("budgetly:payment-required", paymentRequired);
    return () => window.removeEventListener("budgetly:payment-required", paymentRequired);
  }, [navigate, refreshAccess]);

  useEffect(() => {
    let destination;
    if (sessionState === "signed-out" && !isAuthPath && !isPublicDocument && !isLandingPath && !isPaymentCompletePath) destination = isPaymentRequiredPath ? "/login?returnTo=payment-required" : "/login";
    else if (sessionState === "signed-in" && isAuthPath && !isRecoveryPath) {
      // With enforcement off, billing outages must not delay existing users.
      if (!enforceAccess || authDestination || ["ready", "unavailable"].includes(access.state)) destination = authDestination || (enforceAccess && !confirmedAccess ? "/payment-required" : "/");
    }
    else if (sessionState === "signed-in" && enforceAccess && !billingBypass && !isAuthPath && ["ready", "unavailable"].includes(access.state) && !confirmedAccess) destination = "/payment-required";
    if (!destination) return;
    // URL synchronization follows the guarded render. Protected content is
    // never mounted while the future payment gate is deciding access.
    let current = true;
    queueMicrotask(() => { if (current) navigate(destination, { replace: true }); });
    return () => { current = false; };
  }, [sessionState, isAuthPath, isRecoveryPath, isPublicDocument, isLandingPath, isPaymentCompletePath, isPaymentRequiredPath, billingBypass, access.state, confirmedAccess, authDestination, enforceAccess, navigate]);

  if (["checking", "unavailable"].includes(sessionState)) return <StartupLoading error={sessionError} onRetry={() => { setSessionError("");setSessionState("checking");setValidationAttempt(value => value + 1); }} onSignOut={() => navigate("/logout")} />;
  if (isLandingPath) return <LandingPage navigate={navigate} theme={theme} onThemeChange={setTheme} />;
  if (sessionState === "signed-out" && isPublicDocument) return <LegalDraftPage path={path} navigate={navigate} theme={theme} onThemeChange={setTheme} />;
  if (isPaymentCompletePath) return <PaymentCompletePage key={`${profile?.id || "signed-out"}:${query.get("reference") || "missing"}`} path={path} profile={profile} isAuthenticated={sessionState === "signed-in"} onAccessChecked={paymentAccessChecked} navigate={navigate} theme={theme} onThemeChange={setTheme} />;
  if (sessionState === "signed-out" || isRecoveryPath) return <AuthPage key={pathname} path={isAuthPath ? path : "/login"} theme={theme} onThemeChange={setTheme} navigate={navigate} onAuthenticated={completeAuthentication} onSessionStarted={validateAuthentication} onSessionCleared={() => { clearSession();clearPrivateState(true);setSessionError("");setSessionState("signed-out"); }} />;
  if (isAuthPath) return <StartupLoading />;
  if (isPaymentRequiredPath || (enforceAccess && !billingBypass && !confirmedAccess && access.state === "unavailable")) return <PaymentRequiredPage profile={profile} access={access} onRefreshAccess={refreshAccess} navigate={navigate} theme={theme} onThemeChange={setTheme} />;
  if (enforceAccess && !billingBypass && !confirmedAccess) return access.state === "ready" ? <PaymentRequiredPage profile={profile} access={access} onRefreshAccess={refreshAccess} navigate={navigate} theme={theme} onThemeChange={setTheme} /> : <PaymentAccessLoading navigate={navigate} theme={theme} onThemeChange={setTheme} />;

  const screen = routeScreens[sessionState === "signed-in" && isAuthPath && !isRecoveryPath ? "/" : pathname] || "";
  const title = profileDisplayName(profile);
  const needsProfileName = !profileDisplayName(profile, "");
  const reopenOnboarding = () => {
    if (profile?.id) {
      localStorage.removeItem(`budgetly.onboarding.hidden.${profile.id}`);
      localStorage.removeItem(`budgetly.onboarding.complete.${profile.id}`);
      localStorage.setItem(`budgetly.onboarding.reopen.${profile.id}`, "true");
    }
    navigate("/");
  };
  return <AccountLegalProvider key={profile?.id}><div className={`app-shell ${screen === "Overview" ? "app-shell-orbit" : ""} ${sidebarCollapsed ? "app-shell-collapsed" : ""}`}>
    <a className="skip-link" href="#main-content">Skip to content</a>
    <span className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">{signingOut ? "Signing out…" : ""}</span>
    <Sidebar orbit signingOut={signingOut} activePage={screen} onNavigate={(destination) => navigate(routePaths[destination] || "/")} open={sidebarOpen} onClose={() => setSidebarOpen(false)} onLogout={() => navigate("/logout")} profile={profile} collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed((current) => { const next = !current; localStorage.setItem("budgetly.sidebarCollapsed", String(next)); return next; })} />
    <main id="main-content" className="main-area" tabIndex={-1} inert={sidebarOpen ? true : undefined}>
      <header className="topbar">
        <div className="topbar-left"><button className="icon-button mobile-menu" aria-label="Open navigation" aria-expanded={sidebarOpen} aria-controls="budgetly-sidebar" onClick={() => setSidebarOpen(true)}><Menu size={20} /></button><span className="workspace-label"><span className="workspace-desktop">Personal workspace</span><span className="workspace-mobile">Budgetly · {screen || "Not found"}</span></span></div>
        <div className="topbar-actions">
          <button className="icon-button theme-toggle" onClick={() => setTheme((current) => current === "dark" ? "light" : "dark")} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`} title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}>{theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}</button>
          <button className="topbar-profile" aria-label={`${title}, open settings`} title={title} onClick={() => navigate("/settings")}><span className="topbar-avatar">{Array.from(title)[0].toUpperCase()}</span><span className="topbar-user"><strong>{title}</strong><small>{needsProfileName ? "Complete profile" : "Personal account"}</small></span><ArrowRight size={15} /></button>
        </div>
      </header>
      <LegalUpdateNotice navigate={navigate} screen={screen} />
      {screen ? <FinancePage key={screen} logoutBusy={signingOut} screen={screen} initialAction={query.get("new")} profile={profile} theme={theme} onThemeChange={setTheme} onProfileChange={setProfile} onReopenOnboarding={reopenOnboarding} navigate={navigate} /> : <section className="page-content not-found"><h1>That page isn’t here.</h1><p className="muted-text">The address may have changed, or the page may not exist.</p><button className="primary-button" onClick={() => navigate("/")}>Back to overview <ArrowRight size={15} /></button></section>}
    </main>
  </div></AccountLegalProvider>;
}
