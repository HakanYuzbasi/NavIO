# NaviO Frontend - Next.js

Production-ready Progressive Web App (PWA) for NaviO indoor navigation system.

## Tech Stack

- **Framework**: Next.js 14
- **Language**: TypeScript
- **Styling**: CSS-in-JS (styled-jsx)
- **Map Rendering**: SVG with zoom/pan
- **Camera API**: Browser getUserMedia for QR scanning

## Features

- Progressive Web App (PWA) - installable on mobile devices
- Mobile-first responsive design
- QR code scanner using device camera
- Interactive SVG map with zoom and pan
- Real-time route visualization
- Admin panel for venue management
- Fully typed with TypeScript
- No authentication required for visitors

## Installation

```bash
npm install
```

## Configuration

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env`:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Development

Start the development server:

```bash
npm run dev
```

Visit http://localhost:3000

## Production

Build the application:

```bash
npm run build
```

Start the production server:

```bash
npm start
```

## Pages

### Visitor Pages

- **`/`** - Home page with venue selection
- **`/venue/[venueId]`** - Main navigation interface
  - QR code scanner
  - Interactive map
  - Route display
  - Destination search

### Admin Pages

- **`/admin`** - Admin panel
  - Venue management
  - Node creation/editing
  - Edge creation/editing
  - QR code generation

## Components

### InteractiveMap

SVG-based map component with:

- Zoom controls (+, -, reset)
- Pan with mouse/touch drag
- Node visualization (color-coded by type)
- Edge visualization (dashed lines)
- Route highlighting (animated blue path)
- Current location marker (green with pulse)
- Destination marker (red with pulse)

### QRScanner

Camera-based QR code scanner:

- Uses browser getUserMedia API
- Rear camera on mobile devices
- Visual frame indicator
- Error handling for camera permissions
- Note: For full QR scanning, integrate jsQR or similar library

## User Flow

### Visitor Flow

1. Open app → Select venue
2. Scan QR code OR manually select "I am near..."
3. Select destination from list
4. View route on map
5. Follow highlighted path
6. Re-scan QR code to update location

### Admin Flow

1. Open admin panel
2. Create venue
3. Create nodes (locations)
4. Create edges (walkable paths)
5. Generate QR codes
6. Print and place QR codes physically

## PWA Installation

### iOS (Safari)

1. Open app in Safari
2. Tap Share button
3. Tap "Add to Home Screen"
4. Tap "Add"

### Android (Chrome)

1. Open app in Chrome
2. Tap menu (three dots)
3. Tap "Install app" or "Add to Home Screen"

## API Integration

The frontend communicates with the backend API using the `lib/api.ts` client:

```typescript
import { venueApi, nodeApi, edgeApi, routingApi, qrApi } from '../lib/api';

// Example usage
const venues = await venueApi.getAll();
const route = await routingApi.calculateRoute({
  venueId: 'venue-id',
  startNodeId: 'node-1',
  endNodeId: 'node-5',
});
```

## Folder Structure

```
frontend-next/
├── public/
│   ├── manifest.json       # PWA manifest
│   ├── icon-192.png        # App icon 192x192
│   └── icon-512.png        # App icon 512x512
├── src/
│   ├── components/
│   │   ├── InteractiveMap.tsx    # SVG map with zoom/pan
│   │   └── QRScanner.tsx         # Camera QR scanner
│   ├── lib/
│   │   └── api.ts                # API client
│   ├── pages/
│   │   ├── _app.tsx              # App wrapper
│   │   ├── index.tsx             # Home page
│   │   ├── admin.tsx             # Admin panel
│   │   └── venue/
│   │       └── [venueId].tsx     # Navigation page
│   ├── styles/
│   │   └── globals.css           # Global styles
│   └── types/
│       └── index.ts              # TypeScript types
├── next.config.js
├── package.json
└── tsconfig.json
```

## Styling

Uses Next.js built-in `styled-jsx` for component-scoped CSS:

```tsx
<style jsx>{`
  .component {
    color: blue;
  }
`}</style>
```

Benefits:

- No CSS-in-JS library needed
- Scoped styles (no conflicts)
- Full CSS support
- Zero runtime overhead

## Mobile Optimization

- Touch-friendly UI (large buttons)
- Prevents zoom on input focus
- No tap highlight delay
- Responsive breakpoints
- Mobile-first design
- Optimized for portrait orientation

## Browser Support

- Chrome/Edge (recommended)
- Safari (iOS)
- Firefox
- Requires modern browser with:
  - ES2020 support
  - getUserMedia API (for QR scanning)
  - SVG support

## QR Code Format

QR codes should encode URLs in this format:

```
https://your-domain.com/venue/VENUE_ID?node=NODE_ID
```

Example:

```
https://navio.app/venue/abc123?node=entrance-1
```

When scanned, the app automatically sets the current location.

## Environment Variables

- `NEXT_PUBLIC_API_URL` - Backend API URL (required)

Note: Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser.

## Deployment

### Vercel (Recommended)

```bash
npm install -g vercel
vercel
```

### Docker

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
RUN npm ci --only=production
EXPOSE 3000
CMD ["npm", "start"]
```

### Static Export (Optional)

For static hosting:

```bash
npm run build
npm run export
```

Note: Static export doesn't support dynamic API routes.

## Performance

- Server-side rendering (SSR) for initial load
- Client-side navigation (SPA)
- Code splitting per page
- Optimized bundle size
- Lazy loading images
- Service worker caching (PWA)

## Accessibility

- Semantic HTML
- ARIA labels
- Keyboard navigation
- Focus indicators
- Color contrast compliance

## Testing

```bash
# Type checking
npm run type-check

# Linting
npm run lint
```

## License

MIT
