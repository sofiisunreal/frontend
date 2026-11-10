// Names are presentation only. Never derive a name from an internal username
// or email, or mutate the profile used for authentication and Settings.
export function profileDisplayName(profile, fallback = "Your account") {
  const name = [profile?.first_name, profile?.last_name]
    .filter(value => typeof value === "string")
    .map(value => value.trim().replace(/\s+/gu, " "))
    .filter(Boolean)
    .join(" ");
  return name || fallback;
}
