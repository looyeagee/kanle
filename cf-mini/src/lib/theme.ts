const KEY = "kanle-theme";

export function getTheme(): "light" | "dark" {
  if (typeof localStorage === "undefined") return "light";
  return localStorage.getItem(KEY) === "dark" ? "dark" : "light";
}

export function applyTheme(theme: "light" | "dark") {
  document.documentElement.classList.toggle("dark", theme === "dark");
  localStorage.setItem(KEY, theme);
}

export function toggleTheme() {
  applyTheme(getTheme() === "dark" ? "light" : "dark");
  return getTheme();
}
