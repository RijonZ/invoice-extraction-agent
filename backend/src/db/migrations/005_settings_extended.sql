ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS company_name TEXT NOT NULL DEFAULT 'Invoice Extraction';
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS max_extraction_attempts SMALLINT NOT NULL DEFAULT 3 CHECK (max_extraction_attempts BETWEEN 1 AND 10);
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS default_currency TEXT NOT NULL DEFAULT 'USD';
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS banner_message TEXT;
