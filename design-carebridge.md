# CareBridge UI Design Skill

## Purpose
This skill defines the visual language and component usage for CareBridge — a hospital discharge follow-up app. Apply this to every screen across Patient app, Doctor app, and Management website.

---

## 1. Theme & Tokens

```
Primary Green   : #16a34a   (buttons, active states, accents)
Primary Dark    : #15803d   (hover, pressed states)
Background      : #ffffff   (all screens)
Surface         : #f9fafb   (card backgrounds, section fills)
Border          : #e5e7eb   (card borders, dividers)
Text Primary    : #111827   (headings, body)
Text Secondary  : #6b7280   (labels, descriptions, timestamps)
Alert Red       : #dc2626   (missed dose, error states)
Alert Amber     : #d97706   (needs review, warnings)
Success Green   : #16a34a   (completed, approved)
Black Button    : #111827   (primary action buttons)
Border Radius   : rounded-xl (cards), rounded-full (badges, pills)
Shadow          : shadow-sm
Category colours (plan item type, icon chip only — never status pills):
  Medicines     : green-100 / green-700
  Appointments  : blue-100 / blue-700
  Tests         : violet-100 / violet-700
  Referrals     : teal-100 / teal-700
  Care          : rose-100 / rose-700
  Warning signs : red-100 / red-700 (alert, not a category)
  (Management website first; mobile app not yet updated.)
Font (English)  : Inter
Font (Tamil)    : Noto Sans Tamil
Font (Hindi)    : Noto Sans Devanagari
```

---

## 2. Layout Rules

- White background on all screens. No dark mode in MVP.
- Cards use `bg-[#f9fafb]` with `border border-[#e5e7eb]` and `rounded-xl`.
- Primary action button: `bg-[#111827] text-white rounded-full` (black pill button like reference).
- Secondary action: `border border-[#e5e7eb] bg-white rounded-full`.
- Green accent only on: active tab indicator, selected date, status badges, icons.
- Bottom navigation bar on all mobile screens: 4 icons max, active = green.
- Section headers: `text-sm font-semibold text-[#6b7280] uppercase tracking-wide`.
- Pinned Warning Signs card: always top of Home screen, `bg-red-50 border border-red-200 rounded-xl`.

---

## 3. Components & Usage

### Attachment — Discharge Summary Upload Screen
Use for PDF/image upload with upload state indicator.
```tsx
import { Attachment, AttachmentAction, AttachmentActions, AttachmentContent, AttachmentDescription, AttachmentMedia, AttachmentTitle } from "@/components/ui/attachment"
import { Spinner } from "@/components/ui/spinner"
import { XIcon } from "lucide-react"

// Uploading state
<Attachment state="uploading" className="w-full">
  <AttachmentMedia><Spinner /></AttachmentMedia>
  <AttachmentContent>
    <AttachmentTitle>discharge-summary.pdf</AttachmentTitle>
    <AttachmentDescription>Uploading · 64%</AttachmentDescription>
  </AttachmentContent>
  <AttachmentActions>
    <AttachmentAction aria-label="Cancel upload"><XIcon /></AttachmentAction>
  </AttachmentActions>
</Attachment>
```

---

### Button — Primary Actions
Black pill for primary. Green outline for secondary.
```tsx
import { Button } from "@/components/ui/button"

// Primary (black pill — like "Next", "Confirm", "Approve")
<Button className="w-full bg-[#111827] text-white rounded-full hover:bg-[#1f2937]">
  Approve Plan
</Button>

// Secondary (outline)
<Button variant="outline" className="w-full rounded-full border-[#e5e7eb]">
  Cancel
</Button>

// Green accent (mark done, completed action)
<Button className="bg-[#16a34a] text-white rounded-full hover:bg-[#15803d]">
  Mark Done
</Button>
```

---

### Calendar — Appointment View (Home Tab)
Large calendar. Dots on dates with appointments. Green for selected date.
```tsx
import { Calendar } from "@/components/ui/calendar"

<Calendar
  mode="single"
  selected={date}
  onSelect={setDate}
  className="rounded-xl border border-[#e5e7eb] w-full"
  captionLayout="dropdown"
/>
```
- Selected date: `bg-[#16a34a] text-white rounded-full`
- Appointment dot: small green dot below date number
- Show month + year dropdown at top (like reference screenshot)

---

### Card — Reminder Cards, Plan Items, Patient List
```tsx
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

<Card className="w-full rounded-xl border border-[#e5e7eb] bg-[#f9fafb] shadow-sm">
  <CardHeader>
    <CardTitle className="text-base font-semibold text-[#111827]">Dolo 650</CardTitle>
    <CardDescription className="text-sm text-[#6b7280]">Morning · 7:30 AM</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Toggle + status badge here */}
  </CardContent>
</Card>
```

---

### Checkbox / Toggle — Mark Dose Done
Use Switch (toggle) not checkbox for marking doses done on reminder screen.
```tsx
import { Checkbox } from "@/components/ui/checkbox"

// For task checklist (follow-up checklist on mgmt)
<Checkbox id="task-1" className="border-[#16a34a] data-[state=checked]:bg-[#16a34a]" />
```

---

### Spinner — Loading States
Use during upload, agent processing, translation generation.
```tsx
import { Spinner } from "@/components/ui/spinner"

<Spinner className="text-[#16a34a]" />
```
Show with text: "Plan waiting for doctor review..." in patient's language.

---

### Alert — Warning Signs Card (Pinned) + Missed Dose Banner
```tsx
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertTriangleIcon, InfoIcon } from "lucide-react"

// Warning signs — pinned top of home (red)
<Alert className="border-red-200 bg-red-50">
  <AlertTriangleIcon className="text-red-600" />
  <AlertTitle className="text-red-700">Warning Signs</AlertTitle>
  <AlertDescription className="text-red-600">
    {warningSignText} · Emergency: 108
  </AlertDescription>
</Alert>

// Missed dose banner (red)
<Alert className="border-red-200 bg-red-50">
  <AlertTriangleIcon className="text-red-600" />
  <AlertTitle className="text-red-700">Missed Dose</AlertTitle>
  <AlertDescription className="text-red-600">
    Morning dose of Dolo 650 (7:30 AM) not marked.
  </AlertDescription>
</Alert>

// Needs Review — doctor plan sheet (amber)
<Alert className="border-amber-200 bg-amber-50">
  <InfoIcon className="text-amber-600" />
  <AlertTitle className="text-amber-700">Needs Review</AlertTitle>
  <AlertDescription className="text-amber-600">
    Dose or frequency missing. Please verify.
  </AlertDescription>
</Alert>
```

---

## 4. Status Badges

Use pill badges with color per status.

```
Pending      → bg-gray-100   text-gray-600
Completed    → bg-green-100  text-green-700
Taken Late   → bg-amber-100  text-amber-700
Missed       → bg-red-100    text-red-700
Needs Review → bg-amber-100  text-amber-700  (with warning icon)
```

Show who marked: `"Marked by Priya (Hub Manager)"` in `text-xs text-[#6b7280]` below badge.

---

## 5. Reminder Screen Layout (Daily Tab)

Sections: Morning / Afternoon / Night — same pattern as reference screenshot slots.

```
[Section Header: Morning 🌅]
  [Card: Dolo 650 · 7:30 AM] [Toggle] [Status Badge]
  [Card: Metformin 500mg · 8:00 AM] [Toggle] [Status Badge]

[Section Header: Afternoon ☀️]
  ...

[Section Header: Night 🌙]
  ...
```

Each card has a read-aloud button (speaker icon, green) on the right.

---

## 6. Map Screen Layout

- Full screen map (react-native-maps / Leaflet).
- Doctor/hospital pins with avatar or building icon — green pins.
- Tap pin → bottom sheet slides up with: name, specialty, address, phone, "Open in Maps" button.
- Label at bottom of sheet: `"Suggested location. Please confirm before visiting."` in `text-xs text-[#6b7280]`.
- Filter chips at top: specialty pills, pre-selected from patient's conditions.

---

## 7. Bottom Navigation (Mobile)

4 tabs, icon + label, active = green:

```
🏠 Home    📅 Reminders    🗺 Map    ⚙️ Settings
```

Active tab: icon + label in `#16a34a`. Inactive: `#6b7280`.

---

## 8. Doctor Split View

- Left panel: discharge summary rendered as scrollable text/PDF view. `bg-[#f9fafb] border-r border-[#e5e7eb]`
- Right panel: AI plan sheet. Each item as Card. Needs Review items have amber Alert above card.
- Source quote shown in `text-sm text-[#6b7280]` (upright, in quotation marks) below each plan item. Changed from text-xs italic for readability (website).
- Inline edit: tap field → input appears in place.
- Approve button: black pill, full width, sticky at bottom.

---

## 9. Management Website (React + Vite)

- Same white + green token system.
- Sidebar navigation (not bottom bar).
- Patient list: table with status badges per row.
- Doctor management: card grid with availability dot (green = available, red = unavailable).
- Leaflet map: full width, green pins for providers.
- Overdue badge: red pill `bg-red-100 text-red-700` on doctor card.

---

## 10. Rules Claude Code Must Follow

- Never use dark backgrounds. White only.
- Never translate drug names or doses in any component.
- Warning Signs card must always render above all other cards on Home screen.
- Status badge must always include who marked it.
- Provider results must always include disclaimer label.
- Nothing renders on patient screen before `plan_status === "approved"`.
- Read-aloud button on every reminder card. Uses expo-speech.
- All text supports 3 fonts: Inter / Noto Sans Tamil / Noto Sans Devanagari based on user language setting.


## 11. Nike Reference
Look at the images in /design-refs/. Copy the pattern only, not the branding.
Build ONLY the Splash screen.

Design:
- Full screen green gradient (#15803d to #16a34a), white CareBridge logo centered
- 6 Lucide icons (Pill, Stethoscope, HeartPulse, CalendarCheck,
  Syringe, Activity) placed at fixed spots around the logo
- Icons twinkle one after another: fade in, hold, fade out (staggered,
  loop, ~400ms each), like stars
- Logo: scale-in 0.8 to 1 with fade, 500ms
- Tagline under logo, small white text: "From Discharge to Recovery"
- After ~2.5s: if language is saved go to Login, else go to Language Select
- Use Reanimated. No other screens yet.

Update design-carebridge.md: splash is the only dark-green screen.
Show me the result and wait for my approval.

## 12.Liveliness Rules
- No screen may have an empty area larger than 25% without an illustration or icon.
- Every list has an empty-state illustration with a one-line message.
- Use Lucide icons inside tinted circles on every card.
- Entry animations: fade + slide up, 200-300ms, using Reanimated.
- Press feedback on every tappable element.
Look at the images in /design-refs/. Do not copy branding.
Extract: layout style, type scale, spacing, card style, motion.
Restyle only these 3 screens: Splash, Language Select, Login.

# 13 Keep our theme from design-carebridge.md (white + green).
Add:
- Splash: logo scale-in animation, green gradient accent, tagline
- Language select: hero illustration on top, 3 large cards
  (each with script sample: English / தமிழ் / हिन्दी), press animation
- Login: green header with illustration, role tabs as pill toggle
  (Doctor / Patient / Family), form card overlapping the header

Show me the result for Splash first. Wait for my approval.

## 14. Splash — final (overrides the green-gradient wording in §11)
- **Splash is the only dark screen in the app.** Every other screen stays white + green (§1).
- Background: black → charcoal gradient (`#000000` → `#111827`), Nike-style. Green is only a small accent (tagline dot) — an all-green splash felt too flashy.
- Centre: white Lucide **Pill** appears first, then crossfades to the **nurse artwork** (`assets/brand/app/splash.png`), swapping back and forth.
- "CareBridge" wordmark in white (Inter Bold), scale-in 0.8 → 1 with fade, 500 ms.
- Tagline under it, small white 70%: "From Discharge to Recovery".
- 6 Lucide icons (Pill, Stethoscope, HeartPulse, CalendarCheck, Syringe, Activity) at fixed spots, white at low opacity, twinkling one after another (fade in 400 ms, hold, fade out, staggered, looping).
- After ~2.5 s: logged in → their home; otherwise → Language Select (language-first, kept).
- Reanimated only. Reduce Motion on → no loops, icons static.
