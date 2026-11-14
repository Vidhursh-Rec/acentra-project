// UI text for patient & family screens in EN / TA / HI.
// Doctor screens are English only. Drug names and doses are never in here.

export type Lang = "en" | "ta" | "hi";
export type Weight = "regular" | "semibold" | "bold";

export const LANGUAGES: { code: Lang; label: string }[] = [
  { code: "en", label: "English" },
  { code: "ta", label: "தமிழ்" },
  { code: "hi", label: "हिंदी" },
];

const FONTS: Record<Lang, Record<Weight, string>> = {
  en: { regular: "Inter_400Regular", semibold: "Inter_600SemiBold", bold: "Inter_700Bold" },
  ta: { regular: "NotoSansTamil_400Regular", semibold: "NotoSansTamil_600SemiBold", bold: "NotoSansTamil_700Bold" },
  hi: { regular: "NotoSansDevanagari_400Regular", semibold: "NotoSansDevanagari_600SemiBold", bold: "NotoSansDevanagari_700Bold" },
};

export function fontFor(lang: Lang, weight: Weight = "regular"): string {
  return FONTS[lang][weight];
}

const STRINGS = {
  tagline: {
    en: "Your discharge follow-up, step by step",
    ta: "உங்கள் டிஸ்சார்ஜ் பின்தொடர்தல், படிப்படியாக",
    hi: "आपका डिस्चार्ज फ़ॉलो-अप, कदम दर कदम",
  },
  chooseLanguage: { en: "Choose your language", ta: "உங்கள் மொழியைத் தேர்ந்தெடுக்கவும்", hi: "अपनी भाषा चुनें" },
  continue: { en: "Continue", ta: "தொடரவும்", hi: "आगे बढ़ें" },
  login: { en: "Log in", ta: "உள்நுழைக", hi: "लॉग इन करें" },
  logout: { en: "Log out", ta: "வெளியேறு", hi: "लॉग आउट" },
  patient: { en: "Patient", ta: "நோயாளி", hi: "मरीज़" },
  family: { en: "Family", ta: "குடும்பம்", hi: "परिवार" },
  doctor: { en: "Doctor", ta: "மருத்துவர்", hi: "डॉक्टर" },
  patientId: { en: "Patient ID", ta: "நோயாளி ID", hi: "मरीज़ ID" },
  patientName: { en: "Patient name", ta: "நோயாளியின் பெயர்", hi: "मरीज़ का नाम" },
  yourName: { en: "Your name", ta: "உங்கள் பெயர்", hi: "आपका नाम" },
  phone: { en: "Phone number", ta: "தொலைபேசி எண்", hi: "फ़ोन नंबर" },
  yourRole: { en: "Your role", ta: "உங்கள் பங்கு", hi: "आपकी भूमिका" },
  hubManager: { en: "Hub Manager", ta: "ஹப் மேலாளர்", hi: "हब मैनेजर" },
  viewer: { en: "Viewer", ta: "பார்வையாளர்", hi: "दर्शक" },
  hubManagerHint: { en: "Can mark tasks done", ta: "பணிகளை முடிந்ததாகக் குறிக்கலாம்", hi: "काम पूरा होने का निशान लगा सकते हैं" },
  viewerHint: { en: "Can only view", ta: "பார்க்க மட்டும்", hi: "केवल देख सकते हैं" },
  joinedAsViewer: {
    en: "A Hub Manager already exists for this patient. You joined as Viewer.",
    ta: "இந்த நோயாளிக்கு ஏற்கனவே ஒரு ஹப் மேலாளர் உள்ளார். நீங்கள் பார்வையாளராக சேர்ந்துள்ளீர்கள்.",
    hi: "इस मरीज़ के लिए हब मैनेजर पहले से है। आप दर्शक के रूप में जुड़े हैं।",
  },
  password: { en: "Password", ta: "கடவுச்சொல்", hi: "पासवर्ड" },
  doctorId: { en: "Doctor ID", ta: "மருத்துவர் ID", hi: "डॉक्टर ID" },
  fillAll: { en: "Please fill in all fields.", ta: "எல்லா விவரங்களையும் நிரப்பவும்.", hi: "कृपया सभी जानकारी भरें।" },
  loginFailed: {
    en: "Could not log in. Check the details and try again.",
    ta: "உள்நுழைய முடியவில்லை. விவரங்களைச் சரிபார்த்து மீண்டும் முயற்சிக்கவும்.",
    hi: "लॉग इन नहीं हो सका। विवरण जाँचकर फिर से कोशिश करें।",
  },
  networkError: {
    en: "Cannot reach the server. Check your internet connection.",
    ta: "சேவையகத்தை அணுக முடியவில்லை. இணைய இணைப்பைச் சரிபார்க்கவும்.",
    hi: "सर्वर से संपर्क नहीं हो सका। इंटरनेट कनेक्शन जाँचें।",
  },
  hello: { en: "Hello, {name}", ta: "வணக்கம், {name}", hi: "नमस्ते, {name}" },
  uploadTitle: {
    en: "Upload your discharge summary",
    ta: "உங்கள் டிஸ்சார்ஜ் சுருக்கத்தைப் பதிவேற்றவும்",
    hi: "अपना डिस्चार्ज सारांश अपलोड करें",
  },
  uploadTitleFamily: {
    en: "Upload the patient's discharge summary",
    ta: "நோயாளியின் டிஸ்சார்ஜ் சுருக்கத்தைப் பதிவேற்றவும்",
    hi: "मरीज़ का डिस्चार्ज सारांश अपलोड करें",
  },
  uploadHint: {
    en: "A photo, PDF or text file from the hospital.",
    ta: "மருத்துவமனை வழங்கிய புகைப்படம், PDF அல்லது உரை கோப்பு.",
    hi: "अस्पताल से मिली फ़ोटो, PDF या टेक्स्ट फ़ाइल।",
  },
  choosePhoto: { en: "Choose photo", ta: "புகைப்படத்தைத் தேர்ந்தெடுக்கவும்", hi: "फ़ोटो चुनें" },
  chooseFile: { en: "Choose PDF or text file", ta: "PDF அல்லது உரை கோப்பைத் தேர்ந்தெடுக்கவும்", hi: "PDF या टेक्स्ट फ़ाइल चुनें" },
  uploading: { en: "Uploading…", ta: "பதிவேற்றுகிறது…", hi: "अपलोड हो रहा है…" },
  uploadFailed: { en: "Upload failed. Please try again.", ta: "பதிவேற்றம் தோல்வியடைந்தது. மீண்டும் முயற்சிக்கவும்.", hi: "अपलोड नहीं हो सका। कृपया फिर से कोशिश करें।" },
  reading: { en: "Reading your document…", ta: "உங்கள் ஆவணத்தைப் படிக்கிறது…", hi: "आपका दस्तावेज़ पढ़ा जा रहा है…" },
  waitingTitle: {
    en: "Plan waiting for doctor review",
    ta: "திட்டம் மருத்துவரின் பரிசீலனைக்காக காத்திருக்கிறது",
    hi: "योजना डॉक्टर की समीक्षा की प्रतीक्षा में है",
  },
  waitingHint: {
    en: "Your reminders will appear here after the doctor approves.",
    ta: "மருத்துவர் ஒப்புதல் அளித்த பிறகு உங்கள் நினைவூட்டல்கள் இங்கே தோன்றும்.",
    hi: "डॉक्टर की मंज़ूरी के बाद आपके रिमाइंडर यहाँ दिखेंगे।",
  },
  rejectedTitle: { en: "Upload not accepted", ta: "பதிவேற்றம் ஏற்கப்படவில்லை", hi: "अपलोड स्वीकार नहीं हुआ" },
  uploadAgain: { en: "Upload again", ta: "மீண்டும் பதிவேற்றவும்", hi: "फिर से अपलोड करें" },
  approvedTitle: { en: "Plan active", ta: "திட்டம் செயலில் உள்ளது", hi: "योजना सक्रिय है" },
  approvedHint: {
    en: "Your doctor has approved your plan.",
    ta: "உங்கள் மருத்துவர் உங்கள் திட்டத்தை அங்கீகரித்துள்ளார்.",
    hi: "आपके डॉक्टर ने आपकी योजना मंज़ूर कर दी है।",
  },
  familyNoUpload: {
    en: "Waiting for the patient to upload the discharge summary.",
    ta: "நோயாளி டிஸ்சார்ஜ் சுருக்கத்தைப் பதிவேற்றக் காத்திருக்கிறது.",
    hi: "मरीज़ के डिस्चार्ज सारांश अपलोड करने की प्रतीक्षा है।",
  },
  // ---- Step 4: tabs, reminders, home
  tabHome: { en: "Home", ta: "முகப்பு", hi: "होम" },
  tabReminders: { en: "Reminders", ta: "நினைவூட்டல்கள்", hi: "रिमाइंडर" },
  tabMap: { en: "Map", ta: "வரைபடம்", hi: "नक्शा" },
  tabSettings: { en: "Settings", ta: "அமைப்புகள்", hi: "सेटिंग्स" },
  morning: { en: "Morning", ta: "காலை", hi: "सुबह" },
  afternoon: { en: "Afternoon", ta: "மதியம்", hi: "दोपहर" },
  night: { en: "Night", ta: "இரவு", hi: "रात" },
  pending: { en: "Pending", ta: "நிலுவையில்", hi: "बाकी" },
  completed: { en: "Completed", ta: "முடிந்தது", hi: "पूरा हुआ" },
  taken_late: { en: "Taken late", ta: "தாமதமாக எடுக்கப்பட்டது", hi: "देर से लिया" },
  missed: { en: "Missed", ta: "தவறியது", hi: "छूट गया" },
  markedBy: { en: "Marked by {name} ({role})", ta: "{name} ({role}) குறித்தார்", hi: "{name} ({role}) ने निशान लगाया" },
  warningSigns: { en: "Warning Signs", ta: "எச்சரிக்கை அறிகுறிகள்", hi: "चेतावनी के संकेत" },
  emergency: { en: "Emergency: {number}", ta: "அவசரம்: {number}", hi: "आपातकाल: {number}" },
  statusWaiting: { en: "Waiting for doctor", ta: "மருத்துவருக்காக காத்திருக்கிறது", hi: "डॉक्टर की प्रतीक्षा" },
  statusMissed: { en: "{n} tasks missed", ta: "{n} பணிகள் தவறவிடப்பட்டன", hi: "{n} काम छूट गए" },
  noReminders: { en: "No reminders today.", ta: "இன்று நினைவூட்டல்கள் இல்லை.", hi: "आज कोई रिमाइंडर नहीं।" },
  nothingDue: { en: "Nothing due on this day.", ta: "இந்த நாளில் எதுவும் இல்லை.", hi: "इस दिन कुछ नहीं है।" },
  dosesDue: { en: "{n} medicine doses", ta: "{n} மருந்து அளவுகள்", hi: "दवा की {n} खुराक" },
  appointment: { en: "Appointment", ta: "சந்திப்பு", hi: "अपॉइंटमेंट" },
  test: { en: "Test", ta: "பரிசோதனை", hi: "जाँच" },
  referral: { en: "Referral", ta: "பரிந்துரை", hi: "रेफ़रल" },
  viewOnly: { en: "View only", ta: "பார்வை மட்டும்", hi: "केवल देखने के लिए" },
  today: { en: "Today", ta: "இன்று", hi: "आज" },
  onlyToday: {
    en: "Only today's reminders can be changed.",
    ta: "இன்றைய நினைவூட்டல்களை மட்டுமே மாற்ற முடியும்.",
    hi: "केवल आज के रिमाइंडर बदले जा सकते हैं।",
  },
  language: { en: "Language", ta: "மொழி", hi: "भाषा" },
  saved: { en: "Saved", ta: "சேமிக்கப்பட்டது", hi: "सहेजा गया" },
  // ---- Step 6: read-aloud + pill photo (Hub Manager)
  readAloud: { en: "Read aloud", ta: "படித்துக் காட்டு", hi: "पढ़कर सुनाएँ" },
  voiceMissing: {
    en: "This phone has no voice for this language, so it was read in English. Add one in Settings › Accessibility › Spoken Content › Voices.",
    ta: "இந்த தொலைபேசியில் தமிழ் குரல் இல்லை, எனவே ஆங்கிலத்தில் படிக்கப்பட்டது. Settings › Accessibility › Spoken Content › Voices இல் சேர்க்கலாம்.",
    hi: "इस फ़ोन में हिंदी आवाज़ नहीं है, इसलिए अंग्रेज़ी में पढ़ा गया। Settings › Accessibility › Spoken Content › Voices में जोड़ सकते हैं।",
  },
  addPillPhoto: { en: "Add pill photo", ta: "மாத்திரை புகைப்படம் சேர்", hi: "गोली की फ़ोटो जोड़ें" },
  changePillPhoto: { en: "Change pill photo", ta: "மாத்திரை புகைப்படத்தை மாற்று", hi: "गोली की फ़ोटो बदलें" },
  pillPhotoHint: {
    en: "Photograph the pill with its strip so the patient can recognise it.",
    ta: "நோயாளி அடையாளம் காண, மாத்திரையை அதன் அட்டையுடன் புகைப்படம் எடுக்கவும்.",
    hi: "मरीज़ पहचान सके, इसलिए गोली को उसकी पट्टी के साथ फ़ोटो लें।",
  },
  takePhoto: { en: "Take photo", ta: "புகைப்படம் எடு", hi: "फ़ोटो लें" },
  fromGallery: { en: "Choose from gallery", ta: "கேலரியிலிருந்து தேர்வு செய்", hi: "गैलरी से चुनें" },
  pillColour: { en: "Pill colour", ta: "மாத்திரை நிறம்", hi: "गोली का रंग" },
  pillShape: { en: "Pill shape", ta: "மாத்திரை வடிவம்", hi: "गोली का आकार" },
  stripColour: { en: "Strip colour", ta: "அட்டை நிறம்", hi: "पट्टी का रंग" },
  save: { en: "Save", ta: "சேமி", hi: "सहेजें" },
  cancel: { en: "Cancel", ta: "ரத்து", hi: "रद्द करें" },
  photoBy: { en: "Photo by {name}", ta: "{name} சேர்த்த புகைப்படம்", hi: "{name} द्वारा फ़ोटो" },
  saveFailed: { en: "Could not save. Please try again.", ta: "சேமிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.", hi: "सहेजा नहीं जा सका। फिर से कोशिश करें।" },
  cameraDenied: {
    en: "Camera permission is needed to take a photo.",
    ta: "புகைப்படம் எடுக்க கேமரா அனுமதி தேவை.",
    hi: "फ़ोटो लेने के लिए कैमरे की अनुमति चाहिए।",
  },
  addPhotoOrColour: {
    en: "Add a photo or choose a colour.",
    ta: "புகைப்படம் சேர்க்கவும் அல்லது நிறத்தைத் தேர்ந்தெடுக்கவும்.",
    hi: "फ़ोटो जोड़ें या रंग चुनें।",
  },
  // ---- Step 7: provider map
  all: { en: "All", ta: "அனைத்தும்", hi: "सभी" },
  disclaimer: {
    en: "Suggested location. Please confirm before visiting.",
    ta: "பரிந்துரைக்கப்பட்ட இடம். செல்வதற்கு முன் உறுதிப்படுத்தவும்.",
    hi: "सुझाया गया स्थान। जाने से पहले पुष्टि करें।",
  },
  openInMaps: { en: "Open in Maps", ta: "வரைபடத்தில் திற", hi: "मैप में खोलें" },
  call: { en: "Call", ta: "அழை", hi: "कॉल करें" },
  namedInSummary: { en: "Named in your summary", ta: "உங்கள் சுருக்கத்தில் குறிப்பிடப்பட்டது", hi: "आपके सारांश में लिखा है" },
  kmAway: { en: "{km} km away", ta: "{km} கி.மீ தொலைவில்", hi: "{km} कि.मी. दूर" },
  noProviders: { en: "No providers found nearby.", ta: "அருகில் எவரும் கிடைக்கவில்லை.", hi: "पास में कोई नहीं मिला।" },
  individual_doctor: { en: "Doctor", ta: "மருத்துவர்", hi: "डॉक्टर" },
  hospital: { en: "Hospital", ta: "மருத்துவமனை", hi: "अस्पताल" },
  lab: { en: "Lab", ta: "ஆய்வகம்", hi: "लैब" },
  // ---- Step 5: dose reminder (patient's phone)
  doseReminder: { en: "{slot} dose · {time}", ta: "{slot} மருந்து · {time}", hi: "{slot} की खुराक · {time}" },
} satisfies Record<string, Record<Lang, string>>;

export const MONTHS: Record<Lang, string[]> = {
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  ta: ["ஜனவரி", "பிப்ரவரி", "மார்ச்", "ஏப்ரல்", "மே", "ஜூன்", "ஜூலை", "ஆகஸ்ட்", "செப்டம்பர்", "அக்டோபர்", "நவம்பர்", "டிசம்பர்"],
  hi: ["जनवरी", "फ़रवरी", "मार्च", "अप्रैल", "मई", "जून", "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर"],
};

export const DAYS: Record<Lang, { long: string[]; short: string[] }> = {
  en: {
    long: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    short: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  },
  ta: {
    long: ["ஞாயிறு", "திங்கள்", "செவ்வாய்", "புதன்", "வியாழன்", "வெள்ளி", "சனி"],
    short: ["ஞா", "தி", "செ", "பு", "வி", "வெ", "ச"],
  },
  hi: {
    long: ["रविवार", "सोमवार", "मंगलवार", "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार"],
    short: ["रवि", "सोम", "मंगल", "बुध", "गुरु", "शुक्र", "शनि"],
  },
};

/** "2026-10-22" -> "22 அக்டோபர் 2026" */
export function formatDateLang(lang: Lang, iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return `${d} ${MONTHS[lang][m - 1]} ${y}`;
}

/** "20:30" -> "8:30 PM" (times stay in digits in every language) */
export function formatTime12(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

export type StringKey = keyof typeof STRINGS;

export function translate(lang: Lang, key: StringKey, vars: Record<string, string> = {}): string {
  let text: string = STRINGS[key][lang] ?? STRINGS[key].en;
  for (const [k, v] of Object.entries(vars)) text = text.replace(`{${k}}`, v);
  return text;
}
