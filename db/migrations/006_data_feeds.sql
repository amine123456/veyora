-- Managed Data Feeds: catalog, subscriptions, delivery configs, delivery logs.

CREATE TABLE feed_catalog (
  feed_id           text PRIMARY KEY CHECK (feed_id ~ '^[a-z0-9_-]{2,40}$'),
  site_domain       text NOT NULL UNIQUE,
  site_name         text NOT NULL,
  vertical          text NOT NULL CHECK (vertical IN ('cars','real_estate','jobs','reviews','analytics')),
  country           text NOT NULL CHECK (country ~ '^[A-Z]{2}$' OR country = 'MULTI'),
  status            text NOT NULL DEFAULT 'active' CHECK (status IN ('active','coming_soon','disabled')),
  record_count      integer NOT NULL DEFAULT 0,
  frequency         text NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily','weekly','monthly')),
  base_price_cents  integer NOT NULL DEFAULT 20000,
  currency          text NOT NULL DEFAULT 'eur' CHECK (currency ~ '^[a-z]{3}$'),
  description       text NOT NULL DEFAULT '',
  sample_fields     text[] NOT NULL DEFAULT '{}',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE feed_subscriptions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username          text NOT NULL REFERENCES clients (username) ON DELETE CASCADE,
  feed_id           text NOT NULL REFERENCES feed_catalog (feed_id),
  status            text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','paused','cancelled')),
  frequency         text NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily','weekly','monthly')),
  delivery_method   text NOT NULL DEFAULT 'sftp' CHECK (delivery_method IN ('sftp','snowflake','webhook','manual')),
  price_cents       integer NOT NULL CHECK (price_cents > 0),
  currency          text NOT NULL DEFAULT 'eur',
  started_at        timestamptz,
  cancelled_at      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (username, feed_id)
);
CREATE INDEX feed_subscriptions_username ON feed_subscriptions (username);
CREATE INDEX feed_subscriptions_feed ON feed_subscriptions (feed_id, status);

CREATE TABLE delivery_configs (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id     uuid NOT NULL UNIQUE REFERENCES feed_subscriptions (id) ON DELETE CASCADE,
  method              text NOT NULL CHECK (method IN ('sftp','snowflake','webhook','manual')),
  sftp_host           text,
  sftp_port           integer DEFAULT 22 CHECK (sftp_port IS NULL OR sftp_port BETWEEN 1 AND 65535),
  sftp_username       text,
  sftp_password       text,
  sftp_path           text,
  snowflake_account   text,
  snowflake_warehouse text,
  snowflake_database  text,
  snowflake_schema    text,
  webhook_url         text,
  webhook_secret      text,
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE delivery_logs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id   uuid NOT NULL REFERENCES feed_subscriptions (id) ON DELETE CASCADE,
  feed_id           text NOT NULL REFERENCES feed_catalog (feed_id),
  snapshot_date     date NOT NULL,
  status            text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','uploading','delivered','failed','skipped')),
  record_count      integer,
  file_size_bytes   bigint,
  sha256            text,
  error             text,
  started_at        timestamptz,
  completed_at      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX delivery_logs_sub_date ON delivery_logs (subscription_id, snapshot_date DESC);
CREATE INDEX delivery_logs_feed_date ON delivery_logs (feed_id, snapshot_date DESC);

-- Seed catalog with all 19 known crawlers.
INSERT INTO feed_catalog (feed_id, site_domain, site_name, vertical, country, status, record_count, frequency, base_price_cents, description, sample_fields) VALUES
  ('lacentrale',    'lacentrale.fr',      'La Centrale',      'cars',        'FR',    'active',      346000,  'daily',   20000, 'Complete French used car listings with photos, specs, pricing and dealer info.',       '{"id","title","price","mileage","year","fuel","transmission","url","photos"}'),
  ('mobilede',      'mobile.de',          'Mobile.de',        'cars',        'DE',    'active',      1300000, 'daily',   35000, 'Germany''s largest car marketplace. 1.3M+ listings with full specs and dealer data.',   '{"id","title","price","mileage","year","fuel","make","model","url","photos"}'),
  ('nettiauto',     'nettiauto.com',      'Nettiauto',        'cars',        'FI',    'active',      77000,   'daily',   15000, 'Finland''s largest car marketplace with complete vehicle data.',                        '{"id","title","price","mileage","year","fuel","url"}'),
  ('donedeal',      'donedeal.ie',        'DoneDeal',         'cars',        'IE',    'active',      99000,   'daily',   18000, 'Ireland''s top car marketplace with enriched listing data.',                            '{"id","title","price","mileage","year","fuel","county","url"}'),
  ('zoomcar',       'zoomcar.fr',         'Zoomcar',          'cars',        'FR',    'active',      174000,  'daily',   22000, 'French car aggregator with enriched detail pages and photo URLs.',                     '{"id","title","price","mileage","year","fuel","url","photos"}'),
  ('aramisauto',    'aramisauto.com',     'Aramis Auto',      'cars',        'FR',    'active',      3000,    'daily',   10000, 'French online car dealer — complete inventory with pricing and specs.',                 '{"id","title","price","mileage","year","fuel","url"}'),
  ('similarweb',    'similarweb.com',     'SimilarWeb',       'analytics',   'MULTI', 'active',      136,     'monthly', 50000, 'Monthly web traffic analytics for 136 automotive brand domains.',                      '{"domain","visits","bounce_rate","pages_per_visit","avg_duration","country_rank"}'),
  ('milanuncios',   'milanuncios.com',    'Milanuncios',      'cars',        'ES',    'coming_soon', 403000,  'daily',   25000, 'Spain''s largest classifieds. 400K+ car listings.',                                    '{"id","title","price","mileage","year","fuel","url"}'),
  ('coches',        'coches.net',         'Coches.net',       'cars',        'ES',    'coming_soon', 291000,  'daily',   22000, 'Spanish used car marketplace with dealer and private listings.',                        '{"id","title","price","mileage","year","fuel","url"}'),
  ('leboncoin',     'leboncoin.fr',       'Leboncoin',        'cars',        'FR',    'coming_soon', 801000,  'daily',   40000, 'France''s #1 classifieds. 800K+ car listings.',                                        '{"id","title","price","mileage","year","city","url"}'),
  ('cargurus_uk',   'cargurus.co.uk',     'CarGurus UK',      'cars',        'GB',    'coming_soon', 237000,  'daily',   22000, 'UK used car price comparison with dealer ratings.',                                    '{"id","title","price","mileage","year","fuel","url"}'),
  ('gocar',         'gocar.be',           'Gocar.be',         'cars',        'BE',    'coming_soon', 48000,   'daily',   12000, 'Belgian car marketplace.',                                                             '{"id","title","price","mileage","year","url"}'),
  ('tayara',        'tayara.tn',          'Tayara',           'cars',        'TN',    'coming_soon', 7000,    'daily',   8000,  'Tunisian classifieds — car listings.',                                                 '{"id","title","price","year","url"}'),
  ('autocasion',    'autocasion.com',     'Autocasion',       'cars',        'ES',    'coming_soon', 0,       'daily',   15000, 'Spanish used car marketplace.',                                                        '{"id","title","price","mileage","year","url"}'),
  ('quintoandar',   'quintoandar.com.br', 'QuintoAndar',      'real_estate', 'BR',    'coming_soon', 717000,  'daily',   35000, 'Brazilian real estate listings — apartments and houses, rent and sale.',                '{"id","title","price","area","rooms","neighborhood","city","url"}'),
  ('tanitjobs',     'tanitjobs.com',      'TanitJobs',        'jobs',        'TN',    'coming_soon', 2800,    'daily',   8000,  'Tunisian job listings.',                                                               '{"id","title","company","location","url"}'),
  ('keejob',        'keejob.com',         'Keejob',           'jobs',        'TN',    'coming_soon', 888,     'daily',   6000,  'Tunisian job marketplace.',                                                            '{"id","title","company","url"}'),
  ('emploitunisie', 'emploitunisie.com',  'EmploiTunisie',    'jobs',        'TN',    'coming_soon', 341,     'daily',   5000,  'Tunisian employment portal.',                                                          '{"id","title","company","url"}'),
  ('capterra',      'capterra.com',       'Capterra',         'reviews',     'MULTI', 'coming_soon', 5000,    'weekly',  30000, 'Software reviews and product comparisons.',                                            '{"id","product","category","rating","review_count","url"}'),
  ('hasnalauto',    'hasznaltauto.hu',    'Használtautó',     'cars',        'HU',    'active',      118000,  'daily',   18000, 'Complete Hungarian used car marketplace with 118K+ listings.',                         '{"seoH1","vetelar","kepekDb","tagek","talalatiInfoSor"}'),
  ('olx_ro',        'olx.ro',             'OLX Romania',      'cars',        'RO',    'active',      117000,  'daily',   18000, 'Full Romanian car classifieds from OLX.ro — 117K+ listings.',                          '{"id","url","title","price","description","year","mileage_km","fuel"}'),
  ('olxpt',         'olx.pt',             'OLX Portugal',     'cars',        'PT',    'coming_soon', 51000,   'daily',   12000, 'Portuguese car classifieds from OLX.pt — 51K+ listings.',                              '{"id","url","title","price","year","mileage_km","fuel"}'),
  ('cargr',         'car.gr',             'Car.gr',           'cars',        'GR',    'coming_soon', 146000,  'daily',   22000, 'Greek car marketplace — 146K+ listings with detailed specs.',                          '{"geolocation","marketplace","price_per_unit","label","states"}'),
  ('carzone',       'carzone.ie',         'Carzone',          'cars',        'IE',    'coming_soon', 0,       'daily',   15000, 'Irish car classifieds from Carzone.ie.',                                               '{"id","url","title","price","make","model"}'),
  ('carsireland',   'carsireland.ie',     'CarsIreland',      'cars',        'IE',    'coming_soon', 0,       'daily',   15000, 'Irish car marketplace from CarsIreland.ie.',                                           '{"id","url","title","price","make","model"}'),
  ('bvmt',          'tunis-stockexchange.com', 'Bourse de Tunis (BVMT)', 'analytics', 'TN', 'coming_soon', 0, 'daily',  10000, 'Tunisian stock exchange data — daily prices, volumes, indices.',                        '{"market_resume","indices","referentiel_bourse","participation_etr"}');
