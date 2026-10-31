import { useEffect } from "react";
import { ArrowLeftRight, BadgeDollarSign, CircleHelp, HandCoins, LayoutDashboard, Leaf, LogOut, PanelLeftClose, PanelLeftOpen, Settings, Tags, Target, Wallet, X } from "lucide-react";

const navigation = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Transactions", icon: ArrowLeftRight },
  { label: "Accounts", icon: Wallet },
  { label: "Transfers", icon: ArrowLeftRight },
  { label: "Budgets & Savings", icon: Target },
  { label: "Savings goals", icon: Leaf },
  { label: "Loans", icon: HandCoins },
  { label: "Categories", icon: Tags },
  { label: "Exchange rates", icon: BadgeDollarSign },
  { label: "Help", icon: CircleHelp },
];

export default function Sidebar({ activePage, onNavigate, open, onClose, onLogout, profile, collapsed, onToggleCollapse }) {
  const displayName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || profile?.username || "Personal account";
  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open, onClose]);
  return <>
    {open && <button className="sidebar-overlay" aria-label="Close navigation" onClick={onClose} />}
    <aside id="budgetly-sidebar" className={`sidebar ${open ? "sidebar-open" : ""} ${collapsed ? "sidebar-collapsed" : ""}`}>
      <div className="sidebar-brand"><div className="brand-mark"><Wallet size={22} strokeWidth={2.2} /></div><div className="sidebar-brand-copy"><h1>budgetly</h1><p>PERSONAL FINANCE</p></div><button className="collapse-toggle" onClick={onToggleCollapse} aria-label={collapsed ? "Expand navigation" : "Collapse navigation"} aria-pressed={collapsed} title={collapsed ? "Expand navigation" : "Collapse navigation"}>{collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}</button><button className="mobile-close" onClick={onClose} aria-label="Close menu"><X size={20} /></button></div>
      <p className="nav-caption">YOUR MONEY</p>
      <nav className="sidebar-nav" aria-label="Main navigation">{navigation.map(({ label, icon: Icon }) => <button key={label} className={`nav-item ${activePage === label ? "nav-item-active" : ""}`} aria-label={label} title={collapsed ? label : undefined} aria-current={activePage === label ? "page" : undefined} onClick={() => { onNavigate(label); onClose(); }}><Icon size={18} strokeWidth={1.85} /><span>{label}</span></button>)}</nav>
      <div className="sidebar-bottom"><p className="nav-caption">ACCOUNT</p><button className={`nav-item ${activePage === "Settings" ? "nav-item-active" : ""}`} aria-label="Settings" title={collapsed ? "Settings" : undefined} aria-current={activePage === "Settings" ? "page" : undefined} onClick={() => { onNavigate("Settings"); onClose(); }}><Settings size={18} strokeWidth={1.85} /><span>Settings</span></button><div className="sidebar-profile"><div className="profile-avatar" aria-hidden="true">{displayName.slice(0, 1).toUpperCase()}</div><div className="profile-copy"><strong>{displayName}</strong><span>Personal account</span></div><button className="sidebar-signout" aria-label="Sign out" title={collapsed ? "Sign out" : undefined} onClick={onLogout}><span>Sign out</span><LogOut size={16} /></button></div></div>
    </aside>
  </>;
}
