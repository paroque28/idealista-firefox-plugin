# Development Environment Setup

Complete guide to setting up a professional development environment for the Idealista Helper Firefox extension with quick build and test workflows.

## 🎯 Goals

- Quick iteration: Make changes and see results in seconds
- Automated testing: Run tests before committing
- Code quality: Linting and formatting
- Hot reload: Auto-reload extension on file changes
- Easy debugging: Source maps and dev tools

## 📋 Prerequisites

### Required Software

1. **Node.js** (v16 or higher)
   ```bash
   # Check version
   node --version  # Should be v16.0.0 or higher
   
   # Install from: https://nodejs.org/
   # Or use nvm (recommended):
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   nvm install 18
   nvm use 18
   ```

2. **npm** (comes with Node.js)
   ```bash
   npm --version  # Should be 8.0.0 or higher
   ```

3. **Firefox Developer Edition** (recommended) or regular Firefox
   ```bash
   # Download from: https://www.mozilla.org/firefox/developer/
   # Or use package manager:
   
   # Ubuntu/Debian
   sudo apt install firefox
   
   # macOS
   brew install firefox
   
   # Windows: Download installer
   ```

4. **Git**
   ```bash
   git --version
   
   # Install if needed:
   # Ubuntu/Debian: sudo apt install git
   # macOS: brew install git
   # Windows: https://git-scm.com/download/win
   ```

---

## 🚀 Quick Setup

### 1. Clone and Install

```bash
# Clone repository
git clone https://github.com/paroque28/idealista-firefox-plugin.git
cd idealista-firefox-plugin

# Install dependencies
npm install
```

### 2. Create package.json

```bash
# Initialize npm project
npm init -y
```

This creates a basic `package.json`. We'll customize it next.

---

## 📦 Package Configuration

### Create/Update package.json

```json
{
  "name": "idealista-helper",
  "version": "1.0.0",
  "description": "Firefox extension to enhance Idealista.com property search",
  "main": "background.js",
  "scripts": {
    "start": "web-ext run --source-dir . --verbose",
    "dev": "web-ext run --source-dir . --start-url https://www.idealista.com/ --verbose",
    "watch": "npm-watch",
    "build": "npm run lint && npm run test",
    "build:prod": "web-ext build --source-dir . --artifacts-dir dist --overwrite-dest",
    "lint": "web-ext lint --source-dir . && eslint .",
    "lint:fix": "eslint . --fix",
    "test": "echo 'No tests yet' && exit 0",
    "test:watch": "npm run test -- --watch",
    "clean": "rm -rf dist/ web-ext-artifacts/",
    "package": "npm run build:prod"
  },
  "watch": {
    "build": {
      "patterns": ["*.js", "*.css", "*.html"],
      "extensions": "js,css,html",
      "quiet": false
    }
  },
  "devDependencies": {
    "eslint": "^8.50.0",
    "eslint-config-standard": "^17.1.0",
    "eslint-plugin-import": "^2.28.1",
    "eslint-plugin-n": "^16.1.0",
    "eslint-plugin-promise": "^6.1.1",
    "npm-watch": "^0.11.0",
    "web-ext": "^7.8.0"
  },
  "keywords": [
    "firefox",
    "extension",
    "idealista",
    "real-estate"
  ],
  "author": "paroque28",
  "license": "MIT"
}
```

### Install Development Dependencies

```bash
# Install all dev dependencies
npm install --save-dev web-ext eslint eslint-config-standard eslint-plugin-import eslint-plugin-n eslint-plugin-promise npm-watch

# Or install individually:
npm install --save-dev web-ext         # For running and packaging
npm install --save-dev eslint          # For code linting
npm install --save-dev npm-watch       # For file watching
```

---

## 🔧 Configuration Files

### 1. ESLint Configuration (.eslintrc.json)

```json
{
  "env": {
    "browser": true,
    "es2021": true,
    "webextensions": true
  },
  "extends": "standard",
  "parserOptions": {
    "ecmaVersion": 2022,
    "sourceType": "module"
  },
  "rules": {
    "no-console": "off",
    "semi": ["error", "always"],
    "quotes": ["error", "single"],
    "indent": ["error", 2],
    "space-before-function-paren": ["error", {
      "anonymous": "always",
      "named": "never",
      "asyncArrow": "always"
    }]
  },
  "globals": {
    "browser": "readonly"
  }
}
```

### 2. ESLint Ignore (.eslintignore)

```
node_modules/
dist/
web-ext-artifacts/
*.min.js
```

### 3. Git Ignore (.gitignore)

```
# Dependencies
node_modules/

# Build outputs
dist/
web-ext-artifacts/
*.zip

# Development
.web-ext-config.js
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# Logs
*.log
npm-debug.log*

# Environment
.env
.env.local

# Temporary files
tmp/
temp/
```

### 4. web-ext Configuration (.web-ext-config.js)

```javascript
module.exports = {
  // Global options:
  verbose: true,
  
  // Command options:
  build: {
    overwriteDest: true
  },
  
  run: {
    firefox: 'firefoxdeveloperedition',
    startUrl: [
      'https://www.idealista.com/',
      'about:debugging#/runtime/this-firefox'
    ],
    browserConsole: true,
    // Watch for changes and auto-reload
    watchFile: ['*.js', '*.css', '*.html', '*.json'],
    // Custom Firefox profile for development
    firefoxProfile: './firefox-profile-dev',
    keepProfileChanges: true,
    profileCreateIfMissing: true
  },
  
  lint: {
    selfHosted: true
  }
};
```

---

## 🎨 Project Structure

```
idealista-firefox-plugin/
├── manifest.json              # Extension manifest
├── package.json               # npm configuration
├── .eslintrc.json            # ESLint config
├── .eslintignore             # ESLint ignore
├── .gitignore                # Git ignore
├── .web-ext-config.js        # web-ext config
├── README.md                 # Main documentation
├── QUICKSTART.md             # Quick start guide
├── DATA_STORAGE.md           # Storage guide
├── INFORMATION_NEEDED.md     # Requirements doc
├── FEATURE_IDEAS.md          # Feature suggestions
│
├── icons/                    # Extension icons
│   ├── icon-48.png
│   └── icon-96.png
│
├── lib/                      # Utility libraries
│   ├── storage.js           # Storage manager
│   ├── scraper.js           # Data scraping
│   ├── ai-integration.js    # AI API calls
│   └── utils.js             # Helper functions
│
├── content.js                # Content script (injected)
├── content.css               # Content styles
├── background.js             # Background script
├── popup.html                # Popup UI
├── popup.js                  # Popup logic
├── popup.css                 # Popup styles
│
├── test/                     # Tests (future)
│   └── test-storage.js
│
└── docs/                     # Additional docs
    ├── ARCHITECTURE.md
    └── API.md
```

---

## 🏃 Development Workflows

### Workflow 1: Quick Development (Auto-reload)

```bash
# Start development server with auto-reload
npm run dev

# This will:
# - Open Firefox with the extension loaded
# - Open Idealista.com automatically
# - Watch for file changes
# - Auto-reload extension on changes
# - Show browser console
```

### Workflow 2: Manual Testing

```bash
# 1. Load extension manually
# Open Firefox: about:debugging#/runtime/this-firefox
# Click "Load Temporary Add-on"
# Select manifest.json

# 2. Make changes to code

# 3. Reload extension
# In about:debugging, click "Reload" button

# 4. Refresh Idealista page
```

### Workflow 3: Build and Package

```bash
# Lint code
npm run lint

# Fix linting issues automatically
npm run lint:fix

# Build for production
npm run build:prod

# This creates: web-ext-artifacts/idealista_helper-1.0.0.zip
```

### Workflow 4: Watch Mode (Advanced)

```bash
# Terminal 1: Watch for changes
npm run watch

# Terminal 2: Run extension
npm run dev

# Now any changes to .js, .css, or .html files trigger rebuild
```

---

## 🔍 Debugging

### 1. Content Script Debugging

```javascript
// content.js

// Add debug flag
const DEBUG = true;

function debug(...args) {
  if (DEBUG) {
    console.log('[Idealista Helper]', ...args);
  }
}

// Use throughout code
debug('Content script loaded');
debug('Found properties:', propertyCount);
```

**View logs**:
1. Open Idealista page
2. Press F12 (open DevTools)
3. Go to Console tab
4. Filter by "Idealista Helper"

### 2. Background Script Debugging

```javascript
// background.js

console.log('Background script started');

browser.runtime.onMessage.addListener((message) => {
  console.log('Received message:', message);
});
```

**View logs**:
1. Go to `about:debugging#/runtime/this-firefox`
2. Find "Idealista Helper"
3. Click "Inspect" button
4. Console shows background script logs

### 3. Popup Debugging

**View logs**:
1. Click extension icon to open popup
2. Right-click inside popup
3. Select "Inspect Element"
4. Console shows popup script logs

### 4. Using Debugger

```javascript
// Set breakpoint in code
function processProperty(data) {
  debugger; // Execution pauses here
  
  const price = data.price;
  // ... more code
}
```

---

## 🧪 Testing Strategy

### Manual Testing Checklist

Create `test-checklist.md`:

```markdown
# Manual Test Checklist

## Before Each Commit
- [ ] Extension loads without errors
- [ ] No console errors on Idealista.com
- [ ] Content script injects successfully
- [ ] Popup opens and displays correctly
- [ ] Settings save and persist

## Content Script Tests
- [ ] Detects property listings on search page
- [ ] Extracts property data correctly
- [ ] Marks viewed listings
- [ ] Shows red flags on suspicious listings
- [ ] Energy rating filter works

## Storage Tests
- [ ] Viewed listings are saved
- [ ] Price history is tracked
- [ ] Preferences persist after restart
- [ ] Data export works
- [ ] Data import works

## Performance Tests
- [ ] Page load time < 2s
- [ ] Extension adds < 100ms overhead
- [ ] Memory usage < 50MB
- [ ] No memory leaks after 1 hour

## Browser Tests
- [ ] Works on Firefox 78+
- [ ] Works on Firefox Developer Edition
- [ ] Works on Firefox Nightly
```

### Automated Testing (Future)

```javascript
// test/test-storage.js

const assert = require('assert');
const { storage } = require('../lib/storage.js');

describe('Storage Manager', () => {
  
  beforeEach(async () => {
    await storage.clear();
  });
  
  it('should add viewed listing', async () => {
    const listing = {
      id: '12345',
      title: 'Test Property',
      price: 1000
    };
    
    await storage.addViewedListing(listing);
    const retrieved = await storage.getViewedListing('12345');
    
    assert.equal(retrieved.id, '12345');
    assert.equal(retrieved.price, 1000);
  });
  
  it('should track price changes', async () => {
    await storage.trackPriceChange('12345', 1000);
    await storage.trackPriceChange('12345', 950);
    
    const history = await storage.getPriceHistory('12345');
    
    assert.equal(history.length, 2);
    assert.equal(history[1].price, 950);
  });
});
```

---

## 🎯 Quick Commands Reference

```bash
# ===== Setup =====
npm install                    # Install dependencies
npm run clean                  # Clean build artifacts

# ===== Development =====
npm run dev                    # Start with auto-reload
npm start                      # Start basic (no auto-reload)
npm run watch                  # Watch files for changes

# ===== Code Quality =====
npm run lint                   # Check code style
npm run lint:fix              # Fix code style issues

# ===== Building =====
npm run build                  # Build and run tests
npm run build:prod            # Build for production
npm run package               # Create .zip for distribution

# ===== Testing =====
npm test                       # Run tests (when implemented)
npm run test:watch            # Run tests in watch mode
```

---

## 🔥 Hot Reload Setup (Advanced)

For fastest development, use `web-ext` with watch mode:

```bash
# Install globally (optional)
npm install -g web-ext

# Run with auto-reload
web-ext run \
  --source-dir . \
  --start-url https://www.idealista.com/ \
  --browser-console \
  --verbose

# This will reload the extension automatically when you save files
```

---

## 💡 Tips & Tricks

### 1. Use a Separate Firefox Profile

```bash
# Create development profile
web-ext run --firefox-profile=./dev-profile --keep-profile-changes

# This keeps your dev data separate from personal browsing
```

### 2. Enable Detailed Logging

```javascript
// Add to manifest.json for more verbose logs
"browser_specific_settings": {
  "gecko": {
    "id": "idealista-helper@example.com"
  }
}
```

### 3. Quick Reload Shortcut

Add keyboard shortcut in Firefox:
1. Go to `about:debugging`
2. Use Alt+R to quickly reload extension

### 4. Use Browser Console for Quick Tests

```javascript
// Type in browser console (Ctrl+Shift+J):
browser.runtime.sendMessage({ action: 'test' });

// Or access content script from console on Idealista page
```

### 5. Monitor Performance

```javascript
// Add to content.js
performance.mark('start');
// ... your code ...
performance.mark('end');
performance.measure('my-code', 'start', 'end');
console.log(performance.getEntriesByName('my-code')[0].duration);
```

---

## 🐛 Common Issues & Solutions

### Issue: "Could not load manifest"
**Solution**: Check manifest.json syntax (use JSON validator)

### Issue: Extension not reloading
**Solution**: Use `web-ext run` instead of manual loading

### Issue: Changes not reflected
**Solution**: Hard reload: Ctrl+Shift+R on Idealista page

### Issue: "Module not found" errors
**Solution**: Run `npm install` again

### Issue: Storage not persisting
**Solution**: Check browser.storage permissions in manifest.json

---

## 📚 Resources

### Development Tools
- [web-ext documentation](https://extensionworkshop.com/documentation/develop/getting-started-with-web-ext/)
- [Firefox Extension Workshop](https://extensionworkshop.com/)
- [MDN WebExtensions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)

### Debugging
- [Debugging extensions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Debugging)
- [Browser console](https://developer.mozilla.org/en-US/docs/Tools/Browser_Console)

### Best Practices
- [Extension best practices](https://extensionworkshop.com/documentation/develop/best-practices-for-developing-extensions/)
- [Performance tips](https://extensionworkshop.com/documentation/develop/performance-best-practices/)

---

## ✅ Verification Checklist

Before starting development, verify:

- [ ] Node.js v16+ installed
- [ ] npm working
- [ ] Firefox installed
- [ ] Repository cloned
- [ ] `npm install` completed successfully
- [ ] `npm run dev` starts Firefox with extension
- [ ] Extension appears in about:debugging
- [ ] No console errors
- [ ] Can make changes and reload

---

**You're all set! Start coding! 🚀**

Last Updated: 2026-01-28
