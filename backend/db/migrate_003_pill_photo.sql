-- Additional feature: Hub Manager adds a photo + colours of each medicine strip
-- so an elderly patient can recognise which pill to take.
alter table plan_items add column if not exists pill_photo_path text;      -- Supabase Storage path
alter table plan_items add column if not exists pill_color      text;      -- white, yellow, ...
alter table plan_items add column if not exists pill_shape      text;      -- round, oval, capsule
alter table plan_items add column if not exists strip_color     text;      -- silver, gold, blue, ...
alter table plan_items add column if not exists pill_added_by   text;      -- Hub Manager's name
alter table plan_items add column if not exists pill_added_at   timestamptz;
