// Sample content for the design templates, per language. Users replace it with their own data.
export type Samples = {
  categories: string[];
  channels: string[];
  regions: string[];
  skills: string[];
  kpi: { label: string; note: string }[];
  steps: { label: string; note: string }[];
  facts: { label: string; note: string }[];
  series: { revenue: string; costs: string; thisYear: string; lastYear: string; share: string; score: string; reach: string; engagement: string };
  t: Record<string, { title: string; subtitle: string; note?: string }>;
  source: string;
  footnote: string;
  brand: string;
};

export const SAMPLES: Record<"en" | "fr" | "ar", Samples> = {
  en: {
    categories: ["Product A", "Product B", "Product C", "Product D", "Product E"],
    channels: ["Social", "Search", "Email", "Direct", "Referral"],
    regions: ["North", "South", "East", "West"],
    skills: ["Design", "Speed", "Support", "Price", "Quality", "Features"],
    kpi: [
      { label: "Revenue", note: "+18% vs last year" },
      { label: "New customers", note: "+1,240 this quarter" },
      { label: "Retention", note: "+4 pts" },
      { label: "Avg. order", note: "-2% vs Q2" },
    ],
    steps: [
      { label: "2021", note: "Company founded in Marrakech" },
      { label: "2022", note: "First 1,000 customers" },
      { label: "2023", note: "Launch of the mobile app" },
      { label: "2024", note: "Expansion to Europe" },
      { label: "2025", note: "100,000 users worldwide" },
    ],
    facts: [
      { label: "people reached", note: "Across all social channels in 2025" },
      { label: "satisfaction", note: "Average rating from customer surveys" },
      { label: "countries", note: "Where our users are based" },
      { label: "hours saved", note: "Estimated time saved per team each month" },
    ],
    series: { revenue: "Revenue", costs: "Costs", thisYear: "2025", lastYear: "2024", share: "Share of traffic", score: "Score", reach: "Reach", engagement: "Engagement" },
    t: {
      editorial: { title: "Sales grew steadily all year", subtitle: "Monthly revenue in thousands of dollars" },
      corporate: { title: "Quarterly business review", subtitle: "Revenue by product line, Q3 2025" },
      tech: { title: "Active users keep climbing", subtitle: "Monthly active users, in thousands" },
      finance: { title: "Financial highlights", subtitle: "Fiscal year 2025 at a glance" },
      marketing: { title: "Where our visitors come from", subtitle: "Share of website traffic by channel" },
      social: { title: "Our year in numbers", subtitle: "What we achieved together in 2025" },
      premium: { title: "Goals achieved", subtitle: "Progress towards our 2025 targets" },
      colorful: { title: "This year vs last year", subtitle: "Sales by region, in thousands" },
      swiss: { title: "64%", subtitle: "of customers buy again within six months", note: "Repeat purchase rate by quarter" },
      magazine: { title: "How customers rate us", subtitle: "Average score out of 10 in each area" },
      timeline: { title: "Our journey", subtitle: "Key milestones since we started" },
      dashboard: { title: "Performance dashboard", subtitle: "Key indicators for September 2025" },
    },
    source: "Source: company data, 2025",
    footnote: "Figures are rounded.",
    brand: "Your brand",
  },
  fr: {
    categories: ["Produit A", "Produit B", "Produit C", "Produit D", "Produit E"],
    channels: ["Réseaux sociaux", "Recherche", "E-mail", "Direct", "Référents"],
    regions: ["Nord", "Sud", "Est", "Ouest"],
    skills: ["Design", "Rapidité", "Support", "Prix", "Qualité", "Fonctions"],
    kpi: [
      { label: "Chiffre d’affaires", note: "+18 % sur un an" },
      { label: "Nouveaux clients", note: "+1 240 ce trimestre" },
      { label: "Fidélisation", note: "+4 points" },
      { label: "Panier moyen", note: "-2 % vs T2" },
    ],
    steps: [
      { label: "2021", note: "Création de l’entreprise à Marrakech" },
      { label: "2022", note: "1 000 premiers clients" },
      { label: "2023", note: "Lancement de l’application mobile" },
      { label: "2024", note: "Expansion en Europe" },
      { label: "2025", note: "100 000 utilisateurs dans le monde" },
    ],
    facts: [
      { label: "personnes touchées", note: "Sur tous les réseaux sociaux en 2025" },
      { label: "de satisfaction", note: "Note moyenne des enquêtes clients" },
      { label: "pays", note: "Où se trouvent nos utilisateurs" },
      { label: "heures gagnées", note: "Temps gagné estimé par équipe chaque mois" },
    ],
    series: { revenue: "Chiffre d’affaires", costs: "Coûts", thisYear: "2025", lastYear: "2024", share: "Part du trafic", score: "Note", reach: "Portée", engagement: "Engagement" },
    t: {
      editorial: { title: "Des ventes en hausse toute l’année", subtitle: "Chiffre d’affaires mensuel, en milliers d’euros" },
      corporate: { title: "Revue trimestrielle", subtitle: "Chiffre d’affaires par gamme, T3 2025" },
      tech: { title: "Les utilisateurs actifs progressent", subtitle: "Utilisateurs actifs mensuels, en milliers" },
      finance: { title: "Chiffres clés financiers", subtitle: "L’exercice 2025 en un coup d’œil" },
      marketing: { title: "D’où viennent nos visiteurs", subtitle: "Part du trafic du site par canal" },
      social: { title: "Notre année en chiffres", subtitle: "Ce que nous avons accompli ensemble en 2025" },
      premium: { title: "Objectifs atteints", subtitle: "Avancement vers nos objectifs 2025" },
      colorful: { title: "Cette année vs l’an dernier", subtitle: "Ventes par région, en milliers" },
      swiss: { title: "64 %", subtitle: "des clients rachètent dans les six mois", note: "Taux de réachat par trimestre" },
      magazine: { title: "Ce que pensent nos clients", subtitle: "Note moyenne sur 10 dans chaque domaine" },
      timeline: { title: "Notre parcours", subtitle: "Les grandes étapes depuis nos débuts" },
      dashboard: { title: "Tableau de bord", subtitle: "Indicateurs clés de septembre 2025" },
    },
    source: "Source : données de l’entreprise, 2025",
    footnote: "Chiffres arrondis.",
    brand: "Votre marque",
  },
  ar: {
    categories: ["المنتج أ", "المنتج ب", "المنتج ج", "المنتج د", "المنتج هـ"],
    channels: ["التواصل الاجتماعي", "البحث", "البريد", "مباشر", "الإحالات"],
    regions: ["الشمال", "الجنوب", "الشرق", "الغرب"],
    skills: ["التصميم", "السرعة", "الدعم", "السعر", "الجودة", "الميزات"],
    kpi: [
      { label: "الإيرادات", note: "+18% مقارنة بالعام الماضي" },
      { label: "عملاء جدد", note: "+1,240 هذا الربع" },
      { label: "الاحتفاظ بالعملاء", note: "+4 نقاط" },
      { label: "متوسط الطلب", note: "-2% مقارنة بالربع الثاني" },
    ],
    steps: [
      { label: "2021", note: "تأسيس الشركة في مراكش" },
      { label: "2022", note: "أول 1,000 عميل" },
      { label: "2023", note: "إطلاق تطبيق الجوال" },
      { label: "2024", note: "التوسع إلى أوروبا" },
      { label: "2025", note: "100,000 مستخدم حول العالم" },
    ],
    facts: [
      { label: "شخص وصلنا إليهم", note: "عبر كل منصات التواصل في 2025" },
      { label: "نسبة الرضا", note: "متوسط تقييم استطلاعات العملاء" },
      { label: "دولة", note: "حيث يوجد مستخدمونا" },
      { label: "ساعة موفَّرة", note: "الوقت الموفَّر لكل فريق شهريًا" },
    ],
    series: { revenue: "الإيرادات", costs: "التكاليف", thisYear: "2025", lastYear: "2024", share: "حصة الزيارات", score: "التقييم", reach: "الوصول", engagement: "التفاعل" },
    t: {
      editorial: { title: "نمو مستمر في المبيعات طوال العام", subtitle: "الإيرادات الشهرية بآلاف الدولارات" },
      corporate: { title: "المراجعة الفصلية للأعمال", subtitle: "الإيرادات حسب خط المنتجات، الربع الثالث 2025" },
      tech: { title: "المستخدمون النشطون في ازدياد", subtitle: "المستخدمون النشطون شهريًا بالآلاف" },
      finance: { title: "أبرز المؤشرات المالية", subtitle: "السنة المالية 2025 في لمحة" },
      marketing: { title: "من أين يأتي زوارنا", subtitle: "حصة زيارات الموقع حسب القناة" },
      social: { title: "عامنا بالأرقام", subtitle: "ما حققناه معًا في 2025" },
      premium: { title: "الأهداف المحققة", subtitle: "التقدم نحو أهداف 2025" },
      colorful: { title: "هذا العام مقابل العام الماضي", subtitle: "المبيعات حسب المنطقة بالآلاف" },
      swiss: { title: "64%", subtitle: "من العملاء يشترون مجددًا خلال ستة أشهر", note: "معدل تكرار الشراء حسب الربع" },
      magazine: { title: "كيف يقيّمنا العملاء", subtitle: "متوسط التقييم من 10 في كل مجال" },
      timeline: { title: "مسيرتنا", subtitle: "أهم المحطات منذ البداية" },
      dashboard: { title: "لوحة الأداء", subtitle: "المؤشرات الرئيسية لشهر سبتمبر 2025" },
    },
    source: "المصدر: بيانات الشركة، 2025",
    footnote: "الأرقام مقرّبة.",
    brand: "علامتك التجارية",
  },
};

export function samplesFor(locale: string): Samples {
  return SAMPLES[(locale === "fr" || locale === "ar" ? locale : "en") as "en" | "fr" | "ar"];
}

/** Localised short month names (Jan…), for time-series samples. */
export function months(locale: string, count = 6, start = 0): string[] {
  const fmt = new Intl.DateTimeFormat(locale === "ar" ? "ar-u-nu-latn" : locale, { month: "short" });
  return Array.from({ length: count }, (_, i) => fmt.format(new Date(2025, (start + i) % 12, 15)));
}
