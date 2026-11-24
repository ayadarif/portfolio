// Theme is set before first paint by this tiny inline script (no flash, no library).
// Stored choice: "light" | "dark" | "system" (default). The class "dark" on <html> turns the dark tokens on.
export const THEME_KEY = "theme";
export const themeScript = `(function(){try{var t=localStorage.getItem("${THEME_KEY}")||"system";var d=t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;
