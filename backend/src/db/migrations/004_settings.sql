CREATE TABLE app_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  extraction_model TEXT NOT NULL,
  amount_tolerance NUMERIC(6, 4) NOT NULL
);

INSERT INTO app_settings (id, extraction_model, amount_tolerance) VALUES (1, 'gpt-5.6', 0.02);
