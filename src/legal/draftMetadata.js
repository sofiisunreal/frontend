import releaseValues from "./drafts/release-values.json" with { type: "json" };

// Unpublished source metadata only. Never official records or acceptance data.
export const proposedDraftMetadata = Object.freeze({
  version: releaseValues.version,
  versionLabel: releaseValues.version,
  effectiveDateLabel: releaseValues.effective_date_label || releaseValues.effective_date || "Pending release date",
});
