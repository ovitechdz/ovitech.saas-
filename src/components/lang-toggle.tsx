import { usePresentationLang, LANGS, langLabel } from "@/lib/presentation";
import { cn } from "@/lib/cn";
import { useAppT } from "@/i18n/hooks";

export function LangToggle() {
  const [lang, apply] = usePresentationLang();
  const t = useAppT();
  return (
    <div
      className="inline-flex rounded-full border border-white/10 bg-surface/60 p-0.5 backdrop-blur-md"
      role="group"
      aria-label={t("shell.langAria")}
    >
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          className={cn(
            "h-8 rounded-full px-3 text-xs transition-colors duration-150",
            l === lang ? "bg-gold text-gold-fg" : "text-muted hover:text-fg",
          )}
          onClick={() => apply(l)}
          aria-pressed={l === lang}
        >
          {langLabel(l)}
        </button>
      ))}
    </div>
  );
}