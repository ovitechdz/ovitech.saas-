import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ageLabel,
  ageMonths,
  formatDay,
  formatDateTime,
  formatDzd,
  formatKg,
  gestationInfo,
  setFormatLang,
} from "./format.ts";

function iso(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function birthMonthsAgo(n: number) {
  const now = new Date();
  const b = new Date(now.getFullYear(), now.getMonth() - n, 1);
  return iso(b.getFullYear(), b.getMonth() + 1, b.getDate());
}

test("ageMonths compte les mois entiers depuis le 1er du mois de naissance", () => {
  // Le jour du mois est forcé à 1 (le « 31 » ne crée pas de débordement de mois).
  assert.equal(ageMonths("2024-03-31", new Date(2024, 5, 1)), 3);
  assert.equal(ageMonths("2024-03-01", new Date(2024, 5, 1)), 3);
  assert.equal(ageMonths("2024-03-01", new Date(2025, 5, 1)), 15);
});

test("ageMonths est indépendant du fuseau de la machine (anti-drift UTC)", () => {
  // `<Date iso>` aurait 00:00 UTC ; le parsage en composantes a une heure
  // implicite locale -> aucune dérive de jour/mois quel que soit le TZ système.
  assert.equal(ageMonths("2026-01-31", new Date(2026, 3, 15)), 3);
  assert.equal(ageMonths("2026-01-10", new Date(2026, 3, 15)), 3);
});

test("ageMonths borne à 0 une naissance future", () => {
  assert.equal(ageMonths("2030-01-01", new Date(2026, 0, 1)), 0);
  assert.equal(ageMonths("", new Date(2026, 0, 1)), 0);
});

test("ageLabel : mois seuls sous un an", () => {
  setFormatLang("fr");
  assert.equal(ageLabel(birthMonthsAgo(3)), "3 mois");
});

test("ageLabel : année ronde sans mois résiduel", () => {
  setFormatLang("fr");
  assert.equal(ageLabel(birthMonthsAgo(12)), "1 ans");
});

test("ageLabel : année + mois résiduels", () => {
  setFormatLang("fr");
  assert.equal(ageLabel(birthMonthsAgo(15)), "1 ans 3 mois");
  assert.equal(ageLabel(birthMonthsAgo(27)), "2 ans 3 mois");
});

test("ageLabel bascule le vocabulaire par langue", () => {
  setFormatLang("en");
  assert.equal(ageLabel(birthMonthsAgo(15)), "1 yr 3 mo");
  setFormatLang("ar");
  const ar = ageLabel(birthMonthsAgo(15));
  assert.match(ar, /سنة/);
  assert.match(ar, /شهر/);
  assert.match(ar, /[13١٣]/);
});

test("formatDateTime / formatDay suivent setFormatLang et le fuseau Algiers", () => {
  setFormatLang("fr");
  const day = formatDay("2026-09-21");
  const frExpected = new Intl.DateTimeFormat("fr-DZ", {
    day: "2-digit",
    month: "short",
    timeZone: "Africa/Algiers",
  }).format(new Date("2026-09-21"));
  assert.equal(day, frExpected);
  assert.notEqual(formatDateTime("2026-09-21T10:30:00Z"), "—");
  assert.equal(formatDateTime(null), "—");
  setFormatLang("en");
  assert.notEqual(formatDay("2026-09-21"), day);
});

test("formatDzd : symboles et regroupements par locale", () => {
  setFormatLang("fr");
  assert.equal(
    formatDzd(1234567),
    new Intl.NumberFormat("fr-DZ", {
      style: "currency",
      currency: "DZD",
      maximumFractionDigits: 0,
    }).format(1234567),
  );
  setFormatLang("en");
  assert.equal(
    formatDzd(1234567),
    new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "DZD",
      maximumFractionDigits: 0,
    }).format(1234567),
  );
});

test("formatKg : null/NaN -> tiret, arrondi à 1 décimale par défaut", () => {
  assert.equal(formatKg(null), "—");
  assert.equal(formatKg(Number.NaN), "—");
  assert.equal(formatKg(12, 0), "12 kg");
  assert.equal(formatKg(12.345, 2), "12.35 kg");
});

test("gestationInfo : hors gestation, sans date, avec date", () => {
  assert.equal(gestationInfo("brebis_lactation", "J+50"), null);
  const sans = gestationInfo("brebis_gestation", "paquet vierge");
  assert.deepEqual(sans, { day: null, remaining: null, term: 150 });
  assert.deepEqual(gestationInfo("brebis_gestation", "agnelage J+140"), {
    day: 140,
    remaining: 10,
    term: 150,
  });
  assert.deepEqual(gestationInfo("brebis_gestation", "dépasse J+151"), {
    day: 151,
    remaining: 0,
    term: 150,
  });
});