const KEY = "player_hint";

export function getPlayerHint(): string {
  const existing = localStorage.getItem(KEY);
  if (existing) return existing;
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2);
  localStorage.setItem(KEY, id);
  return id;
}
