import type {
  Animal,
  EnergySnapshot,
  ExpertSignoff,
  FarmEvent,
  FeedLot,
  NetworkState,
  NutritionRec,
  WeightRecord,
} from "./types";

export interface FarmStateSlice {
  network: NetworkState;
  lastSyncedAt: string | null;
  animals: Animal[];
  recs: NutritionRec[];
  events: FarmEvent[];
  weights: WeightRecord[];
  feed: FeedLot[];
  energy: EnergySnapshot;
  signoffs: ExpertSignoff[];
}
