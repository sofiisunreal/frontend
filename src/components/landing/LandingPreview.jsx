import { useState } from "react";
import { balance, categories, money, total } from "./demoData";
import { LandingIcon as Icon } from "./LandingArtwork";

const colours = ["#7198DE", "#A89EE4", "#73C6D2", "#B8C8ED"];

export function CurrencySwitch({ value, onChange, label, className = "" }) {
  return <div className={`currency-switch ${className}`} role="group" aria-label={label}>
    {["KES", "USD"].map(code => <button key={code} type="button" aria-pressed={value === code} onClick={() => onChange(code)}>{code}</button>)}
  </div>;
}

export function SpendingRing({ currency, selected = null }) {
  const sum = total("expense", currency), length = 2 * Math.PI * 68, items = categories(currency);
  return <svg viewBox="0 0 160 160" aria-hidden="true">
    {items.map((item, index) => {
      const share = item.amount / sum, start = items.slice(0, index).reduce((amount, part) => amount + part.amount, 0) / sum;
      return <circle key={item.name} cx="80" cy="80" r="68" stroke={colours[index % colours.length]} strokeDasharray={`${share * length} ${length}`} strokeDashoffset={-start * length} style={selected === null ? undefined : { strokeWidth: index === selected ? 21 : 16, opacity: index === selected ? 1 : 0.55 }} />;
    })}
  </svg>;
}

export default function LandingPreview({ theme, onThemeChange }) {
  const [currency, setCurrency] = useState("KES");
  const income = total("income", currency), expense = total("expense", currency), net = income - expense;
  const scale = Math.max(income, expense);
  return <div className="hero-product app-frame" id="product-preview" data-preview-theme={theme} aria-label="Budgetly overview with illustrative financial data">
    <aside className="app-rail" aria-label="Product preview navigation">
      <Icon name="budgetly-mark" className="app-mark" />
      {[['grid', '#product-preview', 'Overview preview'], ['activity', '/transactions', 'Transactions'], ['wallet', '/accounts', 'Accounts'], ['target', '/budgets', 'Budgets'], ['leaf', '/savings', 'Savings'], ['loan', '/loans', 'Loans']].map(([icon, href, label], index) => <a key={icon} href={href} aria-label={label} className={index === 0 ? "rail-active" : undefined}><Icon name={icon} /></a>)}
    </aside>
    <div className="app-canvas">
      <div className="app-top">
        <div><span className="app-overline">Illustrative preview</span><h2>Overview<span>.</span></h2></div>
        <div className="app-top-controls"><span>Oct 2026</span><button type="button" className="app-icon-button" onClick={() => onThemeChange(theme === "dark" ? "light" : "dark")} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}><Icon name={theme === "dark" ? "sun" : "moon"} /></button><a href="/transactions?new=1" className="app-add" aria-label="Add transaction in Budgetly"><Icon name="plus" /></a></div>
      </div>
      <div className="app-bento">
        <section className="app-balance"><h3>Account balances <Icon name="arrow-up" /></h3><div className="app-primary-balance"><span>KES <small>Kenyan shilling</small></span><strong>{money(balance("KES"))}</strong></div><div className="app-secondary-balance"><div><span>USD</span><strong>{money(balance("USD"), "USD")}</strong></div><span>3 illustrative<br />accounts</span></div></section>
        <section className="app-flow"><div className="app-card-head"><h3>Monthly cash flow</h3><CurrencySwitch className="mini" value={currency} onChange={setCurrency} label="Illustrative cash-flow currency" /></div><div className="app-flow-content" aria-live="polite"><div className="app-flow-net"><span>Net cash flow · {currency}</span><strong>{net > 0 ? "+" : ""}{money(net, currency)}</strong></div><div className="app-bars" role="img" aria-label={`Income ${money(income, currency)}, expenses ${money(expense, currency)}`}><div><i style={{ height: income / scale * 54 }} /><span>Income</span></div><div><i style={{ height: expense / scale * 54 }} /><span>Expenses</span></div></div></div></section>
      </div>
      <div className="app-demo-note"><span className="demo-dot" />Illustrative data · not a live account</div>
      {/* Only decorative UI enters the fade; figures, labels and controls stay above it. */}
      <div className="app-teaser-tail" aria-hidden="true">
        <div className="app-teaser-spend"><span className="app-teaser-caption" /><div className="app-teaser-ring"><SpendingRing currency="KES" /></div></div>
        <div className="app-teaser-activity">{[0, 1, 2].map(row => <div key={row}><i /><span /><span /></div>)}</div>
      </div>
    </div>
  </div>;
}
