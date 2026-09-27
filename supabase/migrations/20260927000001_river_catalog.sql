-- Reference catalog only. No synthetic observations, station counts or GIS features.
INSERT INTO public."River" (id, name, slug, description, "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, v.name, v.slug, v.description, now(), now()
FROM (VALUES
  ('Ganga', 'ganga', 'The Ganga-Padma river system.'),
  ('Chambal', 'chambal', 'A tributary of the Yamuna across central and northern India.'),
  ('Gandak', 'gandak', 'A Himalayan tributary of the Ganga.'),
  ('Kosi', 'kosi', 'A transboundary Himalayan river and Ganga tributary.'),
  ('Ghaghra', 'ghaghra', 'A major left-bank tributary of the Ganga.'),
  ('Son', 'son', 'A southern tributary of the Ganga.'),
  ('Mahananda', 'mahananda', 'A river of the eastern Indo-Gangetic plains.'),
  ('Beas', 'beas', 'A river flowing through Himachal Pradesh and Punjab.'),
  ('Sharda', 'sharda', 'A transboundary river along the India–Nepal region.'),
  ('Parman', 'parman', 'A river observatory in the Indo-Gangetic plains.'),
  ('Bagmati', 'bagmati', 'A transboundary river flowing from Nepal into Bihar.'),
  ('Budhi Gandak', 'budhi-gandak', 'A Ganga tributary flowing across Bihar.')
) AS v(name, slug, description)
WHERE NOT EXISTS (SELECT 1 FROM public."River" r WHERE r.slug = v.slug);
