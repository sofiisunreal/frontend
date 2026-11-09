import { createContext, useContext } from "react";
import { proposedDraftMetadata } from "./draftMetadata.js";
import { friendlyErrorMessage } from "../lib/errors.js";

export const PolicyContext = createContext(null);
export const AccountLegalContext = createContext(null);
export const policyTypes = { terms: { title: "Terms of Service", path: "/terms-of-service" }, privacy: { title: "Privacy Policy", path: "/privacy-policy" } };
export const usePolicies = () => useContext(PolicyContext) || { status: "unavailable", documents: null, refresh: null };
export const useAccountLegal = () => useContext(AccountLegalContext);

export async function verifyPolicyRecord(record) {
  if (!record || !policyTypes[record.document_type] || !Number.isSafeInteger(record.id) || record.id < 1 || typeof record.version !== "string" || !record.version.trim() || record.version.length > 50 || typeof record.content !== "string" || !record.content.trim() || !/^[a-f0-9]{64}$/.test(record.content_sha256 || "") || !policyDate(record.published_at) || !policyDate(record.effective_at)) throw new Error("This document is incomplete. Its official text cannot be verified.");
  if (!globalThis.crypto?.subtle) throw new Error("This browser could not verify the official document. Please use a secure connection.");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(record.content));
  const hash = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
  if (hash !== record.content_sha256.toLowerCase()) throw new Error("The document text does not match its recorded fingerprint. Please try again.");
  return Object.freeze({ ...record });
}

export async function verifyActivePolicyPair(response) {
  // The confirmed endpoint returns a keyed pair; it does not expose is_active.
  if (response?.terms?.document_type !== "terms" || response?.privacy?.document_type !== "privacy" || response.terms.id === response.privacy.id) throw new Error("Both official documents must be available together.");
  const verified = await Promise.all([response.terms, response.privacy].map(verifyPolicyRecord));
  return { status: "active", documents: Object.fromEntries(verified.map(record => [record.document_type, record])) };
}

export const policyIdentity = ({ id, version, content_sha256 }) => ({ id, version, content_sha256 });
export const policyPairKey = documents => ["terms", "privacy"].map(type => documents?.[type] ? JSON.stringify(policyIdentity(documents[type])) : "").join("/");
export function legalAcceptanceBody(documents) {
  if (!documents?.terms || !documents?.privacy) throw new Error("Review both verified documents before continuing.");
  return { terms_document: policyIdentity(documents.terms), privacy_document: policyIdentity(documents.privacy) };
}
export const legalDocumentsUnavailable = error => error?.status === 503 && error.details?.code === "legal_documents_unavailable";
export const staleLegalDocuments = error => legalDocumentsUnavailable(error) || ([400, 409].includes(error?.status) && ["terms_document", "privacy_document", "legal_documents"].some(key => error.details?.[key]));
export const legalErrorMessage = error => friendlyErrorMessage(error, { context: "legal" });

export async function verifyLegalStatus(response) {
  if (response?.documents_available === false && response.acceptance_required === false) return { status: "inactive", documents: null, acceptanceRequired: false, acceptances: {} };
  if (response?.documents_available !== true || typeof response.acceptance_required !== "boolean" || !response.acceptances || typeof response.acceptances !== "object") throw new Error("Your legal update status could not be verified.");
  const { documents } = await verifyActivePolicyPair(response.documents);
  const acceptances = {};
  for (const type of ["terms", "privacy"]) {
    const receipt = response.acceptances[type];
    if (!receipt) continue;
    const record = await verifyPolicyRecord(receipt.document);
    if (JSON.stringify(policyIdentity(record)) !== JSON.stringify(policyIdentity(documents[type])) || record.document_type !== type || !policyDate(receipt.accepted_at)) throw new Error("The saved acceptance does not match the active document.");
    acceptances[type] = { document: record, accepted_at: receipt.accepted_at };
  }
  if (response.acceptance_required === (Object.keys(acceptances).length === 2)) throw new Error("Your legal update status is inconsistent. Please try again.");
  return { status: "ready", documents, acceptanceRequired: response.acceptance_required, acceptances };
}

export function policyLink(type, record) {
  const path = policyTypes[type].path;
  return record ? `${path}?document=${encodeURIComponent(record.id)}&version=${encodeURIComponent(record.version)}` : `${path}?draft=${encodeURIComponent(proposedDraftMetadata.version)}`;
}

export function policyDate(value) {
  if (typeof value !== "string" || !value || Number.isNaN(Date.parse(value))) return null;
  // Preserve the backend's calendar date; never silently shift it to local time.
  return value.slice(0, 10);
}
