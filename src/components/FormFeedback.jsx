import { CircleAlert } from "lucide-react";
import "../styles/orbit-feedback.css";

export function ErrorNotice({ message, messages = [], className = "" }) {
  if (!message) return null;
  const extra = messages.filter(text => text && !message.includes(text));
  return <div className={`form-message form-message-error orbit-error-notice ${className}`} role="alert" tabIndex={-1} data-error-notice><CircleAlert size={18} aria-hidden="true" /><div><p>{message}</p>{extra.length > 0 && <ul>{extra.map(text => <li key={text}>{text}</li>)}</ul>}</div></div>;
}

export function FieldError({ id, message }) {
  return message ? <span id={id} className="field-error orbit-field-error">{message}</span> : null;
}
