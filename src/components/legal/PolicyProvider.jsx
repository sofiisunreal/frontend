import { useCallback, useEffect, useRef, useState } from "react";
import { PolicyContext, legalDocumentsUnavailable, legalErrorMessage, verifyActivePolicyPair } from "../../legal/policyRecords";
import { policyApi } from "../../legal/policyApi";

export default function PolicyProvider({ children, adapter = policyApi }) {
  const [snapshot, setSnapshot] = useState({ status: "loading", documents: null });
  const request = useRef(0);
  const adopt = useCallback(documents => {
    // Called only with the integrity-verified records returned by legal-status
    // or legal-acceptances. Invalidate any older public request still in flight.
    request.current += 1;
    setSnapshot({ status: documents ? "active" : "inactive", documents });
  }, []);
  const refresh = useCallback(async () => {
    const sequence = ++request.current;
    setSnapshot({ status: "loading", documents: null });
    let result;
    try { result = await verifyActivePolicyPair(await adapter.readActiveDocuments()); }
    catch (error) { result = { status: legalDocumentsUnavailable(error) ? "inactive" : "error", documents: null, error: legalErrorMessage(error) }; }
    if (sequence === request.current) setSnapshot(result);
    return result;
  }, [adapter]);
  useEffect(() => {
    Promise.resolve().then(refresh);
    return () => { request.current += 1; };
  }, [refresh]);
  return <PolicyContext.Provider value={{ ...snapshot, refresh, adopt }}>{children}</PolicyContext.Provider>;
}
