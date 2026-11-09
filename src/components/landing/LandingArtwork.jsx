// Native SVG artwork from the approved Orbit prototype. No external imagery.
export function LandingSymbols() {
  return (<svg className="svg-library" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><defs>
    <symbol id="landing-budgetly-mark" viewBox="0 0 36 36"><path d="M8 8h14a7 7 0 0 1 0 14H8z" /><path d="M8 14h17a7 7 0 0 1 0 14H8z" /></symbol>
    <symbol id="landing-arrow" viewBox="0 0 24 24"><path d="M4 12h15m-6-6 6 6-6 6" /></symbol>
    <symbol id="landing-arrow-up" viewBox="0 0 24 24"><path d="M6 18 18 6M6 6h12v12" /></symbol>
    <symbol id="landing-grid" viewBox="0 0 24 24"><rect x="4" y="4" width="6" height="6" rx="1.5" /><rect x="14" y="4" width="6" height="6" rx="1.5" /><rect x="4" y="14" width="6" height="6" rx="1.5" /><rect x="14" y="14" width="6" height="6" rx="1.5" /></symbol>
    <symbol id="landing-activity" viewBox="0 0 24 24"><path d="M4 8h16M16 4l4 4-4 4M20 16H4m4-4-4 4 4 4" /></symbol>
    <symbol id="landing-wallet" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="15" rx="3" /><path d="M3 9h18m-6 4h6v4h-6z" /></symbol>
    <symbol id="landing-target" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></symbol>
    <symbol id="landing-leaf" viewBox="0 0 24 24"><path d="M5 18C3 7 10 3 20 3c0 10-4 16-14 15M4 21 16 8" /></symbol>
    <symbol id="landing-loan" viewBox="0 0 24 24"><path d="M3 15h5l4 3h6l3-5h-8M3 10h5l5 3M15 2v7m-3-5h6m-6 3h6" /></symbol>
    <symbol id="landing-moon" viewBox="0 0 24 24"><path d="M20 14A8 8 0 0 1 10 4 8 8 0 1 0 20 14Z" /></symbol>
    <symbol id="landing-sun" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2" /></symbol>
    <symbol id="landing-plus" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></symbol>
  </defs></svg>);
}
export function GlassMonogram({ className = "" }) {
  return <div className={`cinema-sculpture ${className}`} aria-hidden="true">      <svg className="glass-monogram" viewBox="0 0 900 700" focusable="false">
    <defs>
      <linearGradient id="landing-cin-depth" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#50628C" stopOpacity=".7" /><stop offset=".47" stopColor="#A3B1D8" stopOpacity=".24" /><stop offset="1" stopColor="#273957" stopOpacity=".86" /></linearGradient>
      <linearGradient id="landing-cin-rim" x1=".05" y1="0" x2=".91" y2="1"><stop stopColor="#F1D4B7" /><stop offset=".23" stopColor="#D5DEFF" /><stop offset=".48" stopColor="#748AB7" stopOpacity=".55" /><stop offset=".7" stopColor="#D4EDFF" /><stop offset="1" stopColor="#C2C5FF" stopOpacity=".7" /></linearGradient>
      <linearGradient id="landing-cin-face" x1="0" y1=".1" x2="1" y2=".8"><stop stopColor="#BDC9ED" stopOpacity=".34" /><stop offset=".3" stopColor="#657DA7" stopOpacity=".14" /><stop offset=".58" stopColor="#9BACE6" stopOpacity=".1" /><stop offset=".83" stopColor="#D5EDFF" stopOpacity=".4" /><stop offset="1" stopColor="#8A94C2" stopOpacity=".3" /></linearGradient>
      <linearGradient id="landing-cin-highlight" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#FFF3E5" /><stop offset=".4" stopColor="#E3EBFF" stopOpacity=".12" /><stop offset=".7" stopColor="#D5EDFF" stopOpacity=".8" /><stop offset="1" stopColor="#DCE3FF" stopOpacity=".06" /></linearGradient>
      <radialGradient id="landing-cin-floor"><stop stopColor="#A7B7EA" stopOpacity=".24" /><stop offset="1" stopColor="#5B6EAA" stopOpacity="0" /></radialGradient>
      <filter id="landing-cin-shadow" x="-30%" y="-30%" width="170%" height="180%"><feDropShadow dx="10" dy="29" stdDeviation="17" floodColor="#030812" floodOpacity=".6" /></filter>
      <filter id="landing-cin-soft"><feGaussianBlur stdDeviation="6" /></filter>
      <path id="landing-cin-upper" d="M195 140H505a105 105 0 0 1 0 210H195Z" />
      <path id="landing-cin-lower" d="M195 265H565a105 105 0 0 1 0 210H195Z" />
      <mask id="landing-cin-rim-mask" maskUnits="userSpaceOnUse" x="-100" y="-100" width="1100" height="900">
        <g fill="none" stroke="#FFF" strokeWidth="53"><use href="#landing-cin-upper" /><use href="#landing-cin-lower" /></g>
        <g fill="none" stroke="#000" strokeWidth="47"><use href="#landing-cin-upper" /><use href="#landing-cin-lower" /></g>
      </mask>
    </defs>
    <ellipse cx="472" cy="620" rx="308" ry="30" fill="url(#landing-cin-floor)" stroke="none" filter="url(#landing-cin-soft)" />
    <g transform="translate(38 17) rotate(-17 445 325) skewY(-5)" fill="none" strokeLinejoin="round" filter="url(#landing-cin-shadow)">
      <g transform="translate(24 25)" stroke="url(#landing-cin-depth)" strokeWidth="57" opacity=".48"><use href="#landing-cin-upper" /><use href="#landing-cin-lower" /></g>
      <g stroke="url(#landing-cin-rim)" strokeWidth="53" mask="url(#landing-cin-rim-mask)"><use href="#landing-cin-upper" /><use href="#landing-cin-lower" /></g>
      <g stroke="url(#landing-cin-face)" strokeWidth="47"><use href="#landing-cin-upper" /><use href="#landing-cin-lower" /></g>
      <g stroke="url(#landing-cin-highlight)" strokeWidth="2" transform="translate(-8 -9)"><use href="#landing-cin-upper" /><use href="#landing-cin-lower" /></g>
      <g className="glass-reflection" stroke="url(#landing-cin-highlight)" strokeWidth="8" opacity=".35" transform="translate(0 -12)"><use href="#landing-cin-upper" /><use href="#landing-cin-lower" /></g>
      <path d="M206 141H504a104 104 0 0 1 88 49M207 268H565a104 104 0 0 1 91 54" stroke="#F0F4FF" strokeOpacity=".5" strokeWidth="1.8" />
    </g>
  </svg></div>;
}
export function LandingIcon({ name, ...props }) { return <svg aria-hidden="true" {...props}><use href={`#landing-${name}`} /></svg>; }
