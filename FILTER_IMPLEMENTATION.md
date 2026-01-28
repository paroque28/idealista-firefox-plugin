# Idealista Helper - Filter Implementation

## Currently Implemented Filters

### 1. Owner Type Filter ✅
- **Purpose**: Filter listings by advertiser type
- **Options**: All, Solo particulares (owners), Solo agencias (agencies)
- **Detection method**: URL pattern
  - `/pro/` in URL = agency
  - `/inmueble/` in URL = owner (unless agency logo present)
- **Status**: Working

### 2. Energy Rating Filter ✅
- **Purpose**: Filter by minimum energy certificate (A-G)
- **Data source**: Fetched from property detail pages via background requests
- **Caching**: Results cached in `browser.storage.local` under `energyCache`
- **Rate limiting**: Max 10 fetches per page load, 500ms apart
- **Status**: Working

### 3. Hide Viewed Listings ✅
- **Purpose**: Dim or hide properties user has already viewed
- **Status**: UI implemented

### 4. Show Red Flags ✅
- **Purpose**: Display warning indicators for suspicious listings
- **Status**: UI implemented

---

## UI Components

### Search Page
- **Filter Panel**: Injected at top of `.items-container.items-list`
- **Stats Display**: Shows visible/hidden count, agency/owner breakdown
- **Listing Badges**: Show owner type + energy rating on each listing

### Property Detail Page
- **Summary Widget**: Purple gradient card showing:
  - Price (with €/m² calculation)
  - Size (m²)
  - Rooms
  - Photo count
  - Energy rating (colored, shows consumption + emissions)
- **Red Flags Widget**: Warning signs for suspicious listings

---

## Data Extraction Sample

```json
{
  "id": "95588814",
  "title": "Piso en Calle de la Reina Amàlia, El Raval, Barcelona",
  "price": 1700,
  "size": 65,
  "rooms": 2,
  "photos": 12,
  "url": "https://www.idealista.com/inmueble/95588814/",
  "energyRating": "B",
  "energyConsumption": "B",
  "energyEmissions": "A",
  "ownerType": "owner"
}
```

---

## Technical Implementation

### Energy Data Flow
1. Search page loads → show badges with `⚡N/A`
2. Check `energyCache` for cached data
3. Fetch detail pages for uncached listings (max 10, 500ms apart)
4. Parse energy from `icon-energy-c-{letter}` classes
5. Cache results and update badges live

### Storage Keys
- `energyCache`: Cached energy ratings by property ID
- `viewedListings`: Properties user has viewed
- `priceHistory`: Price tracking over time
- `preferences`: User filter settings

---

## Future Filter Ideas

1. **Price per m²** - Calculate and filter by price efficiency
2. **Minimum photos** - Hide listings with few photos
3. **Keyword exclusion** - Hide listings containing certain words
4. **Neighborhood filter** - Additional local area filtering
5. **Age of listing** - Prioritize fresh listings

---

## Known Limitations

1. Energy fetching limited to 10 per page to avoid rate limiting
2. Some owner/agency detection may be inaccurate for edge cases
3. Dynamic page loading requires MutationObserver for new listings
