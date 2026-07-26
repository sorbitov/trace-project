const EXPLICIT_PEOPLE = new Set([
  "jessepollak",
  "brian_armstrong",
  "paulframbot",
  "dwr",
  "varunsrin",
]);

export function normalizeRecipientHandle(value) {
  let candidate = String(value || "").trim();
  const urlMatch = candidate.match(/^(?:https?:\/\/)?(?:www\.)?(?:x|twitter)\.com\/([^/?#]+)/i);
  if (urlMatch) candidate = urlMatch[1];
  candidate = candidate.replace(/^@+/, "").split(/[/?#]/)[0].trim();
  return /^[a-zA-Z0-9_]{1,15}$/.test(candidate) ? candidate.toLowerCase() : "";
}

export function recipientType(profile, index, profiles) {
  const peopleStart = profiles.findIndex(({ handle }) => handle.toLowerCase() === "vitalikbuterin");
  if (EXPLICIT_PEOPLE.has(profile.handle.toLowerCase()) || (peopleStart >= 0 && index >= peopleStart)) return "people";
  return "projects";
}

function scoreProfile(profile, needle) {
  if (!needle) return profile.base ? 20 : 10;
  const handle = profile.handle.toLowerCase();
  const name = profile.name.toLowerCase();
  const group = profile.group.toLowerCase();
  if (handle === needle) return 100;
  if (handle.startsWith(needle)) return 90;
  if (name === needle) return 86;
  if (name.startsWith(needle)) return 80;
  if (handle.includes(needle)) return 70;
  if (name.includes(needle)) return 60;
  if (group.includes(needle)) return 40;
  return -1;
}

export function filterRecipientProfiles(profiles, {
  query = "",
  filter = "all",
  recent = [],
  favorites = [],
  limit = 18,
} = {}) {
  const needle = String(query || "").trim().replace(/^@/, "").toLowerCase();
  const recentOrder = new Map(recent.map((handle, index) => [String(handle).toLowerCase(), index]));
  const favoriteSet = new Set(favorites.map((handle) => String(handle).toLowerCase()));

  return profiles
    .map((profile, index) => ({ profile, index, score: scoreProfile(profile, needle) }))
    .filter(({ profile, index, score }) => {
      if (score < 0) return false;
      const handle = profile.handle.toLowerCase();
      if (filter === "recent") return recentOrder.has(handle);
      if (filter === "favorites") return favoriteSet.has(handle);
      if (filter === "base") return Boolean(profile.base);
      if (filter === "people" || filter === "projects") return recipientType(profile, index, profiles) === filter;
      return true;
    })
    .sort((a, b) => {
      if (filter === "recent") return recentOrder.get(a.profile.handle.toLowerCase()) - recentOrder.get(b.profile.handle.toLowerCase());
      if (favoriteSet.has(a.profile.handle.toLowerCase()) !== favoriteSet.has(b.profile.handle.toLowerCase())) {
        return favoriteSet.has(a.profile.handle.toLowerCase()) ? -1 : 1;
      }
      return b.score - a.score || Number(Boolean(b.profile.base)) - Number(Boolean(a.profile.base)) || a.index - b.index;
    })
    .slice(0, limit)
    .map(({ profile, index }) => ({ ...profile, type: recipientType(profile, index, profiles) }));
}

export function recipientInitials(name) {
  return String(name || "?").split(/\s+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "?";
}
