# maven

A mobile-first web app for discovering local craftspeople and makers in Ireland.

## Tech Stack

- **Framework:** React 19 + Vite 6
- **Styling:** Inline styles (JavaScript style objects)
- **Fonts:** DM Sans (body), Playfair Display (headings)
- **Backend:** Supabase (auth, database, storage)
- **Maps:** Leaflet
- **Animations:** Framer Motion

## Getting Started

```bash
npm install
npm run dev
```

The dev server starts at `http://localhost:xxxx`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build locally |

## Project Structure

```
src/
├── main.jsx              # Entry point
├── App.jsx               # Root shell: tab routing, maker selection
├── data/                 # Hardcoded data (makers, towns)
├── constants/            # Categories, navigation config
├── utils/                # Time, distance, helpers
├── hooks/                # Custom React hooks
├── contexts/             # Theme context (dark/light mode)
├── components/
│   ├── ui/               # Reusable primitives (Carousel, CategoryPills, Toast, etc.)
│   ├── makers/           # Maker-specific display components
│   └── layout/           # TabBar
└── screens/              # Full-page views (Discover, Map, Saved, Profile)
```

## License

See [LICENSE](LICENSE) for details.
