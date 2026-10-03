import type { ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Reveal } from "@/components/reveal";
import { t, type PresentationLang } from "@/lib/presentation";
import { useFarmStore, pendingCount } from "@/lib/store";
import { runAllCases } from "@/lib/engine-cases";

const GOLD = "#c9a44a";
const LEAF = "#4a8f62";
const MUTED = "#9aa89a";
const FG = "#f2ebe0";
const SURFACE = "#15221c";
const MAX_SCORE = 9;

interface ModuleDatum {
  capId: string;
  value: number;
}

function score(ok: boolean): number {
  return ok ? 2 : 0;
}

function nameFor(datum: ModuleDatum, lang: PresentationLang): string {
  return t(lang, `cap.${datum.capId}`);
}

function ChartCard({
  title,
  sub,
  children,
  lang,
}: {
  title: string;
  sub: string;
  children: ReactNode;
  lang: PresentationLang;
}) {
  return (
    <div className="glass-card rounded-2xl p-5" dir={lang === "ar" ? "rtl" : "ltr"}>
      <p className="font-display text-lg">{title}</p>
      <p className="mt-1 text-xs text-muted">{sub}</p>
      <div className="mt-4">{children}</div>
    </div>
  );
}

export function ProjectCharts({ lang }: { lang: PresentationLang }) {
  const animals = useFarmStore((s) => s.animals);
  const events = useFarmStore((s) => s.events);
  const recs = useFarmStore((s) => s.recs);
  const weights = useFarmStore((s) => s.weights);
  const network = useFarmStore((s) => s.network);
  const pending = useFarmStore((s) => pendingCount(s));

  const hasScan = events.some((e) => e.type === "scan" || e.type === "identite");
  const hasOffline = network === "offline" || events.some((e) => e.syncStatus === "local");
  const emitted = recs.filter((r) => r.ration).length;
  const refused = recs.filter((r) => !r.ration).length;
  const hasSync = events.some((e) => e.type === "sync") || pending > 0;
  const hasKpi = weights.length >= 2;
  const invented = recs.filter((r) => r.ration && r.evidence.length === 0).length;
  const cases = runAllCases(animals);
  const casesOk = cases.filter((c) => c.ok).length;

  const mvpByModule: ModuleDatum[] = [
    { capId: "identite", value: score(hasScan) },
    { capId: "offline", value: score(hasOffline) },
    { capId: "moteur", value: score(emitted > 0) },
    { capId: "ration", value: score(recs.some((r) => r.approvedBy)) },
    { capId: "sync", value: score(hasSync) },
    { capId: "kpi", value: score(hasKpi) },
  ];
  const mvpDone = mvpByModule.reduce((s, m) => s + m.value, 0);

  const engineSplit = [
    { name: "emitted", value: emitted, color: GOLD },
    { name: "refused", value: refused, color: LEAF },
  ];

  const themeLabel = (value: string) => (lang === "ar" ? "05" : value);
  return (
    <section dir={lang === "ar" ? "rtl" : "ltr"}>
      <header>
        <p className="text-xs uppercase tracking-[0.22em] text-gold">
          {t(lang, "demo")} · Q-09
        </p>
        <h2 className="mt-1 font-display text-2xl">{t(lang, "chartsTitle")}</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted">{t(lang, "chartsLead")}</p>
      </header>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="grid grid-cols-2 gap-3 sm:col-span-2 lg:grid-cols-4">
          <Reveal>
            <div className="glass-card rounded-2xl p-4">
              <p className="font-display text-2xl text-gold tabular">
                {mvpDone}/{MAX_SCORE}
              </p>
              <p className="mt-1 text-xs text-muted">{t(lang, "statMvp")}</p>
            </div>
          </Reveal>
          <Reveal delay={80}>
            <div className="glass-card rounded-2xl p-4">
              <p className="font-display text-2xl text-gold tabular">
                {casesOk}/{cases.length}
              </p>
              <p className="mt-1 text-xs text-muted">{t(lang, "statCases")}</p>
            </div>
          </Reveal>
          <Reveal delay={160}>
            <div className="glass-card rounded-2xl p-4">
              <p className="font-display text-2xl text-gold tabular">4</p>
              <p className="mt-1 text-xs text-muted">{t(lang, "statPillars")}</p>
            </div>
          </Reveal>
          <Reveal delay={240}>
            <div className="glass-card rounded-2xl p-4">
              <p className="font-display text-2xl text-leaf tabular">{invented}</p>
              <p className="mt-1 text-xs text-muted">{t(lang, "statHonest")}</p>
            </div>
          </Reveal>
        </div>

        <Reveal className="sm:col-span-2 lg:col-span-2">
          <ChartCard
            title={t(lang, "chartCapTitle")}
            sub={t(lang, "chartCapSub")}
            lang={lang}
          >
            <div className="h-56 w-full" dir="ltr" role="img" aria-label={t(lang, "chartCapTitle")}>
              <ResponsiveContainer width="100%" height="100%" aria-hidden="true">
                <BarChart data={mvpByModule} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(242,235,224,0.08)" vertical={false} />
                  <XAxis
                    dataKey={(d) => nameFor(d as ModuleDatum, lang)}
                    tick={{ fill: MUTED, fontSize: 10 }}
                    interval={0}
                    angle={-18}
                    textAnchor="end"
                    tickLine={false}
                    axisLine={false}
                    height={48}
                  />
                  <YAxis tick={{ fill: MUTED, fontSize: 10 }} allowDecimals={false} tickLine={false} axisLine={false} />
                  <Tooltip
                    cursor={{ fill: "rgba(201,164,74,0.08)" }}
                    contentStyle={{
                      background: SURFACE,
                      border: "1px solid rgba(242,235,224,0.12)",
                      borderRadius: 12,
                      color: FG,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: FG }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} name={themeLabel("value")}>
                    {mvpByModule.map((entry) => (
                      <Cell key={entry.capId} fill={entry.value >= 2 ? LEAF : GOLD} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <table className="sr-only">
              <caption>
                {t(lang, "chartCapTitle")} — {mvpDone}/{MAX_SCORE}
              </caption>
              <thead>
                <tr>
                  <th scope="col">{t(lang, "cap")}</th>
                  <th scope="col">{t(lang, "score")}</th>
                </tr>
              </thead>
              <tbody>
                {mvpByModule.map((d) => (
                  <tr key={d.capId}>
                    <th scope="row">{nameFor(d, lang)}</th>
                    <td>{d.value}/2</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ChartCard>
        </Reveal>

        <Reveal delay={120} className="sm:col-span-2 lg:col-span-2">
          <ChartCard
            title={t(lang, "chartMotorTitle")}
            sub={t(lang, "chartMotorSub")}
            lang={lang}
          >
            <div className="h-56 w-full" dir="ltr" role="img" aria-label={t(lang, "chartMotorTitle")}>
              <ResponsiveContainer width="100%" height="100%" aria-hidden="true">
                <PieChart>
                  <Pie
                    data={engineSplit}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={52}
                    outerRadius={82}
                    paddingAngle={3}
                    stroke="none"
                  >
                    {engineSplit.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: SURFACE,
                      border: "1px solid rgba(242,235,224,0.12)",
                      borderRadius: 12,
                      color: FG,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: FG }}
                    formatter={(value, name) => [
                      `${value}`,
                      name === "emitted" ? t(lang, "emitted") : t(lang, "refused"),
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <table className="sr-only">
              <caption>{t(lang, "chartMotorTitle")}</caption>
              <thead>
                <tr>
                  <th scope="col">{t(lang, "cap")}</th>
                  <th scope="col">{t(lang, "emitted")}</th>
                  <th scope="col">{t(lang, "refused")}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">TC-01…TC-07</th>
                  <td>{emitted}</td>
                  <td>{refused}</td>
                </tr>
              </tbody>
            </table>
            <div className="mt-2 flex justify-center gap-6 text-xs text-muted">
              <span className="inline-flex items-center gap-2">
                <span className="size-2.5 rounded-full" aria-hidden="true" style={{ background: GOLD }} />
                {t(lang, "emitted")} · {emitted}
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="size-2.5 rounded-full" aria-hidden="true" style={{ background: LEAF }} />
                {t(lang, "refused")} · {refused}
              </span>
            </div>
          </ChartCard>
        </Reveal>
      </div>
    </section>
  );
}