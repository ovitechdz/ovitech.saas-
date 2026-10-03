/** Cartographie constitutionnelle OVT-PD-02 — pas une science inventée. */

export const MVP_FEATURES = [
  { id: "MVP-F01", title: "Scan RFID individuel", why: "Identité avant inférence" },
  { id: "MVP-F02", title: "Dossier animal local", why: "Voyage hors réseau" },
  { id: "MVP-F03", title: "Saisie Offline First", why: "Continuité terrain" },
  { id: "MVP-F04", title: "Moteur nutritionnel", why: "Données → recommandation" },
  { id: "MVP-F05", title: "Revue humaine", why: "Aide à la décision, pas d'exécution autonome" },
  { id: "MVP-F06", title: "Synchronisation ultérieure", why: "Cohérence après reconnexion" },
  { id: "MVP-F07", title: "État réseau / file visible", why: "Pas de perte silencieuse" },
  { id: "MVP-F08", title: "Indicateurs de production", why: "Valeur managériale" },
  { id: "MVP-F09", title: "Journal d'erreurs rejouable", why: "Preuve et audit" },
] as const;

export const TECH_OBJECTIVES = [
  { id: "TO-01", title: "Offline First réel" },
  { id: "TO-02", title: "RFID fiable, échec visible" },
  { id: "TO-03", title: "Intégrité de synchro" },
  { id: "TO-04", title: "Moteur vérifiable" },
  { id: "TO-05", title: "KPI sourcés" },
  { id: "TO-06", title: "Observabilité opérationnelle" },
  { id: "TO-10", title: "Evidence before AI claims" },
] as const;

export const BUSINESS_OBJECTIVES = [
  { id: "BO-01", title: "Réduire l'impact du coût d'aliment", target: "TBD — Q-09" },
  { id: "BO-02", title: "Améliorer la productivité ovine", target: "TBD — Q-04" },
  { id: "BO-03", title: "Décisions nutritionnelles data-driven", target: "TBD" },
  { id: "BO-04", title: "Traçabilité individuelle", target: "TBD" },
  { id: "BO-06", title: "Continuité hors réseau", target: "TBD — Q-05" },
  { id: "BO-10", title: "Dossier défendable Label Startup", target: "Comité" },
] as const;

export const LABEL_MATRIX = [
  {
    axis: "Valeur économique",
    contribution: "Coût d'aliment, productivité, modèle extensible.",
    evidence: "Ligne de base, essai terrain, résultats, modèle d'affaires.",
    status: "alignable",
    note: "Chiffres d'affaires non inventés (Q-09).",
  },
  {
    axis: "Valeur technique",
    contribution: "RFID + Offline First + moteur + synchro.",
    evidence: "Prototype vivant, cas de rupture, synchro visible.",
    status: "demonstrable",
    note: "Cette console est le PoC rejouable.",
  },
  {
    axis: "Valeur environnementale",
    contribution: "Ressources alimentaires et énergie, sans exagération.",
    evidence: "KPI fourrage / autonomie, langage conditionnel.",
    status: "conditional",
    note: "R-14 : pas de greenwashing sans mesure.",
  },
  {
    axis: "Scalabilité",
    contribution: "MVP → Growth → SaaS multi-tenant.",
    evidence: "Roadmap à portes, pas à dates.",
    status: "path",
    note: "Chiffres de marché absents — Q-19.",
  },
  {
    axis: "Intelligence artificielle",
    contribution: "Moteur déterministe data-driven, pas un réseau de neurones.",
    evidence: "Version DDNE-REF-0.9, cas d'essai, limites.",
    status: "honest",
    note: "R-08 : pas d'IA sans modèle évalué.",
  },
  {
    axis: "IoT",
    contribution: "Identité RFID au cœur, autres capteurs en Growth.",
    evidence: "Scan, échecs illisible/inconnu, dossier rattaché.",
    status: "demonstrable",
    note: "Caméras / balances hors MVP (10.2).",
  },
] as const;

export const EVIDENCE_FILE = [
  {
    id: "E-01",
    item: "Document de vision / constitution (OVT-PD-02)",
    inProduct: true,
  },
  {
    id: "E-02",
    item: "Problème et distinction écosystème / plateforme",
    inProduct: true,
  },
  {
    id: "E-03",
    item: "Boucle RFID → Offline → moteur → synchro → KPI, rejouable",
    inProduct: true,
  },
  {
    id: "E-04",
    item: "Rapport de vérification moteur (signature expert)",
    inProduct: true,
  },
  {
    id: "E-05",
    item: "Cas d'interruption et de conflit de synchro",
    inProduct: true,
  },
  {
    id: "E-06",
    item: "Mesure d'impact économique avec ligne de base",
    inProduct: false,
  },
  {
    id: "E-07",
    item: "Preuve IoT réelle (RFID rattaché, pas une photo d'appareil)",
    inProduct: true,
  },
  {
    id: "E-08",
    item: "Usage IA honnête (ou absence assumée)",
    inProduct: true,
  },
  {
    id: "E-09",
    item: "Preuves autonomie alimentaire / énergétique chiffrées",
    inProduct: false,
  },
  {
    id: "E-10",
    item: "Plan de croissance vers multi-tenant",
    inProduct: true,
  },
  {
    id: "E-11",
    item: "Documents juridiques / financiers de la société",
    inProduct: false,
  },
] as const;

export const OPEN_P0 = [
  "Q-01 Constitution architecturale officielle",
  "Q-02 Entrées / sorties du moteur (expert nutrition)",
  "Q-03 Recommandation vs exécution autonome",
  "Q-04 Dictionnaire officiel des KPI",
  "Q-05 Durée d'autonomie hors réseau",
  "Q-06 Politique de conflit de synchro",
  "Q-09 Ligne de base économique",
  "Q-10 Nature du modèle (règles vs ML)",
] as const;
