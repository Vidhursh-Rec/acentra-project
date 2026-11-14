# CareBridge: recovered project

The original `Desktop\Acentra` folder was deleted (no git remote, so the commit history is gone).
Rebuilt on 14 Nov 2026 from Claude Code's session logs (11–19 Oct 2026) and backups.
Raw logs and backups kept in `Documents\carebridge-recovery\` (projects/, file-history/): keep until pushed to GitHub.

## Restored
- backend/, mobile/src/, management/src/: all code, final versions. Two independent rebuilds were compared file by
  file; where they differed, the newer version (with the backend hardening and the website polish) was kept.
  Older variants are in `_superseded/`.
- Spec docs: project.md, frontend.md, backend.md, dataset.md (complete, from the first session's attachments),
  design-carebridge.md (with the 16–17 Oct edits re-applied), DECISIONS.md, testing.md, deep-dive/, brag-output/ text.
- backend/db/seed_providers.sql: exported from the live Supabase table (70 synthetic providers).
- Dataset/uploads/: the 9 discharge documents uploaded during testing, downloaded from Supabase Storage.
- management/src/components/ui/: regenerated with shadcn (never customised).
- Config files (package.json, app.json, tsconfig) rebuilt from logged output; the app installs, typechecks and bundles.

## New (not the originals)
- mobile/assets/brand/*: the 7 app images were rebuilt from new reference images in mobile/assets/
  (seedling robot = icon + login banner, nurse = splash, granny + nurse = language banner, 3 language tiles).

## Still missing
- design-refs/ (reference screenshots): images were never in the logs.
- The original Dataset/ files that were never uploaded through the app.

## Run it
    cd backend && .venv\Scripts\python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
    cd management && npm run dev
    cd mobile && npx expo start --lan      (set EXPO_PUBLIC_API_URL in mobile/.env to this PC's Wi-Fi IP)
