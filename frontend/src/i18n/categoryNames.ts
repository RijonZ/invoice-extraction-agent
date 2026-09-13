import type { Language } from "../context/LanguageContext";

// Albanian names for the categories seeded by the system (db/migrations/007,
// 009). Categories an admin types in later have no entry here and simply
// render as-is in every language — there's no way to guess a translation for
// free-form text.
const SQ_NAMES: Record<string, string> = {
  "Construction & materials": "Ndërtimtari & materiale",
  "Consulting": "Konsulencë",
  "Education & training": "Arsim & trajnime",
  "Finance & banking": "Financa & bankë",
  "Healthcare & medical": "Shëndetësi & mjekësi",
  "Insurance": "Sigurime",
  "Legal services": "Shërbime ligjore",
  "Logistics & transport": "Logjistikë & transport",
  "Manufacturing & equipment": "Prodhimtari & pajisje",
  "Marketing & advertising": "Marketing & reklamim",
  "Office supplies": "Furnizime zyre",
  "Other": "Tjetër",
  "Real estate & rent": "Patundshmëri & qira",
  "Retail & goods": "Tregti me pakicë & mallra",
  "Software & subscriptions": "Software & abonime",
  "Telecommunications": "Telekomunikacion",
  "Travel": "Udhëtime",
  "Utilities": "Shërbime komunale",
};

export function translateCategoryName(name: string, language: Language): string {
  if (language !== "sq") return name;
  return SQ_NAMES[name] ?? name;
}
