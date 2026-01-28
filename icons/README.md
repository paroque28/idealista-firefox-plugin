# Icons Directory

This directory should contain the extension icons in PNG format.

## Required Icons

- `icon-48.png` - 48x48 pixels (shown in extension manager)
- `icon-96.png` - 96x96 pixels (for high-DPI displays)

## Creating Icons

You can create icons using:
- **Online tools**: [Favicon Generator](https://realfavicongenerator.net/)
- **Design tools**: Figma, Adobe Illustrator, Inkscape
- **From existing images**: Use image editing software to resize

## Icon Design Guidelines

- Use a simple, recognizable design
- Ensure good contrast for visibility
- Test on both light and dark backgrounds
- Use transparent backgrounds (PNG with alpha channel)

## Temporary Placeholder

Until custom icons are created, you can use a simple colored square or text-based icon.

### Quick Icon Creation with ImageMagick

```bash
# Install ImageMagick
# Ubuntu/Debian: sudo apt install imagemagick
# macOS: brew install imagemagick

# Create 48x48 icon
convert -size 48x48 xc:#667eea -gravity center -pointsize 24 -fill white -annotate +0+0 "IH" icon-48.png

# Create 96x96 icon
convert -size 96x96 xc:#667eea -gravity center -pointsize 48 -fill white -annotate +0+0 "IH" icon-96.png
```

Replace the icons in this directory with your custom designs.
