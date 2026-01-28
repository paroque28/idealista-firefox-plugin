# Information Needed for Idealista Firefox Plugin Development

This document outlines the information, decisions, and clarifications needed to complete the implementation of the Idealista Helper Firefox plugin.

## 1. Feature Priorities & Scope

### Energy Rating Filter
- **Question**: What energy ratings should be filterable? (A, B, C, D, E, F, G, or custom ranges?)
- **Question**: Should this be a multi-select filter or single-select?
- **Question**: How should properties without energy rating information be handled?
  - [ ] Show by default
  - [ ] Hide by default
  - [ ] Have a separate "Unknown" option

### AI-Powered Features
- **Question**: Which AI provider/API should be integrated?
  - [ ] OpenAI (ChatGPT)
  - [ ] Anthropic (Claude)
  - [ ] Local AI model
  - [ ] Other: _________________
  
- **Question**: What is the AI budget/cost constraint per user?
- **Question**: Should AI features require user API keys or should there be a backend service?

#### Automatic Responses
- **Question**: What type of automatic responses are needed?
  - [ ] Generate inquiry messages to landlords
  - [ ] Auto-respond to property listings
  - [ ] Suggest questions to ask based on property details
  - [ ] Other: _________________

- **Question**: What information should be included in automatic responses?
  - [ ] User preferences (budget, move-in date, etc.)
  - [ ] Specific questions about the property
  - [ ] Standard introduction template
  - [ ] Other: _________________

#### AI Filtering
- **Question**: What criteria should AI use for filtering properties?
  - [ ] Match against user-written description of ideal property
  - [ ] Detect suspicious listings
  - [ ] Analyze property description sentiment/quality
  - [ ] Price vs. features value assessment
  - [ ] Other: _________________

- **Question**: Should AI filtering be:
  - [ ] Automatic (hides/shows properties automatically)
  - [ ] Advisory (shows score/recommendation)
  - [ ] Both (user can configure)

### Red Flags Detection
- **Question**: What constitutes a "red flag"? Please prioritize:
  - [ ] Suspiciously low price compared to area average
  - [ ] Missing critical information (no photos, vague description)
  - [ ] Listing active for very long time
  - [ ] Duplicate listings (same property, different accounts)
  - [ ] Keywords suggesting scam ("advance payment", "Western Union", etc.)
  - [ ] Property photos appear to be stock images
  - [ ] Contact information seems suspicious
  - [ ] Other: _________________

- **Question**: How should red flags be displayed?
  - [ ] Warning badge on listing card
  - [ ] Separate red flags panel
  - [ ] Change card border color
  - [ ] Block/hide suspicious listings
  - [ ] Other: _________________

## 2. User Experience & Interface

### Filter Placement
- **Question**: Where should the new filters appear?
  - [ ] Integrate into existing Idealista filter sidebar
  - [ ] Create separate "Advanced Filters" section
  - [ ] Floating panel that can be toggled
  - [ ] Other: _________________

### UI/UX Preferences
- **Question**: Should the plugin follow Idealista's existing design system?
- **Question**: What color scheme should be used for plugin elements?
- **Question**: Should there be a dark mode option?

### Data Persistence
- **Question**: What user preferences should be saved?
  - [ ] Filter selections
  - [ ] AI settings and prompts
  - [ ] Red flag sensitivity settings
  - [ ] API keys (if applicable)
  - [ ] Search history
  - [ ] Other: _________________

## 3. Technical Requirements

### Data Collection
- **Question**: How will energy rating data be collected?
  - [ ] Scrape from individual property pages (requires opening each listing)
  - [ ] Use Idealista API (if available - need API access)
  - [ ] Maintain own database of scraped data
  - [ ] Other: _________________

- **Question**: Should the plugin cache property data to avoid repeated requests?
- **Question**: What is the acceptable performance impact (page load time)?

### Privacy & Security
- **Question**: What data can be collected/stored?
  - [ ] User preferences only
  - [ ] Property data for caching
  - [ ] User search patterns
  - [ ] Analytics/usage statistics
  
- **Question**: Where should sensitive data (API keys) be stored?
  - [ ] Local browser storage only
  - [ ] Encrypted local storage
  - [ ] Remote secure backend
  
- **Question**: Is a privacy policy required?

### Browser Compatibility
- **Question**: Which Firefox versions should be supported?
  - Minimum version: _________________
  - Target latest version
  
- **Question**: Are there plans for Chrome/Edge versions?

## 4. External Dependencies & Integrations

### APIs Needed
- [ ] Idealista API (if available)
- [ ] AI Provider API (OpenAI, Claude, etc.)
- [ ] Image recognition API (for detecting stock photos)
- [ ] Price comparison/market data API
- [ ] Other: _________________

### Reference Projects
Please provide links to similar projects or inspirations:
- Similar real estate search enhancers: _________________
- Example Firefox plugins with similar functionality: _________________
- Design inspiration: _________________

## 5. Development & Deployment

### Testing
- **Question**: How should the plugin be tested?
  - [ ] Manual testing on live Idealista site
  - [ ] Automated tests (need test data/mock pages)
  - [ ] Beta testing with users
  
- **Question**: Test user accounts available for Idealista?

### Distribution
- **Question**: How will the plugin be distributed?
  - [ ] Firefox Add-ons store (official)
  - [ ] Self-hosted (load unsigned)
  - [ ] GitHub releases
  - [ ] Other: _________________

### Maintenance & Updates
- **Question**: What happens if Idealista changes their website structure?
- **Question**: Is there a budget/plan for maintaining API integrations?

## 6. Legal & Compliance

- **Question**: Have you reviewed Idealista's Terms of Service regarding automated tools?
- **Question**: Are there any legal concerns with scraping property data?
- **Question**: Is GDPR compliance required (EU users)?
- **Question**: Do you need to contact Idealista for official API access?

## 7. Success Metrics

**Question**: How will success be measured?
- [ ] Number of active users
- [ ] User-reported time saved
- [ ] Number of successful property inquiries
- [ ] User satisfaction ratings
- [ ] Other: _________________

## Next Steps

Please fill out this document with your answers and preferences. Priority items are marked with [HIGH], [MEDIUM], or [LOW] tags.

Once we have this information, we can:
1. Finalize the architecture
2. Create detailed implementation plan
3. Set up development environment
4. Begin iterative development
5. Establish testing procedures

---

**Last Updated**: 2026-01-28  
**Status**: Awaiting stakeholder input
