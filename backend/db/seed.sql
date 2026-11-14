-- CareBridge MVP seed data. SYNTHETIC ONLY — no real people.
-- Test passwords (local testing only):
--   doctors D101–D104 : doctor123
--   admin A001        : admin123

insert into doctors (id, name, specialty, password_hash, schedule) values
  ('D101', 'Dr. Arun Prakash',      'General Medicine',         crypt('doctor123', gen_salt('bf')),
   '{"mon":["09:00","17:00"],"tue":["09:00","17:00"],"wed":["09:00","17:00"],"thu":["09:00","17:00"],"fri":["09:00","17:00"]}'),
  ('D102', 'Dr. Lakshmi Narayanan', 'Cardiology',               crypt('doctor123', gen_salt('bf')),
   '{"mon":["10:00","18:00"],"tue":["10:00","18:00"],"wed":["10:00","18:00"],"thu":["10:00","18:00"],"sat":["10:00","14:00"]}'),
  ('D103', 'Dr. Farida Begum',      'Endocrinology (Diabetes)', crypt('doctor123', gen_salt('bf')),
   '{"mon":["08:00","14:00"],"wed":["08:00","14:00"],"fri":["08:00","14:00"],"sat":["08:00","12:00"]}'),
  ('D104', 'Dr. Vignesh Ramasamy',  'Orthopedics',              crypt('doctor123', gen_salt('bf')),
   '{"tue":["09:00","17:00"],"thu":["09:00","17:00"],"fri":["09:00","17:00"]}')
on conflict (id) do nothing;

insert into admins (id, name, password_hash) values
  ('A001', 'Hospital Admin', crypt('admin123', gen_salt('bf')))
on conflict (id) do nothing;

-- Patients match the sample summaries in backend/data/sample_summaries/
insert into patients (id, name, assigned_doctor_id, language, lat, lng) values
  ('P1001', 'Murugan Selvam',  'D102', 'ta', 13.0870, 80.2125),  -- Anna Nagar   · 01 clean cardiac
  ('P1002', 'Kamala Devi',     'D103', 'ta', 12.9805, 80.2190),  -- Velachery    · 02 clean diabetes
  ('P1003', 'Rakesh Sharma',   'D104', 'hi', 13.0395, 80.2330),  -- T. Nagar     · 03 clean ortho
  ('P1004', 'Anitha Rajan',    'D101', 'en', 13.0020, 80.2580),  -- Adyar        · 04 missing dose
  ('P1005', 'Sunil Verma',     'D102', 'hi', 12.9520, 80.1450),  -- Chromepet    · 05 vague instruction
  ('P1006', 'Selvi Kannan',    'D101', 'ta', 13.0360, 80.1580)   -- Porur        · 06 conflicting meds
on conflict (id) do nothing;
