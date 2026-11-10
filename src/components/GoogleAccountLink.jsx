import { useEffect, useRef, useState } from "react";
import { ErrorNotice } from "./FormFeedback";
import { InlineLoading } from "./Loading";
import GoogleIdentityButton from "./GoogleIdentityButton";
import { linkGoogleIdentity } from "../lib/googleAuth";
import { friendlyErrorMessage, focusFormError } from "../lib/errors";
import { profileDisplayName } from "../lib/profile";

export default function GoogleAccountLink({ profile, theme, busy: parentBusy, logoutBusy, onBusyChange }) {
  const panel = useRef(null), current = useRef(false), request = useRef(null), lock = useRef(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [notice, setNotice] = useState("");
  useEffect(() => {
    current.current = true;
    if (new URLSearchParams(window.location.search).get("connectGoogle") === "1") requestAnimationFrame(() => { if (current.current) panel.current?.focus(); });
    return () => { current.current = false;request.current?.abort(); };
  }, []);
  async function connect(credential) {
    if (lock.current || parentBusy || logoutBusy || !current.current) return;
    const controller = new AbortController();request.current = controller;
    lock.current = true;setBusy(true);setError("");setNotice("");onBusyChange(true);
    try {
      const response = await linkGoogleIdentity(credential, { signal: controller.signal });
      if (!current.current || controller.signal.aborted) return;
      setNotice(response.linked ? "Google is now connected to this Budgetly account. You can use it for future sign-ins." : "This Google account is already connected to your Budgetly account. Your connection is confirmed.");
    } catch (error) {
      if (!current.current || controller.signal.aborted) return;
      setError(friendlyErrorMessage(error, { context: "googleLink" }));focusFormError(panel.current);
    } finally {
      lock.current = false;
      if (current.current) { setBusy(false);onBusyChange(false); }
    }
  }
  return <section ref={panel} id="google-connection" className="google-link-panel google-action-panel" tabIndex={-1} aria-labelledby="google-connection-title">
    <div className="google-action-heading"><h3 id="google-connection-title">Connect Google</h3><p>Linking is always your explicit choice.</p></div>
    <p className="google-account-caption"><span>Your Budgetly account</span><strong>{profile?.email || profileDisplayName(profile)}</strong></p>
    <ErrorNotice message={error} />
    {notice && <p className="form-message form-message-success" role="status">{notice}</p>}
    {busy && <InlineLoading>Confirming your Google connection…</InlineLoading>}
    <GoogleIdentityButton theme={theme} intent="link" busy={busy || parentBusy || logoutBusy} onCredential={connect} />
    <p className="google-link-footnote">Your password and existing access stay unchanged.</p>
  </section>;
}
