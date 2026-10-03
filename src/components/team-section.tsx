import { Link } from "@tanstack/react-router";
import { ArrowRight, Mail, MapPin, Phone } from "lucide-react";
import { Reveal } from "@/components/reveal";
import { t as pres, type PresentationLang } from "@/lib/presentation";
import { TEAM } from "@/lib/team";

export function TeamSection({ lang }: { lang: PresentationLang }) {
  return (
    <section dir={lang === "ar" ? "rtl" : "ltr"}>
      <header>
        <p className="text-xs uppercase tracking-[0.22em] text-gold">OVITECH</p>
        <h2 className="mt-1 font-display text-2xl">{pres(lang, "teamTitle")}</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted">{pres(lang, "teamLead")}</p>
      </header>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {TEAM.map((member, index) => {
          const Icon = member.icon;
          return (
            <Reveal key={member.id} delay={index * 90}>
              <article
                className="glass-card group flex h-full flex-col rounded-2xl p-5"
                dir={lang === "ar" ? "rtl" : "ltr"}
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-full border border-gold/30 bg-gradient-to-br from-gold/20 to-leaf/15 text-lg font-display text-gold">
                    {member.initials}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-display text-lg leading-tight">{member.name}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-gold">
                      <Icon className="size-3.5" aria-hidden="true" />
                      {pres(lang, `member.${member.id}Role`)}
                    </p>
                  </div>
                </div>
                <p className="mt-3 flex-1 text-sm text-muted">
                  {pres(lang, `member.${member.id}Blurb`)}
                </p>
                <div className="mt-3 space-y-1 border-t border-white/10 pt-3 text-xs text-subtle">
                  <p className="flex items-center gap-2">
                    <MapPin className="size-3.5 shrink-0 text-gold/70" aria-hidden="true" />
                    <span className="truncate">{pres(lang, `member.${member.id}Loc`)}</span>
                  </p>
                  {member.phone && (
                    <p className="flex items-center gap-2">
                      <Phone className="size-3.5 shrink-0 text-gold/70" aria-hidden="true" />
                      <span className="font-mono">{member.phoneDisplay}</span>
                    </p>
                  )}
                  {member.mail && (
                    <a
                      href={`mailto:${member.mail}`}
                      className="flex items-center gap-2 text-subtle transition-colors hover:text-gold"
                    >
                      <Mail className="size-3.5 shrink-0 text-gold/70" aria-hidden="true" />
                      <span className="truncate">{member.mail}</span>
                    </a>
                  )}
                </div>
              </article>
            </Reveal>
          );
        })}
      </div>

      <div className="mt-5">
        <Link
          to="/team"
          className="inline-flex items-center gap-2 text-sm font-medium text-gold transition-colors hover:text-gold-300"
        >
          {pres(lang, "teamSeeAll")}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}