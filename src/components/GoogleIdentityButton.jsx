import { useEffect, useRef, useState } from "react";
import { InlineLoading } from "./Loading";
import { ErrorNotice } from "./FormFeedback";
import { friendlyErrorMessage } from "../lib/errors";
import { isGoogleClientId } from "../lib/googleState";
import { renderGoogleIdentityButton } from "../lib/googleIdentity";
import "../styles/orbit-google.css";

const clientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || "").trim();

export default function GoogleIdentityButton({ theme, intent = "signin", enabled = true, busy = false, disabledReason = "", cancelKey = 0, onCredential, onFallback }) {
  const host = useRef(null), dispose = useRef(null), lock = useRef(false);
  const callbacks = useRef({ onCredential, busy, enabled });
  const [phase, setPhase] = useState("loading"), [error, setError] = useState(""), [hint, setHint] = useState("");
  const [attempt, setAttempt] = useState(0), [width, setWidth] = useState(0);
  const configured = isGoogleClientId(clientId);
  const context = intent === "link" ? "googleLink" : intent === "signup" ? "googleRegister" : "googleLogin";
  useEffect(() => { callbacks.current = { onCredential, busy, enabled }; }, [onCredential, busy, enabled]);
  useEffect(() => {
    if (!host.current || !configured || !enabled) return;
    const observer = new ResizeObserver(entries => setWidth(Math.floor(entries[0].contentRect.width)));
    observer.observe(host.current);
    return () => observer.disconnect();
  }, [configured, enabled]);
  useEffect(() => {
    if (!configured || !enabled || !host.current || width === 0) return;
    let current = true;
    const controller = new AbortController();
    const element = host.current;
    Promise.resolve().then(async () => {
      if (!current) return;
      setPhase("loading");setError("");setHint("");
      try {
        const cleanup = await renderGoogleIdentityButton(element, { clientId, theme, intent, signal: controller.signal,
          onClick: () => { if (current) setHint(intent === "link" ? "Finish in the Google window, or cancel to try again." : "Finish in the Google window, or use your password."); },
          onCredential: credential => {
            if (!current || lock.current || callbacks.current.busy || !callbacks.current.enabled) return;
            lock.current = true;setHint("");
            Promise.resolve().then(() => callbacks.current.onCredential(credential)).catch(error => {
              if (current) setError(friendlyErrorMessage(error, { context }));
            }).finally(() => { lock.current = false;if (current) setAttempt(value => value + 1); });
          },
        });
        if (!current) { cleanup();return; }
        dispose.current = cleanup;setPhase("ready");
      } catch (error) {
        if (current) { setError(friendlyErrorMessage(error, { context }));setPhase("error"); }
      }
    });
    return () => { current = false;controller.abort();dispose.current?.();dispose.current = null; };
  }, [configured, enabled, theme, intent, attempt, cancelKey, width, context]);

  if (!configured) return <p className="google-availability" role="note">Google sign-in isn't available right now. You can use your username and password.</p>;
  if (!enabled) return <p className="google-availability" role="note">{disabledReason || "Complete the required confirmations to continue with Google."}</p>;
  return <div className="google-identity-control" role="group" aria-label={intent === "link" ? "Connect a Google account" : "Google authentication"}>
    {error && <ErrorNotice message={error} />}
    {phase === "loading" && <InlineLoading>Loading Google sign-in…</InlineLoading>}
    <div ref={host} className="google-official-button" inert={busy || phase !== "ready" ? true : undefined} aria-disabled={busy || undefined} />
    {phase === "error" && <button className="text-button google-retry" type="button" disabled={busy} onClick={() => setAttempt(value => value + 1)}>Try Google again</button>}
    {hint && <div className="google-attempt-hint"><p role="status">{hint}</p><button className="text-button" type="button" disabled={busy} onClick={() => { if (lock.current || callbacks.current.busy) return;dispose.current?.();dispose.current = null;setHint("");setAttempt(value => value + 1);onFallback?.(); }}>{intent === "link" ? "Cancel this attempt" : "Use password instead"}</button></div>}
  </div>;
}
