import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { applyFavicon, resolveAvatar } from "@/lib/avatar";
import { readBootstrapProfile } from "@/lib/bootstrap";
import { applyTheme, getTheme } from "./lib/theme";
import "./index.css";

applyTheme(getTheme());
const boot = readBootstrapProfile();
if (boot) applyFavicon(resolveAvatar(boot.avatar, boot.email || "", 64));

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
