import { useCallback, useEffect, useRef, useState } from "react";
import { AccountLegalContext, legalErrorMessage, policyPairKey, staleLegalDocuments, usePolicies, verifyLegalStatus } from "../../legal/policyRecords";
import { policyApi } from "../../legal/policyApi";

export default function AccountLegalProvider({ children, adapter = policyApi }) {
  const { adopt } = usePolicies();
  const [snapshot, setSnapshot] = useState({ status: "loading", documents: null, acceptances: {} });
  const [message, setMessage] = useState("");
  const request = useRef(0);
  const refresh = useCallback(async ({ message = "" } = {}) => {
    const sequence = ++request.current;
    setMessage(message);
    setSnapshot({ status: "loading", documents: null, acceptances: {} });
    let result;
    try {
      result = await verifyLegalStatus(await adapter.readLegalStatus());
      if (sequence === request.current) adopt(result.documents);
    } catch (error) { result = { status: "error", documents: null, acceptances: {}, error: legalErrorMessage(error) }; }
    if (sequence === request.current) { setSnapshot(result);if (result.status === "ready" && !result.acceptanceRequired) setMessage(""); }
    return result;
  }, [adapter, adopt]);
  useEffect(() => {
    Promise.resolve().then(refresh);
    return () => { request.current += 1; };
  }, [refresh]);
  const accept = useCallback(async documents => {
    if (snapshot.status !== "ready" || policyPairKey(documents) !== policyPairKey(snapshot.documents)) throw new Error("The documents changed. Please review the current versions first.");
    const sequence = ++request.current;
    try {
      const response = await adapter.acceptDocuments(documents);
      const result = await verifyLegalStatus({ ...response, documents_available: true });
      if (result.acceptanceRequired || policyPairKey(result.documents) !== policyPairKey(documents)) throw new Error("The saved agreement could not be confirmed for the reviewed versions. Refresh your legal status before trying again.");
      if (sequence === request.current) {
        adopt(result.documents);setSnapshot(result);setMessage("Your agreement is saved for the versions shown below.");
      }
      return result;
    } catch (error) {
      if (sequence === request.current && staleLegalDocuments(error)) {
        await refresh({ message: "The legal documents changed or are temporarily unavailable. Review the current versions and confirm again. Your previous checkmarks have been cleared." });
      }
      throw error;
    }
  }, [adapter, adopt, refresh, snapshot]);
  return <AccountLegalContext.Provider value={{ ...snapshot, message, refresh, accept }}>{children}</AccountLegalContext.Provider>;
}
