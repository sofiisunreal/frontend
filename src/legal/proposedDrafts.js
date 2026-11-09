import privacy from "./drafts/privacy-policy-v1.0.md?raw";
import terms from "./drafts/terms-of-service-v1.0.md?raw";
import { proposedDraftMetadata } from "./draftMetadata";
import { parseProposedDraft } from "./parseProposedDraft";

// Supplied local proposals, kept separately from official API records. The
// Markdown source is verbatim; metadata describes their unpublished status.
export const proposedDrafts = {
  "/privacy-policy": { ...proposedDraftMetadata, ...parseProposedDraft(privacy) },
  "/terms-of-service": { ...proposedDraftMetadata, ...parseProposedDraft(terms) },
};
