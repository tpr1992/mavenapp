# Maven iOS — Design Document

## Goal

Native SwiftUI port of the maven web app at `/Users/tpataneronan/Documents/code/mavenappswift`. Same Supabase backend, Apple-native everything else. iOS 17+ target (backport to 16 later).

## Scope — v1

**In scope:** Discover feed + MakerProfile detail screen, tab bar shell with placeholders for Map/Saved/Profile.

**Out of scope (later):** Map screen, Saved screen, Profile screen, Onboarding flow, push notifications, offline caching.

## Architecture — MVVM

```
mavenappswift/
  maven/
    App/              # MavenApp.swift, ContentView, AppState
    Models/           # Maker, ClickStats — Codable structs
    Services/         # SupabaseService, LocationService
    ViewModels/       # DiscoverViewModel, MakerProfileViewModel
    Views/
      Discover/       # DiscoverView, MakerCard, CategoryPills
      MakerProfile/   # MakerProfileView, MakerHero, ImageGallery
      Components/     # MakerAvatar, HeartButton, shared UI
      Placeholders/   # MapPlaceholder, SavedPlaceholder, ProfilePlaceholder
    Utils/            # Scoring, Distance, Interleave
    Theme/            # ThemeManager, tokens
    Extensions/       # View modifiers, Image helpers
  maven.xcodeproj
```

### Pattern
- **Models** — `Codable` structs (Maker, MakerClickStats). Value types, not classes.
- **ViewModels** — `@Observable` classes (iOS 17 Observation framework). Replace React hooks.
- **Views** — Pure SwiftUI. No UIKit bridging unless absolutely necessary.
- **Services** — Supabase Swift SDK, Core Location.

## Swift-Native Advantages Over Web

These are optimizations we get for free or should actively use because we're native now:

### Structured Concurrency
- `async/await` everywhere instead of Promise chains
- `TaskGroup` for parallel fetches (makers + click stats simultaneously)
- Automatic cancellation — navigating away cancels in-flight requests

### Native Image Pipeline
- `AsyncImage` with Supabase transform URLs
- System URL cache handles image caching automatically — no manual cache management
- `.prefetch()` pattern: fire image requests on maker tap before pushing the detail view

### Scroll Performance
- `LazyVStack` / `LazyVGrid` — only renders visible cells, automatic recycling
- No virtual DOM diffing overhead
- Native momentum scrolling and rubber-banding

### Haptic Feedback
- `UIImpactFeedbackGenerator` on tab switches, saves, and card taps
- `.sensoryFeedback()` modifier in iOS 17

### SF Symbols
- System icons (heart, map, person, magnifyingglass) — vector, theme-adaptive, weight-matched to text
- No SVG paths to maintain

### Pull to Refresh
- Native `.refreshable {}` modifier — standard iOS UX with no custom implementation

### Materials
- `.ultraThinMaterial` / `.regularMaterial` — GPU-composited frosted glass, zero custom blur code

### Animations
- `.spring()`, `.easeInOut` built into every animatable property
- `withAnimation {}` wraps state changes — the framework handles the rest
- `matchedGeometryEffect` for shared element transitions (maker card → hero image)
- Phase animations for staggered entrance effects

## Data Layer

### Supabase Swift SDK
- Same project URL, same anon key
- Same queries: `from("makers").select(...)`, `rpc("get_maker_click_stats")`
- Same `rpc("record_maker_click")` fire-and-forget for click tracking
- Auth via Supabase Swift SDK (Apple Sign-In later)

### Data Flow
```
MavenApp
  └── AppState (@Observable)
        ├── makers: [Maker]
        ├── clickStats: [String: MakerClickStats]
        ├── userLocation: CLLocationCoordinate2D?
        ├── scoredMakers: [ScoredMaker]  (computed)
        └── isLoading: Bool

  └── ThemeManager (@Observable)
        ├── colorScheme: ColorScheme (system/override)
        └── tokens: bg, text, surface, etc.
```

- `AppState` fetches on app launch via `task {}` modifier
- GPS decoupled: fetch makers immediately, re-score when location arrives
- Scoring algorithm identical to web: composite score with proximity/momentum/freshness/popularity weights
- `interleavedByCategory()` prevents same-category streaks — same logic, ported to Swift

### Location
- `CLLocationManager` wrapped in a `LocationService` actor
- Request permission on first Map tab open or explicit prompt
- Falls back gracefully — scoring works without location (web app already handles this)

## Navigation

- `TabView` with system tab bar — Discover, Map, Saved, Profile
- `NavigationStack` per tab
- Discover → tap card → push `MakerProfileView`
- Deep links via `.onOpenURL` (later)

## Theme

- `ThemeManager` as `@Observable`
- Follows system `colorScheme` by default
- User override stored in `UserDefaults` (mapped to `@AppStorage`)
- Dark mode is default (matches web app)
- Custom fonts: Playfair Display (headings), DM Sans (body) — bundled in app

### Tokens (matching web)
```swift
struct ThemeTokens {
    let bg: Color
    let text: Color
    let textSecondary: Color
    let textMuted: Color
    let surface: Color
    let border: Color
    let btnBg: Color
    let btnText: Color
    let heart: Color  // #fc8181
}
```

## Screens — v1 Detail

### DiscoverView
- Sticky search bar at top (`.searchable()` modifier or custom)
- Category pills — horizontal `ScrollView` with pill buttons
- Feed — `LazyVStack` of `MakerCard` views
- Pull-to-refresh via `.refreshable {}`
- Same scoring/ranking as web

### MakerCard
- Hero image with gradient scrim
- Maker name, category, location
- Heart button (SF Symbol)
- Tap → push to MakerProfileView

### MakerProfileView
- Hero image (gallery carousel with `TabView` + `.page` style)
- Back button, share button, heart button in navigation bar
- Maker info: name, bio, category, location, years active
- Opening hours
- Website + Instagram links (via `Link` / `openURL`)
- "Nearby makers" horizontal scroll at bottom

## Dependencies

- `supabase-swift` — Supabase official Swift SDK
- No other external dependencies. Everything else is native.
