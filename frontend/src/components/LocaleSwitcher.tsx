"use client";

import { Locale, useI18n } from "@/context/I18nContext";

const OPTIONS: Array<{ value: Locale; labelKey: "spanish" | "english" | "portuguese" }> = [
  { value: "es", labelKey: "spanish" },
  { value: "en", labelKey: "english" },
  { value: "pt", labelKey: "portuguese" },
];

export function LocaleSwitcher({ className = "" }: { className?: string }) {
  const { locale, setLocale, t } = useI18n();

  return (
    <label className={`inline-flex items-center gap-2 text-xs text-white/85 ${className}`}>
      <span className="font-semibold">{t("common", "language")}</span>
      <select
        aria-label={t("common", "language")}
        value={locale}
        onChange={(event) => setLocale(event.target.value as Locale)}
        className="h-8 rounded-md border border-white/20 bg-[#190B47]/80 px-2 text-xs font-medium text-white outline-none transition focus:border-[#FFE707]"
      >
        {OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {t("common", option.labelKey)}
          </option>
        ))}
      </select>
    </label>
  );
}
