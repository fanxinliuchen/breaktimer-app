import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { Settings } from "../../types/settings";
import { I18nProvider, useI18n } from "../lib/i18n";

function WelcomeContent() {
  const { t } = useI18n();

  const handleClose = () => {
    window.close();
  };

  return (
    <div className="h-screen w-full bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-[420px] rounded-xl border border-border bg-card p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-foreground">
          {t("welcome.title")}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {t("welcome.description")}
        </p>
        <Button className="mt-6 w-full" onClick={handleClose}>
          {t("welcome.confirm")}
        </Button>
      </div>
    </div>
  );
}

export default function Welcome() {
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    (async () => {
      const currentSettings = (await ipcRenderer.invokeGetSettings()) as Settings;
      setSettings(currentSettings);
    })();
  }, []);

  if (settings === null) {
    return null;
  }

  return (
    <I18nProvider language={settings.language}>
      <WelcomeContent />
    </I18nProvider>
  );
}
