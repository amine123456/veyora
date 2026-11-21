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
    "record_count": 1300000,
    "frequency": "daily",
    "description": "Germany's largest car marketplace. 1.3M+ listings with full specs and dealer data.",
    "sample_fields": [
      "id",
      "title",
      "price",
      "mileage",
      "year",
      "fuel",
      "make",
      "model",
      "url",
      "photos"
    ]
  },
  {
    "feed_id": "lacentrale",
    "site_name": "La Centrale",
    "site_domain": "lacentrale.fr",
    "vertical": "cars",
    "country": "FR",
    "record_count": 346000,
    "frequency": "daily",
    "description": "Complete French used car listings with photos, specs, pricing and dealer info.",
    "sample_fields": [
      "id",
      "title",
      "price",
      "mileage",
      "year",
      "fuel",
      "transmission",
      "url",
      "photos"
    ]
  },
  {
    "feed_id": "zoomcar",
    "site_name": "Zoomcar",
    "site_domain": "zoomcar.fr",
    "vertical": "cars",
    "country": "FR",
    "record_count": 174000,
    "frequency": "daily",
    "description": "French car aggregator with enriched detail pages and photo URLs.",
    "sample_fields": [
      "id",
      "title",
      "price",
      "mileage",
      "year",
      "fuel",
      "url",
      "photos"
    ]
  },
  {
    "feed_id": "hasnalauto",
    "site_name": "Használtautó",
    "site_domain": "hasznaltauto.hu",
    "vertical": "cars",
    "country": "HU",
    "record_count": 118000,
    "frequency": "daily",
    "description": "Complete Hungarian used car marketplace with 118K+ listings including full specs, pricing, photos and seller info.",
    "sample_fields": [
      "seoH1",
      "vetelar",
      "kepekDb",
      "tagek",
      "talalatiInfoSor"
    ]
  },
  {
    "feed_id": "olx_ro",
    "site_name": "OLX Romania",
    "site_domain": "olx.ro",
    "vertical": "cars",
    "country": "RO",
    "record_count": 117000,
    "frequency": "daily",
    "description": "Full Romanian car classifieds from OLX.ro — 117K+ listings with descriptions, pricing, specs and photos.",
    "sample_fields": [
      "id",
      "url",
      "title",
      "price",
      "description",
      "year",
      "mileage_km",
      "fuel"
    ]
  },
  {
    "feed_id": "donedeal",
    "site_name": "DoneDeal",
    "site_domain": "donedeal.ie",
    "vertical": "cars",
    "country": "IE",
    "record_count": 99000,
    "frequency": "daily",
    "description": "Ireland's top car marketplace with enriched listing data.",
    "sample_fields": [
      "id",
      "title",
      "price",
      "mileage",
      "year",
      "fuel",
      "county",
      "url"
    ]
  },
  {
    "feed_id": "nettiauto",
    "site_name": "Nettiauto",
    "site_domain": "nettiauto.com",
    "vertical": "cars",
    "country": "FI",
    "record_count": 77000,
    "frequency": "daily",
    "description": "Finland's largest car marketplace with complete vehicle data.",
    "sample_fields": [
      "id",
      "title",
      "price",
      "mileage",
      "year",
      "fuel",
      "url"
    ]
  },
  {
    "feed_id": "aramisauto",
    "site_name": "Aramis Auto",
    "site_domain": "aramisauto.com",
    "vertical": "cars",
    "country": "FR",
    "record_count": 3000,
    "frequency": "daily",
    "description": "French online car dealer — complete inventory with pricing and specs.",
    "sample_fields": [
      "id",
      "title",
      "price",
      "mileage",
      "year",
      "fuel",
      "url"
    ]
  },
  {
    "feed_id": "similarweb",
    "site_name": "SimilarWeb",
    "site_domain": "similarweb.com",
    "vertical": "analytics",
    "country": "MULTI",
    "record_count": 136,
    "frequency": "monthly",
    "description": "Monthly web traffic analytics for 136 automotive brand domains.",
    "sample_fields": [
      "domain",
      "visits",
      "bounce_rate",
      "pages_per_visit",
      "avg_duration",
      "country_rank"
    ]
  }
];
