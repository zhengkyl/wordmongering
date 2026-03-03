## Code style

- Preact: use `class` not `className`; `onInput` not `onChange`
- UnoCSS: ALWAYS group variants e.g. `md:(one two three)`
- NO optional chaining (`?.`). If tempted, either the value is never null (access directly) or the type needs redesign (make impossible states unrepresentable)
- Do not code defensively. Do not let bad inputs gracefully fail. Assert/enforce validity at the type level or throw
