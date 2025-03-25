# Image Overlay System

A web-based application for overlaying and manipulating images with layer management capabilities.

## Features

- **Canvas Management**: Customize canvas dimensions and reset when needed
- **Image Import**: Support for multiple image formats including PNG, JPEG, and SVG (animated SVGs supported)
- **Layer Management**: Reorder, show/hide, and delete layers
- **Image Manipulation**: Move, resize, and rotate images freely on the canvas
- **Export Options**: Export your composition in various formats (PNG, JPEG, SVG, WebP)

## How to Use

1. **Setup Canvas**: Set your desired canvas dimensions using the width and height controls
2. **Import Images**: Click the "Upload Images" button to select and import one or more images
3. **Manipulate Layers**:
   - Move: Click and drag an image to reposition it
   - Resize: Use the mouse wheel to scale the selected layer up or down
   - Rotate: On touch devices, use two fingers to rotate
   - Reorder: Use the up/down arrows in the layers panel to change layer order
4. **Export**: Select your desired format and click the "Export" button to download your composition

## Technical Details

- Built with vanilla JavaScript and HTML5 Canvas
- No external dependencies required
- Responsive design works on both desktop and mobile devices
- SVG animation support for dynamic compositions

## Getting Started

Simply open the `index.html` file in a modern web browser to start using the application.

```
open index.html
```

Or serve it using any local development server of your choice.