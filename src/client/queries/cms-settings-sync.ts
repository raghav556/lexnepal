export const CMS_SETTINGS_UPDATED_EVENT = "lexnepal:cms-settings-updated";
const CMS_SETTINGS_UPDATED_STORAGE_KEY = "lexnepal_cms_settings_updated";

export function signalCmsSettingsUpdated() {
  if (typeof window === "undefined") return;

  window.dispatchEvent(new Event(CMS_SETTINGS_UPDATED_EVENT));
  try {
    window.localStorage.setItem(CMS_SETTINGS_UPDATED_STORAGE_KEY, String(Date.now()));
  } catch {
    // The in-tab event still keeps the current page in sync when storage is unavailable.
  }
}

export function subscribeToCmsSettingsUpdates(onUpdate: () => void) {
  if (typeof window === "undefined") return () => {};

  const handleStorage = (event: StorageEvent) => {
    if (event.key === CMS_SETTINGS_UPDATED_STORAGE_KEY) onUpdate();
  };
  window.addEventListener(CMS_SETTINGS_UPDATED_EVENT, onUpdate);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(CMS_SETTINGS_UPDATED_EVENT, onUpdate);
    window.removeEventListener("storage", handleStorage);
  };
}
