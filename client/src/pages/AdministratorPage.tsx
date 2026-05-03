import { useEffect, useState } from "preact/hooks";

type Puzzle = { day: number; puzzle: string };

export function AdministratorPage() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [loginInput, setLoginInput] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [newPuzzle, setNewPuzzle] = useState("");

  useEffect(() => {
    fetch("/api/administrator/puzzles").then(async (res) => {
      if (res.status === 401) {
        setLoggedIn(false);
        return;
      }
      setLoggedIn(true);
      setPuzzles(await res.json());
    });
  }, []);

  if (loggedIn === null) return null;

  if (!loggedIn) {
    return (
      <div class="min-h-screen flex items-center justify-center p-4">
        <form
          class="flex flex-col gap-3 w-full max-w-xs"
          onSubmit={async (e) => {
            e.preventDefault();
            const res = await fetch("/api/administrator/login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ password: loginInput }),
            });
            if (!res.ok) {
              setLoginError("Wrong password");
              return;
            }
            const puzzlesRes = await fetch("/api/administrator/puzzles");
            setPuzzles(await puzzlesRes.json());
            setLoggedIn(true);
            setLoginError(null);
          }}
        >
          <h1 class="font-bold text-xl">Admin</h1>
          <input
            type="password"
            class="border rounded px-3 py-2 text-sm"
            placeholder="Password"
            value={loginInput}
            onInput={(e) => setLoginInput(e.currentTarget.value)}
          />
          {loginError && <p class="text-red-500 text-sm">{loginError}</p>}
          <button type="submit" class="bg-black text-white rounded px-4 py-2 text-sm">
            Log in
          </button>
        </form>
      </div>
    );
  }

  return (
    <div class="max-w-screen-md mx-auto p-4 flex flex-col gap-6">
      <div class="flex items-center justify-between">
        <h1 class="font-bold text-xl">Admin — Puzzles</h1>
        <button
          class="text-sm text-gray-500 underline"
          onClick={async () => {
            await fetch("/api/administrator/logout", { method: "POST" });
            setLoggedIn(false);
            setPuzzles([]);
          }}
        >
          Log out
        </button>
      </div>

      <table class="w-full text-sm border-collapse">
        <thead>
          <tr class="border-b">
            <th class="text-left py-2 pr-4 w-12">Day</th>
            <th class="text-left py-2 pr-4">Puzzle</th>
            <th class="py-2 w-32" />
          </tr>
        </thead>
        <tbody>
          {puzzles.map((p) => (
            <tr key={p.day} class="border-b">
              <td class="py-2 pr-4 font-mono">{p.day}</td>
              <td class="py-2 pr-4 font-mono">
                {editingDay === p.day ? (
                  <input
                    class="border rounded px-2 py-1 w-full font-mono text-sm"
                    value={editValue}
                    onInput={(e) => setEditValue(e.currentTarget.value)}
                  />
                ) : (
                  p.puzzle
                )}
              </td>
              <td class="py-2">
                <div class="flex gap-2 justify-end">
                  {editingDay === p.day ? (
                    <>
                      <button
                        class="text-xs px-2 py-1 bg-black text-white rounded"
                        onClick={async () => {
                          const res = await fetch(`/api/administrator/puzzles/${p.day}`, {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ puzzle: editValue }),
                          });
                          if (!res.ok) return;
                          const updated: Puzzle = await res.json();
                          setPuzzles(puzzles.map((x) => (x.day === p.day ? updated : x)));
                          setEditingDay(null);
                        }}
                      >
                        Save
                      </button>
                      <button
                        class="text-xs px-2 py-1 border rounded"
                        onClick={() => setEditingDay(null)}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        class="text-xs px-2 py-1 border rounded"
                        onClick={() => {
                          setEditingDay(p.day);
                          setEditValue(p.puzzle);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        class="text-xs px-2 py-1 text-red-600 border border-red-200 rounded"
                        onClick={async () => {
                          const res = await fetch(`/api/administrator/puzzles/${p.day}`, {
                            method: "DELETE",
                          });
                          if (!res.ok) return;
                          setPuzzles(puzzles.filter((x) => x.day !== p.day));
                        }}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <form
        class="flex gap-2 items-end"
        onSubmit={async (e) => {
          e.preventDefault();
          const res = await fetch("/api/administrator/puzzles", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ puzzle: newPuzzle }),
          });
          if (!res.ok) return;
          const created: Puzzle = await res.json();
          setPuzzles([...puzzles, created]);
          setNewPuzzle("");
        }}
      >
        <div class="flex flex-col gap-1 flex-1">
          <label class="text-xs text-gray-500">New puzzle string</label>
          <input
            class="border rounded px-3 py-2 text-sm font-mono"
            placeholder="letters..."
            value={newPuzzle}
            onInput={(e) => setNewPuzzle(e.currentTarget.value)}
          />
        </div>
        <button type="submit" class="bg-black text-white rounded px-4 py-2 text-sm">
          Add
        </button>
      </form>
    </div>
  );
}
