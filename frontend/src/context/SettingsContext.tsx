import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { PropsWithChildren } from "react";
import { getPublicSettings } from "../api/client";
import { useAuth } from "./AuthContext";

interface SettingsContextValue {
  companyName: string;
  bannerMessage: string | null;
  refresh: () => void;
}

const DEFAULT_COMPANY_NAME = "Invoice Extraction";

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const [companyName, setCompanyName] = useState(DEFAULT_COMPANY_NAME);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  const refresh = useCallback(() => {
    if (!user) return;
    getPublicSettings()
      .then((settings) => {
        setCompanyName(settings.company_name);
        setBannerMessage(settings.banner_message);
      })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <SettingsContext.Provider value={{ companyName, bannerMessage, refresh }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within a SettingsProvider");
  return ctx;
}
