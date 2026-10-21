import { activateLocale } from "@/i18n/i18n";
import { APP_LOCALES, resolveLanguagePreference } from "@/i18n/locales";
import { usePreferencesStore } from "@/stores/usePreferencesStore";
import { useScryfallStore } from "@/stores/useScryfallStore";

let initialized = false;
let appliedPreference = usePreferencesStore.getState().appLanguage;

async function applyPreference(): Promise<void> {
  const preference = usePreferencesStore.getState().appLanguage;
  const locale = resolveLanguagePreference(preference);
  useScryfallStore.getState().setLocale(APP_LOCALES[locale].scryfallLanguage);
  await activateLocale(locale);
}

function applyPreferenceSafely(): void {
  void applyPreference().catch((error) =>
    console.error("[localization] language update failed:", error),
  );
}

export async function initializeLocalization(): Promise<void> {
  if (!initialized) {
    initialized = true;
    usePreferencesStore.subscribe((state) => {
      if (state.appLanguage === appliedPreference) return;
      appliedPreference = state.appLanguage;
      applyPreferenceSafely();
    });
    window.addEventListener("languagechange", () => {
      if (usePreferencesStore.getState().appLanguage === "system") applyPreferenceSafely();
    });
  }
  await applyPreference();
}
