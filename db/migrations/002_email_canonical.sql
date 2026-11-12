-- One account per real inbox: Gmail ignores dots and anything after "+", and most
-- providers deliver "name+tag@" to "name@". Keep in step with canonicalEmail() in
-- src/email-policy.js.
ALTER TABLE clients ADD COLUMN email_canonical text;

UPDATE clients SET email_canonical = CASE
    WHEN split_part(email, '@', 2) IN ('gmail.com', 'googlemail.com')
      THEN replace(split_part(split_part(email, '@', 1), '+', 1), '.', '') || '@gmail.com'
    ELSE split_part(split_part(email, '@', 1), '+', 1) || '@' || split_part(email, '@', 2)
  END
WHERE email IS NOT NULL;

CREATE UNIQUE INDEX clients_email_canonical_key ON clients (email_canonical);
