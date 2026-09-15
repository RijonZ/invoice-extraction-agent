-- Broaden the default category list beyond a single company's internal
-- expense types, so invoices from any industry (construction, finance,
-- healthcare, etc.) have a fitting category out of the box.
INSERT INTO categories (name) VALUES
  ('Construction & materials'),
  ('Finance & banking'),
  ('Healthcare & medical'),
  ('Legal services'),
  ('Marketing & advertising'),
  ('Manufacturing & equipment'),
  ('Logistics & transport'),
  ('Insurance'),
  ('Real estate & rent'),
  ('Education & training'),
  ('Hospitality & catering'),
  ('Consulting'),
  ('Telecommunications'),
  ('Retail & goods'),
  ('IT & technology')
ON CONFLICT (name) DO NOTHING;
