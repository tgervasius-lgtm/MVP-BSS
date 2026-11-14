ALTER TABLE report_exports
  ADD COLUMN privacy_profile text NOT NULL DEFAULT 'full',
  ADD CONSTRAINT report_exports_privacy_profile_check
    CHECK (privacy_profile = 'full'
      OR (privacy_profile = 'accounting_minimized' AND report_type = 'correction_log'));
