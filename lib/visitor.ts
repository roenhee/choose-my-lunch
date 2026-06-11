const key = "choose-my-lunch-visitor-id";

export function getVisitorId() {
  if (typeof window === "undefined") return "";

  const existing = window.localStorage.getItem(key);
  if (existing) return existing;

  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  window.localStorage.setItem(key, id);
  return id;
}
