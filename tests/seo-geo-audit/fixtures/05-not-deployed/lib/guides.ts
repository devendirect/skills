export type Guide = {
  slug: string;
  title: string;
  region: "Tyrol" | "Salzburg" | "Bavaria" | "Vorarlberg";
  days: number;
  huts: string[];
  difficulty: "easy" | "moderate" | "demanding";
  bestMonths: string;
  summary: string;
};

export const guides: Guide[] = [
  {
    slug: "eagle-walk-stage-1-4",
    title: "Eagle Walk, stages 1 to 4",
    region: "Tyrol",
    days: 4,
    huts: ["Gaudeamushütte", "Gruttenhütte"],
    difficulty: "moderate",
    bestMonths: "June to September",
    summary: "The first four stages of the Eagle Walk, from St. Johann in Tirol along the Wilder Kaiser.",
  },
  {
    slug: "stubai-high-trail",
    title: "Stubai High Trail",
    region: "Tyrol",
    days: 7,
    huts: ["Starkenburger Hütte", "Franz-Senn-Hütte", "Neue Regensburger Hütte", "Dresdner Hütte", "Sulzenauhütte", "Nürnberger Hütte", "Bremer Hütte"],
    difficulty: "demanding",
    bestMonths: "July to mid-September",
    summary: "A seven-day loop linking seven huts above the Stubai valley.",
  },
  {
    slug: "watzmann-traverse-approach",
    title: "Watzmann hut approach",
    region: "Bavaria",
    days: 2,
    huts: ["Watzmannhaus"],
    difficulty: "moderate",
    bestMonths: "June to October",
    summary: "Two days to the Watzmannhaus from Berchtesgaden, without the summit traverse.",
  },
];

export function getGuide(slug: string) {
  return guides.find((g) => g.slug === slug);
}
