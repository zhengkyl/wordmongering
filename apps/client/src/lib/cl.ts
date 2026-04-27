export function cl(classList: (string | false | 0 | null | undefined)[]) {
  return classList.filter(Boolean).join(" ");
}
