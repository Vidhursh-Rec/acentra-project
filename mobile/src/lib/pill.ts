// Pill appearance (Hub Manager's photo + colours): fixed names in EN / TA / HI.
// Spoken as e.g. "White round pill, blue strip". Drug names are never part of this table.
import { Lang } from "./i18n";

type Named = { swatch: string; name: Record<Lang, string> };

export const PILL_COLORS: Record<string, Named> = {
  white: { swatch: "#ffffff", name: { en: "White", ta: "வெள்ளை", hi: "सफ़ेद" } },
  yellow: { swatch: "#facc15", name: { en: "Yellow", ta: "மஞ்சள்", hi: "पीली" } },
  orange: { swatch: "#fb923c", name: { en: "Orange", ta: "ஆரஞ்சு", hi: "नारंगी" } },
  pink: { swatch: "#f9a8d4", name: { en: "Pink", ta: "இளஞ்சிவப்பு", hi: "गुलाबी" } },
  red: { swatch: "#ef4444", name: { en: "Red", ta: "சிவப்பு", hi: "लाल" } },
  blue: { swatch: "#3b82f6", name: { en: "Blue", ta: "நீல", hi: "नीली" } },
  green: { swatch: "#22c55e", name: { en: "Green", ta: "பச்சை", hi: "हरी" } },
  brown: { swatch: "#92400e", name: { en: "Brown", ta: "பழுப்பு", hi: "भूरी" } },
  purple: { swatch: "#a855f7", name: { en: "Purple", ta: "ஊதா", hi: "बैंगनी" } },
};

export const STRIP_COLORS: Record<string, Named> = {
  silver: { swatch: "#c0c0c0", name: { en: "Silver", ta: "வெள்ளி", hi: "सिल्वर" } },
  gold: { swatch: "#d4af37", name: { en: "Gold", ta: "தங்க", hi: "सुनहरी" } },
  white: PILL_COLORS.white,
  blue: PILL_COLORS.blue,
  green: PILL_COLORS.green,
  red: PILL_COLORS.red,
  orange: PILL_COLORS.orange,
  pink: PILL_COLORS.pink,
  purple: PILL_COLORS.purple,
  clear: { swatch: "#f3f4f6", name: { en: "Clear", ta: "ஒளி ஊடுருவும்", hi: "पारदर्शी" } },
};

export const SHAPES: Record<string, Record<Lang, string>> = {
  round: { en: "Round", ta: "வட்ட", hi: "गोल" },
  oval: { en: "Oval", ta: "நீள்வட்ட", hi: "अंडाकार" },
  capsule: { en: "Capsule", ta: "காப்ஸ்யூல்", hi: "कैप्सूल" },
};

export type Pill = {
  photo_url: string | null;
  pill_color: string | null;
  pill_shape: string | null;
  strip_color: string | null;
  added_by: string | null;
};

/** "White round pill, blue strip" / "வெள்ளை நிற வட்ட மாத்திரை, நீல நிற அட்டை" / "सफ़ेद गोल गोली, नीली पट्टी" */
export function appearanceText(lang: Lang, pill: Pill | null): string {
  if (!pill) return "";
  const color = pill.pill_color ? PILL_COLORS[pill.pill_color]?.name[lang] : undefined;
  const shape = pill.pill_shape;
  const strip = pill.strip_color ? STRIP_COLORS[pill.strip_color]?.name[lang] : undefined;
  const parts: string[] = [];

  if (color || shape) {
    if (lang === "en") {
      const noun = shape === "capsule" ? "capsule" : "pill";
      const shapeWord = shape && shape !== "capsule" ? SHAPES[shape].en.toLowerCase() : "";
      parts.push([color, shapeWord, noun].filter(Boolean).join(" ").replace(/^./, (c) => c.toUpperCase()));
    } else if (lang === "ta") {
      const noun = shape === "capsule" ? "காப்ஸ்யூல்" : "மாத்திரை";
      const shapeWord = shape && shape !== "capsule" ? SHAPES[shape].ta : "";
      parts.push([color ? `${color} நிற` : "", shapeWord, noun].filter(Boolean).join(" "));
    } else {
      const noun = shape === "capsule" ? "कैप्सूल" : "गोली";
      const shapeWord = shape && shape !== "capsule" ? SHAPES[shape].hi : "";
      parts.push([color, shapeWord, noun].filter(Boolean).join(" "));
    }
  }
  if (strip) {
    if (lang === "en") parts.push(`${strip.toLowerCase()} strip`);
    else if (lang === "ta") parts.push(pill.strip_color === "clear" ? `${strip} அட்டை` : `${strip} நிற அட்டை`);
    else parts.push(`${strip} पट्टी`);
  }
  return parts.join(", ");
}
