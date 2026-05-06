export let soundEnabled = localStorage.getItem("sound") !== "false";

export function toggleSound() {
  soundEnabled = !soundEnabled;
  localStorage.setItem("sound", soundEnabled ? "true" : "false");
}
