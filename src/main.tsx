import { createRoot } from "react-dom/client";
import "@fontsource/alegreya-sans/700.css";
import "@fontsource-variable/source-sans-3";
import "@fontsource-variable/source-sans-3/wght-italic.css";
import "./index.css";
import App from "./App.tsx";
import { registerConsoleHooks } from "./lib/consoleHooks";
import { initAndroidSafeArea } from "./platform/androidSafeArea";
import { initializeLocalization } from "./i18n/runtime";
import { waitForStartupTask } from "./lib/appBootstrap";
import { DISPLAY_FONT_FAMILY, UI_FONT_FAMILY } from "@/themes/typography";

const LOCALIZATION_STARTUP_BUDGET_MS = 5_000;

async function start(): Promise<void> {
  initAndroidSafeArea();
  registerConsoleHooks();
  const fontSample = "Manabrew Ā Ω ᾀ Ж Ѣ ế";
  const [localizationResult] = await Promise.all([
    waitForStartupTask(initializeLocalization, LOCALIZATION_STARTUP_BUDGET_MS),
    waitForStartupTask(
      () =>
        Promise.allSettled([
          document.fonts.load(`400 16px ${UI_FONT_FAMILY}`, fontSample),
          document.fonts.load(`italic 400 16px ${UI_FONT_FAMILY}`, fontSample),
          document.fonts.load(`700 32px ${DISPLAY_FONT_FAMILY}`, fontSample),
        ]),
      LOCALIZATION_STARTUP_BUDGET_MS,
    ),
  ]);
  if (localizationResult.status === "failed") {
    console.error("[startup] localization failed; continuing in English", localizationResult.error);
  } else if (localizationResult.status === "timed-out") {
    console.error("[startup] localization timed out; continuing with the default language");
  }

  createRoot(document.getElementById("root")!).render(<App />);
}

void start();
