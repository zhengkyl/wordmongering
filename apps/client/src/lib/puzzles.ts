export async function fetchPuzzle(day: number): Promise<string | null> {
  const res = await fetch(`/api/dailies/${day}/puzzle`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.puzzle;
}
