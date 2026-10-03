import assert from "node:assert/strict";
import { test } from "node:test";
import { deductFeed, feedCovers } from "./feed-stock.ts";
import { concentrateStock, forageStock } from "./feed.ts";
import type { FeedLot } from "./types.ts";

const lot = (patch: Partial<FeedLot> & { kind: FeedLot["kind"] }): FeedLot => ({
  id: "lot-1",
  name: "Lot",
  stockKg: 100,
  costPerKg: 18,
  available: true,
  origin: "seed",
  ...patch,
});

test("deductFeed prend du fourrage puis du concentré sans muter l'entrée", () => {
  const feed: FeedLot[] = [
    lot({ id: "l1", kind: "fourrage", stockKg: 10 }),
    lot({ id: "l2", kind: "concentre", stockKg: 20 }),
  ];
  const before = JSON.stringify(feed);
  const next = deductFeed(feed, 4, 3);
  assert.equal(next[0]?.stockKg, 6);
  assert.equal(next[1]?.stockKg, 17);
  // l'entrée n'est pas modifiée (immutabilité)
  assert.equal(JSON.stringify(feed), before);
});

test("deductFeed plafonne au stock disponible (portion partielle)", () => {
  const feed: FeedLot[] = [lot({ id: "l1", kind: "fourrage", stockKg: 2 })];
  const next = deductFeed(feed, 8, 0);
  assert.equal(next[0]?.stockKg, 0);
});

test("deductFeed ne touche pas aux lots indisponibles ou vides", () => {
  const feed: FeedLot[] = [
    lot({ id: "l1", kind: "fourrage", stockKg: 50, available: false }),
    lot({ id: "l2", kind: "fourrage", stockKg: 0 }),
  ];
  const next = deductFeed(feed, 5, 0);
  assert.equal(next[0]?.stockKg, 50);
  assert.equal(next[1]?.stockKg, 0);
  assert.equal(next.length, 2);
});

test("un lot hybride couvre EITHER le fourrage OU le concentré (retour dès le 1er besoin)", () => {
  // Le passage gère un lot par itération : un lot hybride unique ne sert que le
  // fourrage (premier bloc if) puis retourne — il ne déduit pas aussi le
  // concentré sur la même itération. Comportement existant documenté.
  const feed: FeedLot[] = [lot({ id: "h", kind: "hybride", stockKg: 10 })];
  const next = deductFeed(feed, 5, 3);
  assert.equal(next[0]?.stockKg, 5); // 5 consommés pour le fourrage seulement
});

test("déduction multi-lots : scavenge fourrage puis concentré sur plusieurs lots", () => {
  const feed: FeedLot[] = [
    lot({ id: "f1", kind: "fourrage", stockKg: 3 }),
    lot({ id: "f2", kind: "hybride", stockKg: 6 }),
  ];
  // forage 5 : f1 (3) puis f2 (2) ; concentré non requis
  const next = deductFeed(feed, 5, 0);
  assert.equal(next[0]?.stockKg, 0);
  assert.equal(next[1]?.stockKg, 4);
});

test("feedCovers refuse une distribution que le stock ne couvre pas", () => {
  const feed: FeedLot[] = [
    lot({ id: "l1", kind: "fourrage", stockKg: 2 }),
    lot({ id: "l2", kind: "concentre", stockKg: 0 }),
  ];
  assert.equal(feedCovers(feed, 5, 0), false);
  assert.equal(feedCovers(feed, 2, 0), true);
});

test("feedCovers couvre un besoin au centime près (arrondis absorbés)", () => {
  const feed: FeedLot[] = [lot({ id: "l1", kind: "fourrage", stockKg: 10 })];
  assert.equal(feedCovers(feed, 9.6, 0), true);
  assert.equal(feedCovers(feed, 9.6, 0.4), false); // concentré jamais redirigé
});

test("feedCovers suit deductFeed : un lot hybride unique ne couvre pas fourrage ET concentré", () => {
  const feed: FeedLot[] = [lot({ id: "h", kind: "hybride", stockKg: 10 })];
  assert.equal(feedCovers(feed, 5, 0), true);
  assert.equal(feedCovers(feed, 5, 3), false);
});

test("feedCovers ignore les lots indisponibles ou vides", () => {
  const feed: FeedLot[] = [
    lot({ id: "l1", kind: "fourrage", stockKg: 50, available: false }),
    lot({ id: "l2", kind: "concentre", stockKg: 0 }),
  ];
  assert.equal(feedCovers(feed, 5, 1), false);
});

test("forageStock somme fourrage + hybride disponibles uniquement", () => {
  const feed: FeedLot[] = [
    lot({ id: "f", kind: "fourrage", stockKg: 100, available: true }),
    lot({ id: "h", kind: "hybride", stockKg: 25, available: true }),
    lot({ id: "c", kind: "concentre", stockKg: 80, available: true }),
    lot({ id: "z", kind: "fourrage", stockKg: 50, available: false }),
  ];
  assert.equal(forageStock(feed), 125);
});

test("concentrateStock somme concentre + hybride disponibles uniquement", () => {
  const feed: FeedLot[] = [
    lot({ id: "c", kind: "concentre", stockKg: 80, available: true }),
    lot({ id: "h", kind: "hybride", stockKg: 25, available: true }),
    lot({ id: "f", kind: "fourrage", stockKg: 100, available: true }),
    lot({ id: "m", kind: "mineral", stockKg: 10, available: true }),
    lot({ id: "z", kind: "concentre", stockKg: 20, available: false }),
  ];
  assert.equal(concentrateStock(feed), 105);
});
