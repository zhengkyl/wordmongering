## Code style

- Preact: use `class` not `className`; `onInput` not `onChange`
- UnoCSS: ALWAYS group variants e.g. `md:(one two three)`
- NO optional chaining (`?.`). Either the value is never null (access directly) or the type needs redesign (make impossible states unrepresentable)
- Do not code defensively. Do not let bad inputs gracefully fail. Assert/enforce validity at the type level or throw
- Do not run build or type checking commands. The user has a dev server running and can check manually.
- The user may make changes to the code as you work. If the change is not simple formatting, assume it is an intentional change by the user.
