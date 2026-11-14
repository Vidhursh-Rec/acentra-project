# Hyperframes Composition Brief: CareBridge

## Objective
Create a short, polished launch-style brag video for CareBridge with narration.

## Output
- Composition directory: `brag-output/composition/`
- Rendered video: `brag-output/brag.mp4`
- Format: landscape — 1920x1080, 30 fps
- Duration: 23.0 s (narration 20.5 s starting at 0.4 s)

## Source Material
- Project root: `C:\Users\mgvin\Desktop\Acentra`
- Files read: `design-carebridge.md`, `management/src/index.css`, `management/src/pages/*`, `management/src/components/Splash.tsx`,
  `mobile/src/lib/i18n.ts`, `mobile/src/app/doctor/patient/[id].tsx`, `backend/app/med_text.py`, `backend/app/notify.py`,
  P1001's synthetic discharge summary (via the management API)
- Product name: CareBridge
- Tagline: "From Discharge to Recovery"
- Key UI to recreate: the plan card with source quote, the doctor's "Awaiting approval" → "Approved" badge with
  "Approve Plan" button, the patient's reminder card in EN / TA / HI, the family missed-dose push
- Copy that must appear verbatim:
  - "2. Tab. Clopidogrel 75 mg — once daily after breakfast at 8:00 AM" (and the other 4 medication lines)
  - "Clopidogrel 75 mg", "Awaiting approval", "Approved", "Approve Plan"
  - "Morning dose · 8:00 AM" / "காலை மருந்து · 8:00 AM" / "सुबह की खुराक · 8:00 AM"
  - "after breakfast" / "காலை உணவுக்குப் பின்" / "नाश्ते के बाद"
  - "Missed dose · Murugan Selvam" / "Morning dose of Clopidogrel 75 mg (8:00 AM) not marked."
  - "CareBridge", "From Discharge to Recovery"
- Privacy: "Murugan Selvam", "P1001", "Sundara Bay Medical Centre" and "Dr. Lakshmi Narayanan" are the project's synthetic
  seed data. The document's address/phone line is omitted.

## Creative Direction
- Tone preset: polished
- Creative direction: quiet premium product film for a clinical tool; one medicine line followed end to end
- Interpretation: long settled holds, soft crossfades/slides, critically damped motion, no exclamation
- Angle: the same drug name and dose survive every step — page → plan → doctor → phone in three scripts → family.
- Hook: green highlight sweeps line 2 of a real-looking discharge page; other lines dim.
- Outro: dark splash (black → charcoal), pill becomes heart, "CareBridge", green dot + "From Discharge to Recovery".
- Avoid: generic SaaS language, abstract filler, any invented product claim.

## Visual Identity
- Background #ffffff, surface #f9fafb, border #e5e7eb, ink #111827, secondary #6b7280
- Brand green #16a34a, green-700 #15803d; amber #d97706 / amber-800 #92400e on amber-100; red #dc2626
- Category chip for medicines: green-100 / green-700
- Fonts: Inter (variable, local woff2), Noto Sans Tamil, Noto Sans Devanagari (local TTFs)
- Radii: cards 24px, pills full; shadow soft

## Storyboard (film time)
1. The page — 0.0–3.2 — sheet settles; highlight sweeps line 2 (lands ≈1.60 strong cue); other lines dim; camera pushes in.
2. Plan card — 3.2–7.8 — card lands ≈3.70 (strong cue); title, meta, source quote settle; quote emphasised ≈5.80.
3. Doctor approves — 7.8–11.1 — header "Dr. Lakshmi Narayanan · Cardiology", amber "Awaiting approval"; cursor clicks
   "Approve Plan" ≈9.6; badge flips to "Approved" ≈10.01 (beat-grid).
4. Reminder + family — 11.1–17.95 — phone: EN → TA at 12.65 (strong cue) → HI at 14.22 (beat-grid), drug name
   underlined ≈13.6 while narration says "the medicine name untouched"; family phone enters 15.28, push lands 15.81.
5. Logo — 17.95–23.0 — dark splash at 17.91 (strong cue); wordmark ≈18.44 with "CareBridge" in the narration; tagline ≈19.2.

## Audio
- Role: warm bed under narration, sparse accents
- Music: `assets/music/happy-beats-business-moves-vol-11-by-ende-dot-app.mp3` (114.8 BPM), fade in 0.6 s, ducked to 0.14
  under the voice (0.4–20.9), lifted to ~0.3 after the last word, fade out over the final 1.4 s
- Cue source: bundled preset `cues/happy-beats-business-moves-vol-11…music-cues.json`
- Voiceover: `assets/voiceover.wav` (Kokoro af_heart), starts at 0.4 s
- SFX (chosen low/medium HF risk): card-slide-1 (highlight sweep), impactSoft_medium_001 (card lands),
  click_003 (Approve press), impactSoft_medium_004 (Approved), switch_007 (each language change),
  drop_002 (family push), impactBell_heavy_000 (wordmark, low volume)
- Audio-reactive: not used. The extraction helper ships with the hyperframes-creative skill, which is not installed
  on this machine; skipped per /brag guidance (does not block render).

## Hyperframes Instructions
Plain Hyperframes composition (paused GSAP root timeline on `window.__timelines["main"]`, `class="clip"` scenes with
`data-start`/`data-duration`, `<audio>` clips). Local fonts and audio. Run `hyperframes check`, then render locally.
