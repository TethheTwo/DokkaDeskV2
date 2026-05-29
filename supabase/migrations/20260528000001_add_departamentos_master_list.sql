-- Add departamentos to master_lists for AP and CG report forms
INSERT INTO public.master_lists (list_key, label, value, sort_order)
VALUES
  ('departamentos', 'La Paz', '{}', 1),
  ('departamentos', 'Santa Cruz', '{}', 2),
  ('departamentos', 'Cochabamba', '{}', 3),
  ('departamentos', 'Oruro', '{}', 4),
  ('departamentos', 'Potosí', '{}', 5),
  ('departamentos', 'Chuquisaca', '{}', 6),
  ('departamentos', 'Tarija', '{}', 7),
  ('departamentos', 'Beni', '{}', 8),
  ('departamentos', 'Pando', '{}', 9)
ON CONFLICT DO NOTHING;
