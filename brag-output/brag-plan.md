# Brag Plan: CareBridge

## What is this app?
CareBridge turns a hospital discharge summary into a doctor-approved follow-up plan, then reminds the patient in
English, Tamil or Hindi and tells the family when a dose is missed.

## The angle
One medicine line, followed all the way through. "2. Tab. Clopidogrel 75 mg — once daily after breakfast at
8:00 AM" starts as a line on a discharge page and ends as a reminder on a phone in Tamil, and the drug name and dose
never change along the way. That one unchanged line is the whole product promise: AI reads, rules decide, a doctor
approves, and the medicine is never translated. Earnest product, so no jokes; the craft is restraint.

## Hook (first 2-3 seconds)
A plain discharge page fills the frame (synthetic hospital document style, as in the project's test documents).
A soft green highlight sweeps across one line: "2. Tab. Clopidogrel 75 mg — once daily after breakfast at 8:00 AM".
Everything else on the page dims. The viewer knows which line to follow.

## Key moments (the middle)
- The highlighted line lifts off the page and becomes a plan card: "Clopidogrel 75 mg", green Medicines icon chip,
  "Once daily · 8:00 AM · After breakfast", and the original line underneath as a source quote.
- An amber "Awaiting approval" pill. A cursor clicks the green "Approve Plan" button; the pill flips to green "Approved".
- A phone shows the reminder. The language switches English → தமிழ் → हिन्दी: "after breakfast" changes
  (காலை உணவுக்குப் பின் / नाश्ते के बाद) while "Clopidogrel 75 mg" stays exactly the same, highlighted.
- A family member's notification slides in: "Missed dose · Murugan Selvam — Morning dose of Clopidogrel 75 mg
  (8:00 AM) not marked."

## Outro / punchline
Cut to the dark splash world (black → charcoal): the pill becomes a heart, "CareBridge", and the tagline
"From Discharge to Recovery" with the small green dot.

## User flow worth showing
Discharge page uploaded → AI plan with source quotes → doctor approves → patient reminder in their language →
family alerted on a missed dose. (Patient "Murugan Selvam" and "Dr. Lakshmi Narayanan" are the project's synthetic
seed data, not real people.)

## Tone
- Preset: polished
- Creative direction: quiet premium product film for a clinical tool; calm, trustworthy, one line followed end to end
- Interpretation: few scenes, long settled holds, soft crossfades and slides, no exclamation, motion only to show
  the line travelling and states changing.

## Format: landscape — 1920x1080
## Duration: ~22 seconds (flexes to the narration, max 25)

## Visual identity (from the project)
- Background: #ffffff (app screens), surface #f9fafb, border #e5e7eb
- Accent: #16a34a brand green, #15803d green-700 for text/buttons
- Text: #111827 ink, #6b7280 secondary
- Status: amber #d97706 (awaiting), red #dc2626 (missed)
- Splash: black → charcoal (#000000 → #111827), white wordmark, small green dot
- Display font: Inter (bold, tight tracking -0.02em)
- Body font: Inter; Tamil Noto Sans Tamil; Hindi Noto Sans Devanagari
- Strongest visual element: the plan card with its source quote, and the unchanged drug name across three scripts

## Share copy (draft)
Built CareBridge: a discharge summary becomes a doctor-approved plan, reminders arrive in English, Tamil or Hindi,
and the medicine name is never translated.

## Audio direction
- Role: warm bed under narration, sparse professional accents
- Music: happy-beats-business-moves-vol-11 (114.8 BPM)
- Music treatment: fade in over 0.6s, ducked to ~0.13 under the voiceover, lift slightly for the logo, fade out
  over the last ~1.2s
- Music cue guidance: preset read (vol-11). Strong cues in window: 1.60, 3.70, 5.80, 8.96, 12.65, 17.91, 22.65.
  Candidate locks: highlight lands ≈1.60, "Approved" flip ≈12.65, logo ≈22.65 (adjust to narration).
  Language switches use every other beat (~1.05s apart) so each script is readable.
- Audio-reactive treatment: subtle; the splash's soft glow behind the heart breathes with music RMS. No visualizers.
- SFX posture: sparse, motion-matched: a soft placement as the card lands, one click on Approve, a gentle switch on
  each language change, one soft notification for the missed-dose alert, one restrained bell/soft impact on the logo.
- Audio-coupled moments: highlight sweep, card landing, approve click, language switches, family alert, logo.
- Restraint rule: nothing alarming on the missed dose (it's a family nudge, not an alarm); no sound on every tween.

## Voiceover script
Meet CareBridge.
A discharge summary becomes a plan, and every item keeps the line it came from.
Nothing reaches the patient until a doctor approves.
Reminders arrive in their own language, the medicine name untouched.
Miss a dose, and the family knows.
Need a cardiologist? The map suggests care nearby.
CareBridge. From discharge to recovery.

(v2, 25.0 s: added a dark intro and a provider-map scene at the user's request. Map copy is the app's own:
"Map", "All", "Cardiology", "Named in your summary", "Call", "Open in Maps",
"Suggested location. Please confirm before visiting."; pins are the 70 synthetic seed providers.)

## v2 timeline (film seconds)
0.0 intro (dark splash, "Your discharge follow-up, step by step") · 2.1 page · 3.7 plan card · 6.7 doctor approves ·
9.6 reminders EN/TA/HI + family push · 16.1 map filtered to Cardiology, Sundara Bay sheet · 19.6 logo → 25.0

## Storyboard

### Scene 1 — The page — ~3.8s
Discharge page fragment (white sheet, mono-free Inter text): hospital header, "Discharge Medications:", four lines
including "2. Tab. Clopidogrel 75 mg — once daily after breakfast at 8:00 AM". Green highlight sweeps that line;
other lines dim to 35%.
Sequential/interaction: yes — the highlight sweep left → right, then the dimming.
Audio intent: calm entry, music fades in.
Audio-coupled idea: soft swipe/slide sound with the highlight.
Music: bed fading in.
Transition mood: soft → Scene 2 (the line lifts out of the page)

### Scene 2 — The plan card — ~4.6s
The line becomes the card: Medicines chip (green pill icon), title "Clopidogrel 75 mg", meta "Once daily · 8:00 AM ·
After breakfast", source quote in grey quotes below. A small label "Source line" next to the quote.
Sequential/interaction: card lands, then title, meta, quote settle in order (hold all ≥1.5s).
Audio intent: confident placement.
Audio-coupled idea: card-place sound on landing.
Transition mood: clean → Scene 3

### Scene 3 — Doctor approves — ~4.4s
Same card, now inside a doctor's plan sheet header "Dr. Lakshmi Narayanan · Cardiology", amber pill
"Awaiting approval". Cursor moves to green "Approve Plan" button and clicks; pill flips to green "Approved".
Sequential/interaction: yes — simulated click.
Audio intent: the moment of trust.
Audio-coupled idea: click on press; state flip aligned near strong cue 12.65.
Transition mood: slide → Scene 4

### Scene 4 — Reminder and family — ~5.4s
Phone mockup (white app UI, rounded card): "Morning dose · 8:00 AM" header, card "Clopidogrel 75 mg" + food line.
Language switches EN "After breakfast" → TA "காலை உணவுக்குப் பின்" (header "காலை மருந்து · 8:00 AM") → HI
"नाश्ते के बाद" (header "सुबह की खुराक · 8:00 AM"); the drug name stays put and gets a green underline.
Then a notification banner slides down at the top of a second (family) phone or the same frame:
"Missed dose · Murugan Selvam" / "Morning dose of Clopidogrel 75 mg (8:00 AM) not marked."
Sequential/interaction: yes — 3 language states (each held ≥1.0s), then the notification (held ≥1.6s).
Audio intent: warmth, then a gentle nudge.
Audio-coupled idea: switch tick on each language change; soft notification sound for the alert.
Transition mood: soft crossfade to dark → Scene 5

### Scene 5 — Logo — ~3.8s
Dark splash: pill icon crossfades (slight blur) into heart-pulse icon, "CareBridge" white bold, below it a green dot
+ "From Discharge to Recovery". Soft green glow behind the heart breathes with the music.
Sequential/interaction: icon morph, wordmark, tagline (hold ≥1.5s).
Audio intent: resolution.
Audio-coupled idea: one restrained bell/soft impact as the wordmark lands (~22.65 if timing allows).
Transition mood: hold, music fades out.

**Music mood for this video:** warm, light, optimistic (ducked under the voice)
**Audio summary:** a light business-beat bed sits under a calm narrator, with a handful of soft UI sounds that land
exactly on the line's journey, resolving into a single gentle hit on the logo.
