import { createRoot } from "react-dom/client";
import "@fontsource/alegreya-sans/400.css";
import "@fontsource/alegreya-sans/500.css";
import "@fontsource/alegreya-sans/700.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/inter/800.css";
import "@fontsource/inter/900.css";
import "@fontsource/cormorant-garamond/600.css";
import "@fontsource/cormorant-garamond/700.css";
import "./index.css";
import App from "./App.tsx";
import { registerConsoleHooks } from "./lib/consoleHooks";
import { initAndroidSafeArea } from "./platform/androidSafeArea";
import { initializeLocalization } from "./i18n/runtime";
import { waitForStartupTask } from "./lib/appBootstrap";

const LOCALIZATION_STARTUP_BUDGET_MS = 5_000;

async function start(): Promise<void> {
  initAndroidSafeArea();
  registerConsoleHooks();
  const localizationResult = await waitForStartupTask(
    initializeLocalization,
    LOCALIZATION_STARTUP_BUDGET_MS,
  );
  if (localizationResult.status === "failed") {
    console.error("[startup] localization failed; continuing in English", localizationResult.error);
  } else if (localizationResult.status === "timed-out") {
    console.error("[startup] localization timed out; continuing with the default language");
  }

  createRoot(document.getElementById("root")!).render(<App />);
}

void start();
