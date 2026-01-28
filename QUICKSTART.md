# Quick Start Guide

Get the Idealista Helper plugin running in under 5 minutes!

## 🚀 Installation & Testing

### Method 1: Load Temporary Extension (No Build Required)

This is the fastest way to try the plugin.

#### Step 1: Clone the Repository
```bash
git clone https://github.com/paroque28/idealista-firefox-plugin.git
cd idealista-firefox-plugin
```

#### Step 2: Open Firefox Developer Mode
1. Open Firefox browser
2. Type `about:debugging` in the address bar and press Enter
3. Click on "This Firefox" in the left sidebar

#### Step 3: Load the Extension
1. Click the "Load Temporary Add-on..." button
2. Navigate to the cloned repository folder
3. Select the `manifest.json` file
4. Click "Open"

✅ **The extension is now loaded!** You should see "Idealista Helper" in the list of temporary extensions.

#### Step 4: Test on Idealista
1. Navigate to [Idealista.com](https://www.idealista.com/)
2. Go to any search page, for example:
   ```
   https://www.idealista.com/multi/alquiler-viviendas/dSA,dSD,dSE,dTm,dTn,dao/con-precio-hasta_1800/
   ```
3. Open the browser console (F12) to see the plugin logs
4. Click the extension icon in the toolbar to open the popup

#### Step 5: Verify It's Working
- Open the browser console (press F12)
- Look for messages like: "Idealista Helper: Content script loaded"
- Check the extension popup by clicking the icon in the toolbar

---

### Method 2: With Build Tools (For Development)

If you plan to develop and modify the extension, use this method.

#### Step 1: Prerequisites
Make sure you have installed:
- Node.js (v14 or higher) - [Download here](https://nodejs.org/)
- npm (comes with Node.js)
- Firefox browser

Check your installation:
```bash
node --version  # Should show v14.0.0 or higher
npm --version   # Should show 6.0.0 or higher
```

#### Step 2: Clone and Install Dependencies
```bash
git clone https://github.com/paroque28/idealista-firefox-plugin.git
cd idealista-firefox-plugin
npm install
```

#### Step 3: Build the Extension
```bash
# For development (with source maps)
npm run build

# For production (minified)
npm run build:prod
```

#### Step 4: Load Built Extension
1. Open Firefox: `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on..."
3. Select `manifest.json` from the `dist/` folder (if using build) or root folder
4. Test on Idealista.com

#### Step 5: Enable Hot Reload (Optional)
```bash
# Watch for changes and auto-reload
npm run watch
```

This will:
- Watch for file changes
- Automatically rebuild
- Reload the extension in Firefox (with web-ext)

---

## 🧪 Testing the Plugin Features

### 1. Test Content Script Injection
1. Open: https://www.idealista.com/
2. Open browser console (F12)
3. Look for: `"Idealista Helper: Content script loaded"`

### 2. Test on Search Results
1. Go to a search page with properties
2. Check if any UI elements are injected
3. Verify console logs show property detection

### 3. Test Extension Popup
1. Click the extension icon in Firefox toolbar
2. The popup should open
3. Verify settings are visible

### 4. Test Storage
1. Open popup
2. Change a setting
3. Reload the page
4. Verify setting persisted

---

## 🐛 Troubleshooting

### Extension Not Loading
**Problem**: "Could not load manifest"
- **Solution**: Make sure you selected the `manifest.json` file, not a folder
- **Check**: Verify manifest.json is valid JSON (no syntax errors)

### No Icon in Toolbar
**Problem**: Can't see the extension icon
- **Solution**: Check `about:addons` to verify the extension is enabled
- **Alternative**: Pin the extension to toolbar (right-click toolbar → Customize)

### Content Script Not Running
**Problem**: No console logs on Idealista
- **Solution**: Reload the Idealista page after loading the extension
- **Check**: Verify the URL matches the pattern in manifest.json
- **Debug**: Check `about:debugging` for any error messages

### Changes Not Reflecting
**Problem**: Modified code but no changes
- **Solution**: Click "Reload" button in `about:debugging` for the extension
- **Alternative**: Remove and re-load the extension

### Console Errors
**Problem**: Red errors in console
- **Check**: Browser console (F12) for detailed error messages
- **Check**: Extension console in `about:debugging` (click "Inspect")
- **Solution**: See common errors below

#### Common Errors:
1. **"Content Security Policy violation"**
   - Fix: Check CSP settings in manifest.json
   
2. **"Module not found"**
   - Fix: Run `npm install` again
   
3. **"Permission denied"**
   - Fix: Check permissions in manifest.json

---

## 🔍 Inspecting the Extension

### View Extension Console
1. Go to `about:debugging#/runtime/this-firefox`
2. Find "Idealista Helper"
3. Click "Inspect" button
4. This opens DevTools for the extension background page

### View Content Script Console
1. Open any Idealista page
2. Press F12 to open browser console
3. Content script logs appear here

### View Popup Console
1. Click the extension icon to open popup
2. Right-click inside the popup
3. Select "Inspect Element"
4. This opens DevTools for the popup

---

## ⚡ Quick Commands Reference

```bash
# Install dependencies
npm install

# Development build
npm run build

# Production build
npm run build:prod

# Watch mode (auto-rebuild on changes)
npm run watch

# Run with web-ext (auto-reload)
npm run dev

# Lint code
npm run lint

# Run tests
npm test

# Package for distribution
npm run package
```

---

## 📱 Testing on Real Searches

### Example Test URLs

1. **Basic rental search in Madrid**:
   ```
   https://www.idealista.com/alquiler-viviendas/madrid/
   ```

2. **Filtered search** (price, balcony, AC, recent listings):
   ```
   https://www.idealista.com/multi/alquiler-viviendas/dSA,dSD,dSE,dTm,dTn,dao/con-precio-hasta_1800,balcon-y-terraza,aireacondicionado,publicado_ultimas-24-horas/
   ```

3. **Search in Barcelona**:
   ```
   https://www.idealista.com/alquiler-viviendas/barcelona/
   ```

4. **Specific property page** (for testing single property features):
   ```
   https://www.idealista.com/inmueble/[property-id]/
   ```

### What to Test:
- [ ] Extension loads without errors
- [ ] Content script runs on search pages
- [ ] Console shows property detection logs
- [ ] Popup opens and displays settings
- [ ] No JavaScript errors in console
- [ ] Page performance is not degraded

---

## 📊 Performance Testing

### Check Extension Impact
1. Open Firefox Performance Tools: `Shift + F5`
2. Start recording
3. Navigate to Idealista search page
4. Stop recording
5. Check if extension adds significant overhead

### Expected Performance:
- Page load time increase: < 100ms
- Memory usage: < 10MB
- No blocking of main thread

---

## 🎯 Next Steps

Once the plugin is loaded and working:

1. **Explore the code**:
   - Check `content.js` to see page interaction logic
   - Review `background.js` for extension logic
   - Modify `popup.html` for UI changes

2. **Make changes**:
   - Edit any file
   - Click "Reload" in `about:debugging`
   - Refresh Idealista page to see changes

3. **Add features**:
   - See [FEATURE_IDEAS.md](FEATURE_IDEAS.md) for inspiration
   - Check [INFORMATION_NEEDED.md](INFORMATION_NEEDED.md) for requirements

4. **Report issues**:
   - Open GitHub issue with:
     - What you tried
     - What happened
     - Console error messages
     - Firefox version

---

## 📚 Learning Resources

### New to Firefox Extensions?
- [MDN: Your first extension](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Your_first_WebExtension)
- [Extension Workshop](https://extensionworkshop.com/)
- [WebExtensions Examples](https://github.com/mdn/webextensions-examples)

### JavaScript Resources
- [MDN JavaScript Guide](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide)
- [JavaScript.info](https://javascript.info/)

### Web Scraping
- [Content Scripts Guide](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Content_scripts)
- [DOM Manipulation](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model)

---

## ✅ Success Checklist

Before reporting success, verify:
- [ ] Extension appears in `about:debugging`
- [ ] Icon appears in toolbar
- [ ] Popup opens when clicking icon
- [ ] Console shows "Content script loaded" on Idealista
- [ ] No red errors in console
- [ ] Can reload extension without errors

---

## 🆘 Getting Help

If you're stuck:

1. **Check the console**: Most issues show error messages
2. **Review this guide**: Ensure all steps were followed
3. **Check GitHub Issues**: Someone may have had the same problem
4. **Ask for help**: Open a GitHub issue with details

---

**Happy Testing! 🎉**

Last Updated: 2026-01-28
