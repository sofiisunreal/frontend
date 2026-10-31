import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Menu, Moon, Sun } from "lucide-react";
import Sidebar from "./components/Sidebar";
import AuthPage from "./pages/AuthPage";
import FinancePage from "./pages/FinancePage";
import LegalDraftPage from "./pages/LegalDraftPage";
import { api } from "./lib/api";
import "./index.css";

const routeScreens = {
  "/": "Overview", "/transactions": "Transactions", "/accounts": "Accounts", "/transfers": "Transfers",
  "/budgets": "Budgets & Savings", "/savings": "Savings goals", "/loans": "Loans",
  "/categories": "Categories", "/exchange-rates": "Exchange rates", "/settings": "Settings", "/help": "Help",
  "/privacy-policy": "Privacy policy", "/terms-of-service": "Terms of service",
};
const routePaths = Object.fromEntries(Object.entries(routeScreens).map(([path, screen]) => [screen, path]));
const authRoutes = new Set(["/login", "/register", "/forgot-password"]);
const currentPath = () => `${window.location.pathname}${window.location.search}`;

export default function App() {
  const [path, setPath] = useState(currentPath);
  const [profile, setProfile] = useState(null);
  const [sessionState, setSessionState] = useState(() => sessionStorage.getItem("budgetly.access") ? "checking" : "signed-out");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem("budgetly.sidebarCollapsed") === "true");
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || localStorage.getItem("budgetly.theme") || "light");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("budgetly.theme", theme);
  }, [theme]);

  useEffect(() => {
    const sync = () => setPath(currentPath());
    window.addEventListener("popstate", sync);
    const expired = () => { setProfile(null); setSessionState("signed-out"); };
    window.addEventListener("budgetly:unauthorized", expired);
    return () => { window.removeEventListener("popstate", sync); window.removeEventListener("budgetly:unauthorized", expired); };
  }, []);

  useEffect(() => {
    if (!sessionStorage.getItem("budgetly.access")) return;
    let cancelled = false;
    api("/api/auth/profile/").then((user) => {
      if (!cancelled) { setProfile(user); setSessionState("signed-in"); }
    }).catch(() => {
      sessionStorage.removeItem("budgetly.access");
      sessionStorage.removeItem("budgetly.refresh");
      if (!cancelled) { setProfile(null); setSessionState("signed-out"); }
    });
    return () => { cancelled = true; };
  }, []);

  const navigate = useCallback(async (destination) => {
    if (destination === "/logout") {
      const refresh = sessionStorage.getItem("budgetly.refresh");
      try { if (refresh) await api("/api/auth/logout/", { method: "POST", body: JSON.stringify({ refresh }) }); } catch { /* Clear this browser session even if the service is unavailable. */ }
      sessionStorage.removeItem("budgetly.access"); sessionStorage.removeItem("budgetly.refresh");
      setProfile(null); setSessionState("signed-out"); destination = "/login";
    }
    window.history.pushState({}, "", destination);
    setPath(currentPath()); setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const pathname = path.split("?")[0].replace(/\/$/, "") || "/";
  const query = new URLSearchParams(path.split("?")[1] || "");
  const isAuthPath = authRoutes.has(pathname) || pathname.startsWith("/reset-password/");
  const isRecoveryPath = pathname === "/forgot-password" || pathname.startsWith("/reset-password/");
  const isPublicDocument = pathname === "/privacy-policy" || pathname === "/terms-of-service";

  useEffect(() => {
    if (sessionState === "signed-out" && !isAuthPath && !isPublicDocument) window.history.replaceState({}, "", "/login");
    if (sessionState === "signed-in" && isAuthPath && !isRecoveryPath) {
      window.history.replaceState({}, "", "/");
    }
  }, [sessionState, isAuthPath, isRecoveryPath, isPublicDocument]);

  if (sessionState === "checking") return <div className="session-loading"><span className="brand-mark">B</span><p>Opening your workspace…</p></div>;
  if (sessionState === "signed-out" && isPublicDocument) return <LegalDraftPage path={pathname} navigate={navigate} />;
  if (sessionState === "signed-out" || isRecoveryPath) return <AuthPage key={pathname} path={isAuthPath ? path : "/login"} navigate={navigate} onAuthenticated={(user) => { setProfile(user); setSessionState("signed-in"); navigate("/"); }} onSessionCleared={() => { sessionStorage.removeItem("budgetly.access"); sessionStorage.removeItem("budgetly.refresh"); setProfile(null); setSessionState("signed-out"); }} />;

  const screen = routeScreens[sessionState === "signed-in" && isAuthPath && !isRecoveryPath ? "/" : pathname] || "";
  const title = `${profile?.first_name || profile?.username || "My account"}`;
  const reopenOnboarding = () => {
    if (profile?.id) {
      localStorage.removeItem(`budgetly.onboarding.hidden.${profile.id}`);
      localStorage.removeItem(`budgetly.onboarding.complete.${profile.id}`);
    }
    navigate("/");
  };
  return <div className={`app-shell ${sidebarCollapsed ? "app-shell-collapsed" : ""}`}>
    <Sidebar activePage={screen} onNavigate={(destination) => navigate(routePaths[destination] || "/")} open={sidebarOpen} onClose={() => setSidebarOpen(false)} onLogout={() => navigate("/logout")} profile={profile} collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed((current) => { const next = !current; localStorage.setItem("budgetly.sidebarCollapsed", String(next)); return next; })} />
    <main className="main-area">
      <header className="topbar">
        <div className="topbar-left"><button className="icon-button mobile-menu" aria-label="Open navigation" aria-expanded={sidebarOpen} aria-controls="budgetly-sidebar" onClick={() => setSidebarOpen(true)}><Menu size={20} /></button><div className="breadcrumb"><span>Workspace</span><span className="breadcrumb-slash">/</span><strong>{screen || "Not found"}</strong></div></div>
        <div className="topbar-actions"><button className="icon-button theme-toggle" onClick={() => setTheme((current) => current === "dark" ? "light" : "dark")} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`} title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}>{theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}</button><button className="topbar-profile" onClick={() => navigate("/settings")}><span className="topbar-avatar">{(profile?.first_name || profile?.username || "B").slice(0, 1).toUpperCase()}</span><span className="topbar-user"><strong>{title}</strong><small>Personal account</small></span><ArrowRight size={15} /></button></div>
      </header>
      {screen ? <FinancePage key={screen} screen={screen} initialAction={query.get("new")} profile={profile} theme={theme} onThemeChange={setTheme} onProfileChange={setProfile} onReopenOnboarding={reopenOnboarding} navigate={navigate} /> : <section className="page-content not-found"><h1>That page isn’t here.</h1><p className="muted-text">The address may have changed, or the page may not exist.</p><button className="primary-button" onClick={() => navigate("/")}>Back to overview <ArrowRight size={15} /></button></section>}
    </main>
  </div>;
}
