import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import BrandMark from "../components/BrandMark";
import LifetimeOfferNote from "../components/LifetimeOfferNote";
import { GlassMonogram, LandingSymbols, LandingIcon as Icon } from "../components/landing/LandingArtwork";
import LandingPreview from "../components/landing/LandingPreview";
import { AccountsSection, SpendingSection, PlansSection, LoansSection, LandingFooter } from "../components/landing/LandingSections";
import "../styles/orbit-public.css";
import "../styles/orbit-landing.css";
import "../styles/orbit-landing-theme.css";
import "../styles/orbit-landing-transitions.css";

const topics = [["accounts", "Accounts"], ["spending", "Spending"], ["plans", "Plans"], ["loans", "Loans"]];
const motionQuery = () => window.matchMedia("(prefers-reduced-motion: reduce)");
const subscribeMotion = callback => { const query = motionQuery(); query.addEventListener("change", callback); return () => query.removeEventListener("change", callback); };

export default function LandingPage({ navigate, theme, onThemeChange }) {
  const root = useRef(null), menu = useRef(null), menuButton = useRef(null), menuDestination = useRef(null);
  const [tone, setTone] = useState("hero"), [paused, setPaused] = useState(false), [menuOpen, setMenuOpen] = useState(false);
  const reduced = useSyncExternalStore(subscribeMotion, () => motionQuery().matches);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Budgetly — Money, without the overwhelm.";
    const page = root.current;
    if (!("IntersectionObserver" in window)) return () => { document.title = previousTitle; };
    const reveals = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add("is-visible"); reveals.unobserve(entry.target); }
    }), { threshold: 0.08 });
    page.querySelectorAll(".reveal").forEach(element => reveals.observe(element));
    page.classList.add("has-motion");
    let navigation;
    const watchNavigation = () => {
      navigation?.disconnect();
      navigation = new IntersectionObserver(entries => entries.forEach(entry => {
        if (entry.isIntersecting) setTone(entry.target.classList.contains("hero-cinematic") ? "hero" : entry.target.matches(".spending-section,.closing") ? "dark" : "light");
      }), { rootMargin: `-100px 0px -${Math.max(0, innerHeight - 116)}px 0px` });
      page.querySelectorAll("main > section, footer.closing").forEach(element => navigation.observe(element));
    };
    watchNavigation();
    window.addEventListener("resize", watchNavigation);
    return () => { document.title = previousTitle; reveals.disconnect(); navigation?.disconnect(); page.classList.remove("has-motion"); window.removeEventListener("resize", watchNavigation); };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const resize = () => { if (innerWidth >= 1024) menu.current?.close(); };
    window.addEventListener("resize", resize);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("resize", resize); };
  }, [menuOpen]);

  function followLink(event) {
    const anchor = event.target.closest("a[href]");
    if (!anchor || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || anchor.target || anchor.hasAttribute("download")) return;
    const href = anchor.getAttribute("href");
    if (!href.startsWith("/") && !href.startsWith("#")) return;
    if (href.startsWith("/")) { event.preventDefault(); menu.current?.close(); navigate(href); return; }
    const target = root.current.querySelector(href);
    if (!target) return;
    event.preventDefault();
    const focus = target.querySelector("h1,h2") || target;
    focus.setAttribute("tabindex", "-1");
    if (menu.current?.open) { menuDestination.current = focus; menu.current.close(); }
    if (window.location.hash !== href) window.history.pushState({}, "", href);
    target.scrollIntoView({ behavior: reduced ? "instant" : "smooth", block: "start" });
    focus.focus({ preventScroll: true });
  }

  const changeTheme = () => onThemeChange(theme === "dark" ? "light" : "dark");
  const themeControl = <button className="landing-theme-toggle" type="button" onClick={changeTheme} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`} title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}><Icon name={theme === "dark" ? "sun" : "moon"} /></button>;
  return <div className="orbit-landing orbit-public" ref={root} data-ambient-paused={paused || reduced} onClick={followLink}>
    <LandingSymbols />
    <header className="nav" data-tone={tone}>
      <div className="wrap nav-bar">
        <a className="skip-link" href="#landing-content">Skip to content</a>
        <a className="brand nav__logo" href="#top" aria-label="Budgetly home"><BrandMark className="brand-mark" /><span>budgetly<span className="brand-dot">.</span></span></a>
        <nav className="nav__links" aria-label="Main">{topics.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}</nav>
        <div className="nav-actions">
          <a className="landing-explore" href="#accounts">Explore Budgetly <Icon name="arrow" /></a>
          {themeControl}<a className="sign-in" href="/login">Sign in</a><a className="btn btn--primary nav-start" href="/register">Get started <Icon name="arrow" /></a>
          <button ref={menuButton} className="menu-button" type="button" aria-controls="landing-menu" aria-expanded={menuOpen} aria-label="Open navigation" onClick={() => { menu.current.showModal(); setMenuOpen(true); }}><span /><span /></button>
        </div>
      </div>
    </header>
    <main id="landing-content" tabIndex={-1}>
      <section className="hero hero-cinematic" id="top" aria-labelledby="hero-title">
        <div className="cinema-background" aria-hidden="true" /><GlassMonogram /><div className="cinema-shade" aria-hidden="true" />
        <div className="wrap cinema-copy">
          <h1 id="hero-title" aria-label="Money, without the overwhelm."><span>Money, without</span><span>the overwhelm.</span></h1>
          <p>Your spending, savings and plans, all in one calmer place.</p>
          <div className="btn-row"><a className="btn btn--primary" href="/register">Get started <Icon name="arrow" /></a><a className="btn btn--secondary" href="#accounts">Explore Budgetly</a></div>
          <LifetimeOfferNote />
        </div>
        <div className="cinema-preview"><LandingPreview theme={theme} onThemeChange={onThemeChange} /></div>
      </section>
      <AccountsSection /><SpendingSection /><PlansSection /><LoansSection />
    </main>
    <LandingFooter lightingControl={<button className="landing-lighting-control" type="button" disabled={reduced} onClick={() => setPaused(value => !value)}>{reduced ? "Reduced motion enabled" : paused ? "Resume ambient lighting" : "Pause ambient lighting"}</button>} />
    <dialog id="landing-menu" ref={menu} aria-labelledby="landing-menu-title" onClose={() => { setMenuOpen(false); (menuDestination.current || menuButton.current)?.focus({ preventScroll: true }); menuDestination.current = null; }}>
      <div className="mobile-menu-head"><a href="#top" className="brand"><BrandMark className="brand-mark" />budgetly.</a><button type="button" aria-label="Close navigation" onClick={() => menu.current.close()}>×</button></div>
      <h2 id="landing-menu-title" className="sr-only">Budgetly navigation</h2>
      <nav aria-label="Mobile navigation">{topics.map(([id, label], index) => <a key={id} href={`#${id}`}>{label}<span>0{index + 1}</span></a>)}</nav>
      <div className="mobile-menu-actions"><a className="btn btn--primary" href="/register">Get started <Icon name="arrow" /></a><a className="btn btn--secondary" href="/login">Sign in</a></div>
      <div className="landing-menu-settings">{themeControl}<span>{theme === "dark" ? "Midnight" : "Daylight"} theme</span></div>
    </dialog>
  </div>;
}
