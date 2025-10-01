# LinkWed · Digital Wedding Invitation

LinkWed is a modern, highly visual wedding invitation experience. It blends personalised photography, an interactive map, and ambient music to help couples share their celebration in a single shareable web link.

## Highlights
- 🌸 **Editorial invitation canvas** — live preview while editing names, timings, story, and RSVP message.
- 📸 **Photo storytelling** — upload a hero portrait plus up to six gallery memories; instant previews with graceful fallbacks.
- 📍 **Interactive venue map** — search any location via OpenStreetMap (Nominatim) and drop a marker with live address sync.
- 🎼 **Atmospheric soundtrack** — built-in ambient loop with the option to upload custom audio and control playback volume.
- ⚙️ **One-click deployment** — `deploy.sh` auto-detects Docker for production builds, with a local preview fallback.

## Tech Stack
- [Vite](https://vitejs.dev/) + React 19 + TypeScript
- Tailwind CSS with custom blush & sage palette
- Framer Motion for micro-interactions
- React Leaflet + OpenStreetMap tiles for mapping
- React Dropzone for fluid uploads

## Research Notes
A quick survey of leading digital invitation platforms (Minted, Zola, Joy) and 2025 design showcases guided the direction:
- Soft blush & sage palettes and serif/sans typography pairings remain dominant in luxury wedding trends.
- Hero imagery with subtle overlays keeps focus on the couple while maintaining readability.
- Interactive maps and ambient audio are frequently requested extras for destination weddings.
These observations informed the final gradients, typography choices (`Playfair Display` + `Manrope`), and the modular layout with hero, schedule, and memory gallery sections.

## Requirements
- Node.js ≥ 20.19 (for Vite 7) and npm ≥ 10
- Optional: Docker (for containerised deployment)

## Getting Started
```bash
npm install
npm run dev
```
Then open `http://localhost:5173`.

### Available Scripts
- `npm run dev` — start the Vite dev server
- `npm run build` — type-check and create a production bundle in `dist`
- `npm run preview` — serve the production bundle locally

## Deployment
After cloning the repository:
```bash
./deploy.sh
```
The script will:
1. Use Docker to build & run an Nginx container serving the optimised bundle (port defaults to `4173`).
2. Fall back to installing dependencies locally and running `vite preview` if Docker is unavailable.

Override the exposed port with `PORT=8080 ./deploy.sh`.

## Feature Guide
- **Photos** — drop a hero image (recommended 1800×1200) and up to six gallery shots. Hover to remove gallery items.
- **Location** — search within the editor (OpenStreetMap). Selecting a result updates both the map marker and the invitation’s venue details.
- **Music** — a curated ambient loop ships in `public/media/background.wav`. Upload any `audio/*` file to replace it and control playback/volume from the panel.

## Notes
- The app calls the public Nominatim API for geocoding; heavy production traffic should proxy or cache requests per usage policy.
- The production Docker image is built via a multi-stage Node → Nginx pipeline for minimal footprint.

Enjoy crafting a beautiful wedding invite! 💍
