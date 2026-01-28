# Idealista Website Structure

## Page Types

### 1. Search Results Page
- **URL patterns**: 
  - `/alquiler-viviendas/...` (rent)
  - `/venta-viviendas/...` (sale)
  - `/multi/alquiler-viviendas/...` (multi-area search)

### 2. Property Detail Page
- **URL pattern**: `/inmueble/{property_id}/`

---

## Search Results Page Structure

### Listing Container
- **Parent container**: `section.items-container.items-list`
- **Individual listings**: `article.item`

### Listing Element Structure
```html
<article class="item" data-element-id="{property_id}">
  <!-- Contains property card -->
</article>
```

### Key Selectors for Data Extraction

| Data | Selector | Notes |
|------|----------|-------|
| Property ID | `data-element-id` attribute | On `article.item` |
| Property ID (alt) | `a[href*="/inmueble/"]` | Extract from URL regex `/inmueble/(\d+)/` |
| Title | `.item-link` | Text content or `title` attribute |
| Price | `.item-price` | Contains price with currency |
| Details | `.item-detail` | Contains size (m²) and rooms |
| Images | `img` elements | Count for photo count |

### Owner Type Detection (URL-based)
- **Agency listings**: URL contains `/pro/{agency-slug}/`
- **Owner listings**: URL contains `/inmueble/{id}/` (no `/pro/`)
- **Additional agency indicators**: `.logo-branding`, `[class*="logo"]`, `.item-logo`

### Energy Rating
- **NOT directly available on search results page**
- Fetched via background requests to detail pages
- Cached in `browser.storage.local` under `energyCache`

---

## Property Detail Page Structure

### Energy Rating Selectors
| Data | Selector/Pattern | Notes |
|------|------------------|-------|
| Energy Consumption | `[class*="icon-energy-c-"]` | Class contains letter A-G (e.g., `icon-energy-c-b`) |
| Energy Emissions | Second `icon-energy-c-X` match | Usually emissions rating |
| Certificate Tickets | `.left-{letter}`, `.right-{letter}` | Alternative source |

### Example Energy HTML
```html
<span class="icon-energy-c-b">35 kWh/m² año</span>  <!-- Consumption: B -->
<span class="icon-energy-c-a">6 kg CO2/m² año</span> <!-- Emissions: A -->
<span class="energy-certificate-img-ticket-left left-b" data-value-left-cee="35.0"></span>
<span class="energy-certificate-img-ticket-right right-a" data-value-right-cee="6.0"></span>
```

### Other Selectors
| Data | Selector | Notes |
|------|----------|-------|
| Title | `h1, .main-title` | Main property title |
| Price | `.info-data-price, .price-value` | Property price |
| Size | `.info-data span[class*="size"]` | Square meters |
| Rooms | `.info-features` | Parse from text |
| Description | `.comment p, .adCommentsLanguage` | Full description |
| Photos | `img[src*="idealista.com/pictures"]` | Gallery images |

---

## URL Patterns

### Search Results
```
https://www.idealista.com/alquiler-viviendas/barcelona/
https://www.idealista.com/multi/alquiler-viviendas/{area-codes}/con-precio-hasta_{max_price}/
```

### Property Detail
```
https://www.idealista.com/inmueble/{property_id}/
```

### Agency Profile
```
https://www.idealista.com/pro/{agency-slug}/
```

---

## Data Available per Page

### Search Results Page
- ✅ Property ID
- ✅ Title/Address
- ✅ Price
- ✅ Size (m²)
- ✅ Rooms
- ✅ Photo count
- ✅ Owner type (agency vs owner)
- ⚡ Energy rating (fetched from detail pages, cached)

### Property Detail Page
- ✅ All of the above
- ✅ Energy rating (consumption + emissions)
- ✅ Full description
- ✅ Detailed features
- ✅ Contact info
- ✅ Map location
