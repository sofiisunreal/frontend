import { useEffect, useRef } from "react";
import BrandMark from "./BrandMark";
import { ProgressMark } from "./Loading";
import { ArrowLeftRight, BadgeDollarSign, CircleHelp, HandCoins, LayoutDashboard, Leaf, LogOut, PanelLeftClose, PanelLeftOpen, Settings, Tags, Target, Wallet, X } from "lucide-react";

const navigation = [
  { label: "Your money", items: [
    { label: "Overview", icon: LayoutDashboard },
    { label: "Transactions", icon: ArrowLeftRight },
    { label: "Accounts", icon: Wallet },
    { label: "Transfers", icon: ArrowLeftRight },
  ] },
  { label: "Planning", items: [
    { label: "Budgets & Savings", icon: Target },
    { label: "Savings goals", icon: Leaf },
    { label: "Loans", icon: HandCoins },
  ] },
  { label: "Tools & support", items: [
    { label: "Categories", icon: Tags },
    { label: "Exchange rates", icon: BadgeDollarSign },
    { label: "Help", icon: CircleHelp },
  ] },
];

export default function Sidebar({ activePage, onNavigate, open, onClose, onLogout, profile, collapsed, onToggleCollapse, orbit = false, signingOut = false }) {
  const panel = useRef(null);
  const displayName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || profile?.username || "Personal account";
  useEffect(() => {
    if (!open) return undefined;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const controls = () => [...panel.current.querySelectorAll('button:not(:disabled), a[href]')].filter((item) => item.getClientRects().length);
    panel.current.querySelector(".mobile-close")?.focus();
    const handleKeys = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab") {
        const items = controls();
        if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items.at(-1)?.focus(); }
        else if (!event.shiftKey && document.activeElement === items.at(-1)) { event.preventDefault(); items[0]?.focus(); }
      }
    };
    const desktop = window.matchMedia("(min-width: 1001px)");
    const closeOnDesktop = (event) => { if (event.matches) onClose(); };
    desktop.addEventListener("change", closeOnDesktop);
    window.addEventListener("keydown", handleKeys);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeys);
      desktop.removeEventListener("change", closeOnDesktop);
      previousFocus?.focus?.();
    };
  }, [open, onClose]);
  return <>
    {open && <button className="sidebar-overlay" aria-label="Close navigation" onClick={onClose} />}
    <aside ref={panel} id="budgetly-sidebar" role={open ? "dialog" : undefined} aria-modal={open ? true : undefined} aria-label="Navigation" className={`sidebar ${open ? "sidebar-open" : ""} ${collapsed ? "sidebar-collapsed" : ""}`}>
      <div className="sidebar-brand"><div className="brand-mark" aria-hidden="true">{orbit ? <BrandMark /> : <Wallet size={22} strokeWidth={1.6} />}</div><div className="sidebar-brand-copy"><span className="sidebar-wordmark">budgetly{orbit && <span className="orbit-brand-dot">.</span>}</span>{!orbit && <p>Personal finance</p>}</div><button className="collapse-toggle" onClick={onToggleCollapse} aria-label={collapsed ? "Expand navigation" : "Collapse navigation"} aria-pressed={collapsed} title={collapsed ? "Expand navigation" : "Collapse navigation"}>{collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}</button><button className="mobile-close" onClick={onClose} aria-label="Close menu"><X size={20} /></button></div>
      {orbit && <div className="orbit-workspace"><span aria-hidden="true">{displayName.slice(0, 1).toUpperCase()}</span>Personal workspace</div>}
      <nav className="sidebar-nav" aria-label="Main navigation">{navigation.map((group, index) => <div className="nav-group" key={group.label} role="group" aria-labelledby={`nav-group-${index}`}>
        <p className="nav-caption" id={`nav-group-${index}`}>{group.label}</p>
        {group.items.map(({ label, icon: Icon }) => <button key={label} className={`nav-item ${activePage === label ? "nav-item-active" : ""}`} aria-label={label} title={collapsed ? label : undefined} aria-current={activePage === label ? "page" : undefined} onClick={() => { onNavigate(label); onClose(); }}><Icon size={18} strokeWidth={1.85} /><span>{label}</span></button>)}
      </div>)}</nav>
      <div className="sidebar-bottom"><p className="nav-caption">Account</p><button className={`nav-item ${activePage === "Settings" ? "nav-item-active" : ""}`} aria-label="Settings" title={collapsed ? "Settings" : undefined} aria-current={activePage === "Settings" ? "page" : undefined} onClick={() => { onNavigate("Settings"); onClose(); }}><Settings size={18} strokeWidth={1.85} /><span>Settings</span></button><div className="sidebar-profile">{orbit ? <button className="profile-avatar orbit-profile-button" aria-label={`${displayName}, open settings`} onClick={() => { onNavigate("Settings"); onClose(); }}>{displayName.slice(0, 1).toUpperCase()}</button> : <div className="profile-avatar" aria-hidden="true">{displayName.slice(0, 1).toUpperCase()}</div>}<div className="profile-copy"><strong>{displayName}</strong><span>Personal account</span></div><button className="sidebar-signout" disabled={signingOut} aria-busy={signingOut || undefined} aria-label={signingOut ? "Signing out" : "Sign out"} title={collapsed ? "Sign out" : undefined} onClick={onLogout}><span>{signingOut ? "Signing out…" : "Sign out"}</span>{signingOut ? <ProgressMark /> : <LogOut size={16} />}</button></div></div>
    </aside>
  </>;
}
