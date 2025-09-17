-- Seed values for Dernier Metro API
-- Safe to re-run: upserts on conflict

INSERT INTO public.config(key, value) VALUES
  ('app.name',       '{"service":"dernier-metro-api"}'),
  ('metro.defaults', '{"line":"M1","headwayMin":3,"tz":"Europe/Paris"}'),
  ('metro.last', '{
    "chatelet": "00:47",
    "bastille": "00:45",
    "ladefense": "00:40",
    "nation": "00:42",
    "concorde": "00:43",
    "garedelyon": "00:46",
    "portemaillot": "00:39",
    "chateaudevincennes": "00:44"
  }')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;