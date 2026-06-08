"use client";

import { createContext, useContext } from "react";
import { type Locale, type Dict, getDictFor } from "./i18n";

const LocaleContext = createContext<{ locale: Locale; t: Dict }>({
  locale: "zh",
  t: getDictFor("zh"),
});

export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  return (
    <LocaleContext.Provider value={{ locale, t: getDictFor(locale) }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}
