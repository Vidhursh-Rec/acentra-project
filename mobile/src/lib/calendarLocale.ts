// Month / day names for react-native-calendars in the patient's language.
import { LocaleConfig } from "react-native-calendars";

import { DAYS, Lang, MONTHS, translate } from "./i18n";

for (const lang of ["en", "ta", "hi"] as Lang[]) {
  LocaleConfig.locales[lang] = {
    monthNames: MONTHS[lang],
    monthNamesShort: MONTHS[lang],
    dayNames: DAYS[lang].long,
    dayNamesShort: DAYS[lang].short,
    today: translate(lang, "today"),
  };
}

export function setCalendarLocale(lang: Lang) {
  LocaleConfig.defaultLocale = lang;
}
