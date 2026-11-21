// Snapshot of the live feed catalog, rendered into the HTML so crawlers see it.
// feeds.js replaces it with the current catalog from /api/feeds on load.
export type LiveFeed = { feed_id: string; site_name: string; site_domain: string; vertical: string; country: string; record_count: number; frequency: string; description: string; sample_fields: string[] };

export const LIVE_FEEDS: LiveFeed[] = [
  {
    "feed_id": "mobilede",
    "site_name": "Mobile.de",
    "site_domain": "mobile.de",
    "vertical": "cars",
    "country": "DE",
    "record_count": 1313000,
    "frequency": "daily",
    "description": "Germany's largest car marketplace. 1.3M+ raw listings with original API fields.",
    "sample_fields": ["siteId", "p", "st", "shortTitle", "subTitle", "attr", "contact", "created", "modified", "makeId", "modelId", "numImages", "isNew"]
  },
  {
    "feed_id": "leboncoin",
    "site_name": "Leboncoin",
    "site_domain": "leboncoin.fr",
    "vertical": "cars",
    "country": "FR",
    "record_count": 801000,
    "frequency": "daily",
    "description": "France's largest classifieds platform. 800K+ car listings with raw listing data.",
    "sample_fields": ["list_id", "subject", "body", "price", "images", "attributes", "location", "owner", "has_phone", "url"]
  },
  {
    "feed_id": "milanuncios",
    "site_name": "Milanuncios",
    "site_domain": "milanuncios.com",
    "vertical": "cars",
    "country": "ES",
    "record_count": 403000,
    "frequency": "daily",
    "description": "Spain's top classifieds site. 400K+ car listings with raw API response fields.",
    "sample_fields": ["adId", "titulo", "cuerpo", "precio", "fotos", "km", "anno", "combustible", "provincia", "vendedor"]
  },
  {
    "feed_id": "lacentrale",
    "site_name": "La Centrale",
    "site_domain": "lacentrale.fr",
    "vertical": "cars",
    "country": "FR",
    "record_count": 386000,
    "frequency": "daily",
    "description": "France's leading used car portal. Raw API data with vehicle object, pricing, location and media.",
    "sample_fields": ["vehicle", "reference", "price", "location", "customerType", "picturesCount", "lastUpdate", "firstOnlineDate", "photoUrl", "score"]
  },
  {
    "feed_id": "coches",
    "site_name": "Coches.net",
    "site_domain": "coches.net",
    "vertical": "cars",
    "country": "ES",
    "record_count": 291000,
    "frequency": "daily",
    "description": "Spain's largest car marketplace. 290K+ listings with raw mobile API data.",
    "sample_fields": ["adId", "title", "price", "km", "year", "fuelType", "bodyType", "province", "sellerType", "photos"]
  },
  {
    "feed_id": "cargurus_uk",
    "site_name": "CarGurus UK",
    "site_domain": "cargurus.co.uk",
    "vertical": "cars",
    "country": "GB",
    "record_count": 237000,
    "frequency": "daily",
    "description": "UK car marketplace with deal ratings. 237K+ listings with raw web API fields.",
    "sample_fields": ["id", "listingTitle", "price", "mileage", "year", "fuelType", "dealRating", "dealScore", "sellerType", "photoUrls"]
  },
  {
    "feed_id": "zoomcar",
    "site_name": "Zoomcar",
    "site_domain": "zoomcar.fr",
    "vertical": "cars",
    "country": "FR",
    "record_count": 174000,
    "frequency": "daily",
    "description": "French car aggregator. Raw Algolia index records with detail page data.",
    "sample_fields": ["id", "vehicle_id", "slug", "cover", "published_at", "model_text", "version", "l_bmarque", "l_id_marque", "price", "is_pro", "vehicle_type"]
  },
  {
    "feed_id": "cargr",
    "site_name": "Car.gr",
    "site_domain": "car.gr",
    "vertical": "cars",
    "country": "GR",
    "record_count": 146000,
    "frequency": "daily",
    "description": "Greece's largest car marketplace. Raw listing data with pricing, geolocation and seller info.",
    "sample_fields": ["geolocation", "marketplace", "price_per_unit", "label", "states", "user", "photos", "attributes", "created_at"]
  },
  {
    "feed_id": "hasnalauto",
    "site_name": "Használtautó",
    "site_domain": "hasznaltauto.hu",
    "vertical": "cars",
    "country": "HU",
    "record_count": 118000,
    "frequency": "daily",
    "description": "Hungary's largest used car site. Raw Hungarian-language API records.",
    "sample_fields": ["seoH1", "vetelar", "kepekDb", "tagek", "talalatiInfoSor", "alvazszam", "szin", "km", "evjarat", "ar"]
  },
  {
    "feed_id": "olx_ro",
    "site_name": "OLX Romania",
    "site_domain": "olx.ro",
    "vertical": "cars",
    "country": "RO",
    "record_count": 117000,
    "frequency": "daily",
    "description": "Romania's top classifieds platform. Raw API data with params, contacts, map coordinates and photos.",
    "sample_fields": ["id", "url", "title", "last_refresh_time", "description", "params", "key_params", "user", "contact", "map", "location", "photos"]
  },
  {
    "feed_id": "donedeal",
    "site_name": "DoneDeal",
    "site_domain": "donedeal.ie",
    "vertical": "cars",
    "country": "IE",
    "record_count": 99000,
    "frequency": "daily",
    "description": "Ireland's top car marketplace. Raw search API data with dealer IDs, pricing, gallery and tags.",
    "sample_fields": ["id", "userId", "dealerId", "title", "section", "publishDate", "county", "countyTown", "friendlyUrl", "priceInfo", "gallery", "mileageInKm", "tags"]
  },
  {
    "feed_id": "nettiauto",
    "site_name": "Nettiauto",
    "site_domain": "nettiauto.com",
    "vertical": "cars",
    "country": "FI",
    "record_count": 77000,
    "frequency": "daily",
    "description": "Finland's largest car marketplace. Raw JSON API records with full vehicle specs.",
    "sample_fields": ["id", "make", "model", "title", "category", "year", "price_eur", "mileage_km", "fuel_type", "seller", "status", "url", "crawled_at"]
  },
  {
    "feed_id": "sahibinden",
    "site_name": "Sahibinden",
    "site_domain": "sahibinden.com",
    "vertical": "cars",
    "country": "TR",
    "record_count": 61,
    "frequency": "daily",
    "description": "Turkey's largest classifieds platform. Raw mobile API listing data.",
    "sample_fields": ["id", "title", "url", "price", "location", "date", "image_url"]
  },
  {
    "feed_id": "gocar",
    "site_name": "Gocar.be",
    "site_domain": "gocar.be",
    "vertical": "cars",
    "country": "BE",
    "record_count": 48000,
    "frequency": "daily",
    "description": "Belgium's leading car marketplace. Raw listing API data with brand/model IDs and pricing.",
    "sample_fields": ["id", "vehicle_id", "slug", "cover", "published_at", "model_text", "version", "l_bmarque", "l_id_marque", "price", "is_pro", "vehicle_type"]
  },
  {
    "feed_id": "tayara",
    "site_name": "Tayara",
    "site_domain": "tayara.tn",
    "vertical": "cars",
    "country": "TN",
    "record_count": 6914,
    "frequency": "daily",
    "description": "Tunisia's largest classifieds site. Raw Next.js data API records with pricing in TND.",
    "sample_fields": ["id", "title", "description", "price_tnd", "images", "governorate", "delegation", "publisher_name", "publisher_is_shop", "published_on", "sub_category", "url"]
  },
  {
    "feed_id": "aramisauto",
    "site_name": "Aramis Auto",
    "site_domain": "aramisauto.com",
    "vertical": "cars",
    "country": "FR",
    "record_count": 3000,
    "frequency": "daily",
    "description": "French online car dealer. Raw inventory data from Nuxt SSR pages.",
    "sample_fields": ["id", "title", "price", "mileage", "year", "fuel", "url", "make", "model", "version"]
  },
  {
    "feed_id": "quintoandar",
    "site_name": "QuintoAndar",
    "site_domain": "quintoandar.com.br",
    "vertical": "real_estate",
    "country": "BR",
    "record_count": 717000,
    "frequency": "daily",
    "description": "Brazil's largest rental platform. Raw Next.js SSR data across 99 cities — rent, sale and new units.",
    "sample_fields": ["id", "title", "price", "area", "rooms", "neighborhood", "city", "url"]
  },
  {
    "feed_id": "capterra",
    "site_name": "Capterra",
    "site_domain": "capterra.com",
    "vertical": "reviews",
    "country": "MULTI",
    "record_count": 1367,
    "frequency": "weekly",
    "description": "Software review site. Raw review data with ratings, pros/cons, reviewer demographics.",
    "sample_fields": ["product_id", "product_slug", "review_title", "date", "rating", "body", "pros", "cons", "reviewer_name", "job_title", "industry", "company_size", "usage_duration"]
  },
  {
    "feed_id": "similarweb",
    "site_name": "SimilarWeb",
    "site_domain": "similarweb.com",
    "vertical": "analytics",
    "country": "MULTI",
    "record_count": 136,
    "frequency": "monthly",
    "description": "Monthly web traffic analytics for 136 automotive brand domains. Raw scraped metrics.",
    "sample_fields": ["domain", "country", "brand", "link", "source_date", "excel_visits", "excel_bounce_rate", "excel_pages_per_visit", "excel_visit_duration_s", "global_rank", "country_rank"]
  }
];
