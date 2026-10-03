import type { LucideIcon } from "lucide-react";
import { Cpu, ShieldCheck, Sprout, Stethoscope } from "lucide-react";

/** Membre réel de l'équipe OVITECH. Données véritables de personnes engagées
 *  dans le projet — ne pas falsifier. Les blobs de présentation vivent dans
 *  les locales i18n (`pres.member.<id>Role/Blurb/Loc`). */
export interface TeamMember {
  id: "ziyane" | "sebai" | "ouali" | "khaled";
  name: string;
  initials: string;
  icon: LucideIcon;
  mail: string;
  phone: string;
  phoneDisplay: string;
  whatsapp: string;
}

export const TEAM: readonly TeamMember[] = [
  {
    id: "ziyane",
    name: "Ziane Amine",
    initials: "ZA",
    icon: Stethoscope,
    mail: "drzianeamine.1995@gmail.com",
    phone: "+213553191883",
    phoneDisplay: "+213 553 19 18 83",
    whatsapp: "213553191883",
  },
  {
    id: "sebai",
    name: "Sebai Salah",
    initials: "SS",
    icon: Sprout,
    mail: "salah.2000@live.fr",
    phone: "+213659524993",
    phoneDisplay: "+213 659 52 49 93",
    whatsapp: "213659524993",
  },
  {
    id: "ouali",
    name: "Nacer Ouali",
    initials: "NO",
    icon: ShieldCheck,
    mail: "nacerouali464@gmail.com",
    phone: "+213797631321",
    phoneDisplay: "0797 63 13 21",
    whatsapp: "213797631321",
  },
  {
    id: "khaled",
    name: "Khaled Elias Elhennani",
    initials: "KE",
    icon: Cpu,
    mail: "elhennani.merketing.pro@gmail.com",
    phone: "+213550507694",
    phoneDisplay: "+213 550 50 76 94",
    whatsapp: "213550507694",
  },
] as const;

export function teamMember(id: string): TeamMember | undefined {
  return TEAM.find((m) => m.id === id);
}