// Provider specialty names (keys match the providers table) in EN / TA / HI.
import { Lang } from "./i18n";

export const SPECIALTY_NAMES: Record<string, Record<Lang, string>> = {
  Cardiology: { en: "Cardiology", ta: "இதயவியல்", hi: "हृदय रोग" },
  Orthopedics: { en: "Orthopedics", ta: "எலும்பியல்", hi: "हड्डी रोग" },
  Neurology: { en: "Neurology", ta: "நரம்பியல்", hi: "तंत्रिका रोग" },
  Dermatology: { en: "Dermatology", ta: "தோல் மருத்துவம்", hi: "त्वचा रोग" },
  Ophthalmology: { en: "Eye care", ta: "கண் மருத்துவம்", hi: "नेत्र रोग" },
  ENT: { en: "ENT", ta: "காது மூக்கு தொண்டை", hi: "नाक-कान-गला" },
  Gastroenterology: { en: "Gastroenterology", ta: "இரைப்பை குடலியல்", hi: "पेट रोग" },
  "Endocrinology (Diabetes)": { en: "Diabetes", ta: "சர்க்கரை நோய்", hi: "मधुमेह" },
  Nephrology: { en: "Kidney", ta: "சிறுநீரகவியல்", hi: "गुर्दा रोग" },
  Pulmonology: { en: "Lungs", ta: "நுரையீரல் மருத்துவம்", hi: "फेफड़ा रोग" },
  Psychiatry: { en: "Psychiatry", ta: "மனநல மருத்துவம்", hi: "मनोरोग" },
  "General Medicine": { en: "General Medicine", ta: "பொது மருத்துவம்", hi: "सामान्य चिकित्सा" },
  Pathology: { en: "Blood test lab", ta: "இரத்த பரிசோதனை ஆய்வகம்", hi: "खून जाँच लैब" },
  Radiology: { en: "Scan / X-ray lab", ta: "ஸ்கேன் / எக்ஸ்ரே ஆய்வகம்", hi: "स्कैन / एक्स-रे लैब" },
};

export function specialtyName(key: string, lang: Lang): string {
  return SPECIALTY_NAMES[key]?.[lang] ?? key;
}
