## Code style

- Preact: use `class` not `className`; `onInput` not `onChange`
- UnoCSS: ALWAYS group variants e.g. `md:(one two three)`
- NO optional chaining (`?.`). If tempted, either the value is never null (access directly) or the type needs redesign (make impossible states unrepresentable)
- Do not code defensively. Do not let bad inputs gracefully fail. Assert/enforce validity at the type level or throw

- **Provider rule**: provider components take `{ children, ...value }` and pass `children` through — never hardcode children inside the provider

- A prop that will always come from the same source is not a prop — embed it in the component or context
- Only keep props whose VALUES genuinely vary per call site (e.g. `id` per tile, `onClick` where parent knows field-vs-hand behavior, `anim`/`animDelay` where parent has slotIndex)
- Props derivable from context + `id` (like `letter` from `getTile(deck, id)`) must not be passed as props
- Always fix the root issue, do not go for quick wins

- Do not run build or type checking commands. The user has a dev server running and can check manually.

- The user may make changes to the code as you work. If the change is not simple formatting, assume it is an intentional change by the user.
