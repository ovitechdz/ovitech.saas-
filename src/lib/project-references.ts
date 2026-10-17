/**
 * Cadre scientifique du projet — section « Références ».
 *
 * Les citations sont reproduites telles que fournies (anglais d'origine) et
 * rattachées aux couches du modèle en sept couches :
 *   1 Alimentation · 2 Bâtiments · 3 Santé/biosécurité · 4 Reproduction
 *   5 Bien-être animal · 6 Production/économie · 7 Technologie/traçabilité
 *
 * L'ordre suit la liste numérotée du dossier (1 → 19).
 * `verified` = lien résolu et métadonnées recoupées (titre auteur/année/revue).
 * Aucune référence ne doit être ajoutée sans vérification préalable.
 */
export interface ProjectReference {
  id: string;
  layers: number[];
  citation: string;
  url: string;
  source: string;
  verified: boolean;
}

export const PROJECT_REFERENCES: ProjectReference[] = [
  {
    id: "mokgetse-2026",
    layers: [6, 7],
    citation:
      "Mokgetse, T. L., Hlomani, H., & Sigwele, T. (2026). Advances in animal traceability systems: A systematic review of technologies, benefits, and challenges. Scientific African, 31, Article e03117. https://doi.org/10.1016/j.sciaf.2025.e03117",
    url: "https://doi.org/10.1016/j.sciaf.2025.e03117",
    source: "Scientific African",
    verified: true,
  },
  {
    id: "balch-general-management-2024",
    layers: [2, 3, 5],
    citation:
      "Balch, S. G. (2024). General management of sheep. MSD Veterinary Manual.",
    url: "https://www.msdvetmanual.com/management-and-nutrition/preventative-health-care-and-husbandry-of-sheep/general-management-of-sheep",
    source: "MSD Veterinary Manual",
    verified: true,
  },
  {
    id: "balch-nutrition-2024",
    layers: [1, 6],
    citation:
      "Balch, S. G. (2024). Nutrition of sheep. MSD Veterinary Manual.",
    url: "https://www.msdvetmanual.com/management-and-nutrition/preventative-health-care-and-husbandry-of-sheep/nutrition-of-sheep",
    source: "MSD Veterinary Manual",
    verified: true,
  },
  {
    id: "balch-preventative-health-2024",
    layers: [3],
    citation:
      "Balch, S. G. (2024). Overview of preventative health care and husbandry of sheep. MSD Veterinary Manual.",
    url: "https://www.msdvetmanual.com/management-and-nutrition/preventative-health-care-and-husbandry-of-sheep/overview-of-preventative-health-care-and-husbandry-of-sheep",
    source: "MSD Veterinary Manual",
    verified: true,
  },
  {
    id: "economides-1983",
    layers: [1, 2, 3, 4, 6],
    citation:
      "Economides, S. (1983). Intensive sheep production in the Near East (FAO Animal Production and Health Paper No. 40). Food and Agriculture Organization of the United Nations.",
    url: "https://www.fao.org/4/x6542e/x6542e00.htm",
    source: "FAO",
    verified: true,
  },
  {
    id: "fogarty-2018",
    layers: [7],
    citation:
      "Fogarty, E. S., Swain, D. L., Cronin, G., & Trotter, M. (2018). Autonomous on-animal sensors in sheep research: A systematic review. Computers and Electronics in Agriculture, 150, 245–256. https://doi.org/10.1016/j.compag.2018.04.017",
    url: "https://doi.org/10.1016/j.compag.2018.04.017",
    source: "Computers and Electronics in Agriculture",
    verified: true,
  },
  {
    id: "fao-animal-environment",
    layers: [2, 5],
    citation:
      "Food and Agriculture Organization of the United Nations. (n.d.). Animal environmental requirements. FAO.",
    url: "https://www.fao.org/4/s1250e/S1250E10.htm",
    source: "FAO",
    verified: true,
  },
  {
    id: "fao-organic-housing",
    layers: [2, 5],
    citation:
      "Food and Agriculture Organization of the United Nations. (n.d.). Principles of organic production: Housing and free-range conditions. FAO.",
    url: "https://www.fao.org/4/Y2772E/y2772e0b.htm",
    source: "FAO",
    verified: true,
  },
  {
    id: "fao-hair-sheep-nutrition",
    layers: [1],
    citation:
      "Food and Agriculture Organization of the United Nations. (n.d.). Self-teaching manual in hair sheep production: Chapter 3—Nutrition. FAO.",
    url: "https://www.fao.org/4/ah651e/AH651E06.htm",
    source: "FAO",
    verified: true,
  },
  {
    id: "fao-sheep-goat-housing",
    layers: [2],
    citation:
      "Food and Agriculture Organization of the United Nations. (n.d.). Sheep and goat housing. In Farm structures in tropical climates: Animal housing. FAO.",
    url: "https://www.fao.org/4/s1250e/S1250E17.htm",
    source: "FAO",
    verified: true,
  },
  {
    id: "liang-2026",
    layers: [7],
    citation:
      "Liang, R., Zhang, Y. [Yu], Liu, S., Zhang, Y. [Yi], Xue, A., & Shen, W. (2026). From individual identification to behavioral sensing—Evolution and challenges of RFID technology in precision livestock farming. Computers and Electronics in Agriculture, 248, Article 111821. https://doi.org/10.1016/j.compag.2026.111821",
    url: "https://doi.org/10.1016/j.compag.2026.111821",
    source: "Computers and Electronics in Agriculture",
    verified: true,
  },
  {
    id: "psu-sheep-housing-2025",
    layers: [2, 5],
    citation:
      "Pennsylvania State University Extension. (2025, August 28). Sheep housing and facilities requirements. Penn State Extension.",
    url: "https://extension.psu.edu/sheep-housing-and-facilities-requirements",
    source: "Penn State Extension",
    verified: true,
  },
  {
    id: "posbergh-2025",
    layers: [1, 6],
    citation:
      "Posbergh, C. (2025). Nutritional requirements of sheep. MSD Veterinary Manual.",
    url: "https://www.msdvetmanual.com/management-and-nutrition/nutrition-sheep/nutritional-requirements-of-sheep",
    source: "MSD Veterinary Manual",
    verified: true,
  },
  {
    id: "pugh-2020",
    layers: [3, 4, 6],
    citation:
      "Pugh, D. G., Baird, A. N., Edmondson, M. A., & Passler, T. (2020). Sheep, goat, and cervid medicine (3rd ed.). Elsevier.",
    url: "https://shop.elsevier.com/books/sheep-goat-and-cervid-medicine/pugh/978-0-323-62463-3",
    source: "Elsevier",
    verified: true,
  },
  {
    id: "scully-overview-2026",
    layers: [4],
    citation:
      "Scully, C. M. (2026). Overview of reproduction in sheep. MSD Veterinary Manual.",
    url: "https://www.msdvetmanual.com/management-and-nutrition/management-of-reproduction-sheep/overview-of-reproduction-in-sheep",
    source: "MSD Veterinary Manual",
    verified: true,
  },
  {
    id: "scully-pregnancy-2026",
    layers: [4],
    citation:
      "Scully, C. M. (2026). Pregnancy determination in ewes. MSD Veterinary Manual.",
    url: "https://www.msdvetmanual.com/management-and-nutrition/management-of-reproduction-sheep/pregnancy-determination-in-sheep",
    source: "MSD Veterinary Manual",
    verified: true,
  },
  {
    id: "scully-physiology-2026",
    layers: [4],
    citation:
      "Scully, C. M. (2026). Reproductive physiology of sheep. MSD Veterinary Manual.",
    url: "https://www.msdvetmanual.com/management-and-nutrition/management-of-reproduction-sheep/reproductive-physiology-of-sheep",
    source: "MSD Veterinary Manual",
    verified: true,
  },
  {
    id: "wang-2025",
    layers: [5, 6, 7],
    citation:
      "Wang, Y., Wang, X., Liu, K., Cuan, K., Hua, Z., Li, K., & Wang, K. (2025). Non-invasive monitoring for precision sheep farming: Development, challenges, and future perspectives. Computers and Electronics in Agriculture, 231, Article 110050. https://doi.org/10.1016/j.compag.2025.110050",
    url: "https://doi.org/10.1016/j.compag.2025.110050",
    source: "Computers and Electronics in Agriculture",
    verified: true,
  },
  {
    id: "woah-traceability",
    layers: [7],
    citation:
      "World Organisation for Animal Health. (n.d.). General principles on identification and traceability of live animals. WOAH.",
    url: "https://www.woah.org/fileadmin/Home/eng/Health_standards/tahc/current/en_chapitre_ident_traceability.htm",
    source: "WOAH",
    verified: true,
  },
];

const REFERENCE_ORDER = new Map(PROJECT_REFERENCES.map((ref, index) => [ref.id, index + 1]));

/** Numéro officiel 1 → 19 (position dans la liste du dossier) ; 0 si introuvable. */
export function referenceNumber(ref: ProjectReference): number {
  return REFERENCE_ORDER.get(ref.id) ?? 0;
}

export function referencesByLayer(layer: number): ProjectReference[] {
  return PROJECT_REFERENCES.filter((ref) => ref.layers.includes(layer));
}
