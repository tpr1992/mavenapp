# Maven iOS Swift Port — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Port the maven web app's core screens (Discover + MakerProfile) to a native SwiftUI iOS app using the same Supabase backend.

**Architecture:** MVVM with @Observable (iOS 17), Supabase Swift SDK, Apple MapKit (later). AppState holds all shared state, injected via .environment(). Pure Swift utils ported from TypeScript.

**Tech Stack:** SwiftUI, iOS 17+, Supabase Swift SDK, MapKit (later), XCTest for logic validation

---

### Task 1: Xcode Project Scaffold

**Files:**
- Create: `/Users/tpataneronan/Documents/code/mavenappswift/` (entire project via `xcodebuild`)

**Step 1: Create the Xcode project directory structure**

```bash
mkdir -p /Users/tpataneronan/Documents/code/mavenappswift
cd /Users/tpataneronan/Documents/code/mavenappswift
```

Use Xcode command line or manual creation to set up a SwiftUI app project named "maven" with:
- Bundle ID: `com.maven.app`
- Deployment target: iOS 17.0
- Swift Package dependency: `https://github.com/supabase/supabase-swift` (latest stable)

**Step 2: Create directory structure**

```bash
cd /Users/tpataneronan/Documents/code/mavenappswift/maven
mkdir -p App Models Services ViewModels Views/Discover Views/MakerProfile Views/Components Views/Placeholders Utils Theme Extensions Resources
```

**Step 3: Add custom fonts**

Download DM Sans (500, 600, 700) and Playfair Display (600, 700) `.ttf` files into `Resources/Fonts/`. Register them in `Info.plist` under `UIAppFonts`.

**Step 4: Initialize git**

```bash
cd /Users/tpataneronan/Documents/code/mavenappswift
git init
git add .
git commit -m "scaffold: Xcode project with Supabase Swift SDK"
```

**Step 5: Build to verify**

Run: `xcodebuild -project maven.xcodeproj -scheme maven -destination 'platform=iOS Simulator,name=iPhone 16' build`
Expected: BUILD SUCCEEDED

---

### Task 2: Models

**Files:**
- Create: `maven/Models/Maker.swift`
- Create: `maven/Models/MakerClickStats.swift`
- Create: `maven/Models/OpeningHours.swift`

**Step 1: Write Maker model**

Port from TypeScript `Maker` interface. Use `Codable` + `Identifiable`. Use `snake_case` CodingKeys to match Supabase JSON.

```swift
// maven/Models/Maker.swift
import Foundation

struct MakerEvent: Codable, Hashable {
    let name: String
    let date: String
    let time: String
    let location: String?
    let details: String?
    let tag: String?
    let cta: String?
    let url: String?
}

struct Maker: Codable, Identifiable, Hashable {
    let id: String
    let slug: String
    let name: String
    let bio: String
    let category: String
    let city: String
    let county: String
    let address: String
    let lat: Double
    let lng: Double
    let country: String
    let yearsActive: Int
    let avatarUrl: String?
    let galleryUrls: [String]
    let heroColor: String
    let isVerified: Bool
    let isFeatured: Bool
    let isSpotlight: Bool?
    let spotlightQuote: String?
    let websiteUrl: String?
    let instagramHandle: String?
    let openingHours: [String: String]?
    let madeInIreland: Bool
    let events: [MakerEvent]?
    let createdAt: String?

    // Computed scoring fields (not from API)
    var distance: Double?
    var score: Double?
    var engagementScore: Double?
    var currentWeekClicks: Int?
    var previousWeekClicks: Int?
    var rank: Int?

    enum CodingKeys: String, CodingKey {
        case id, slug, name, bio, category, city, county, address, lat, lng, country, events
        case yearsActive = "years_active"
        case avatarUrl = "avatar_url"
        case galleryUrls = "gallery_urls"
        case heroColor = "hero_color"
        case isVerified = "is_verified"
        case isFeatured = "is_featured"
        case isSpotlight = "is_spotlight"
        case spotlightQuote = "spotlight_quote"
        case websiteUrl = "website_url"
        case instagramHandle = "instagram_handle"
        case openingHours = "opening_hours"
        case madeInIreland = "made_in_ireland"
        case createdAt = "created_at"
    }

    // Non-API fields excluded from decoding
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        slug = try c.decode(String.self, forKey: .slug)
        name = try c.decode(String.self, forKey: .name)
        bio = try c.decode(String.self, forKey: .bio)
        category = try c.decode(String.self, forKey: .category)
        city = try c.decode(String.self, forKey: .city)
        county = try c.decode(String.self, forKey: .county)
        address = try c.decode(String.self, forKey: .address)
        lat = try c.decode(Double.self, forKey: .lat)
        lng = try c.decode(Double.self, forKey: .lng)
        country = try c.decode(String.self, forKey: .country)
        yearsActive = try c.decodeIfPresent(Int.self, forKey: .yearsActive) ?? 0
        avatarUrl = try c.decodeIfPresent(String.self, forKey: .avatarUrl)
        galleryUrls = try c.decodeIfPresent([String].self, forKey: .galleryUrls) ?? []
        heroColor = try c.decodeIfPresent(String.self, forKey: .heroColor) ?? "#333"
        isVerified = try c.decodeIfPresent(Bool.self, forKey: .isVerified) ?? false
        isFeatured = try c.decodeIfPresent(Bool.self, forKey: .isFeatured) ?? false
        isSpotlight = try c.decodeIfPresent(Bool.self, forKey: .isSpotlight)
        spotlightQuote = try c.decodeIfPresent(String.self, forKey: .spotlightQuote)
        websiteUrl = try c.decodeIfPresent(String.self, forKey: .websiteUrl)
        instagramHandle = try c.decodeIfPresent(String.self, forKey: .instagramHandle)
        openingHours = try c.decodeIfPresent([String: String].self, forKey: .openingHours)
        madeInIreland = try c.decodeIfPresent(Bool.self, forKey: .madeInIreland) ?? false
        events = try c.decodeIfPresent([MakerEvent].self, forKey: .events)
        createdAt = try c.decodeIfPresent(String.self, forKey: .createdAt)
        // Computed fields default to nil
        distance = nil; score = nil; engagementScore = nil
        currentWeekClicks = nil; previousWeekClicks = nil; rank = nil
    }
}
```

**Step 2: Write MakerClickStats**

```swift
// maven/Models/MakerClickStats.swift
import Foundation

struct MakerClickStats: Codable {
    let makerId: String
    let currentWeekClicks: Int
    let previousWeekClicks: Int
    let engagementScore: Double

    enum CodingKeys: String, CodingKey {
        case makerId = "maker_id"
        case currentWeekClicks = "current_week_clicks"
        case previousWeekClicks = "previous_week_clicks"
        case engagementScore = "engagement_score"
    }

    // Supabase returns these as strings from RPCs
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        makerId = try c.decode(String.self, forKey: .makerId)
        if let intVal = try? c.decode(Int.self, forKey: .currentWeekClicks) {
            currentWeekClicks = intVal
        } else {
            let str = try c.decode(String.self, forKey: .currentWeekClicks)
            currentWeekClicks = Int(str) ?? 0
        }
        if let intVal = try? c.decode(Int.self, forKey: .previousWeekClicks) {
            previousWeekClicks = intVal
        } else {
            let str = try c.decode(String.self, forKey: .previousWeekClicks)
            previousWeekClicks = Int(str) ?? 0
        }
        if let dblVal = try? c.decode(Double.self, forKey: .engagementScore) {
            engagementScore = dblVal
        } else {
            let str = try c.decode(String.self, forKey: .engagementScore)
            engagementScore = Double(str) ?? 0
        }
    }
}
```

**Step 3: Build to verify**

Run: `xcodebuild build` — Expected: BUILD SUCCEEDED

**Step 4: Commit**

```bash
git add . && git commit -m "feat: Maker and MakerClickStats models"
```

---

### Task 3: Utils — Scoring, Distance, Interleave, Time, Image

**Files:**
- Create: `maven/Utils/Scoring.swift`
- Create: `maven/Utils/Distance.swift`
- Create: `maven/Utils/Interleave.swift`
- Create: `maven/Utils/TimeUtils.swift`
- Create: `maven/Utils/ImageUtils.swift`
- Create: `mavenTests/ScoringTests.swift`
- Create: `mavenTests/DistanceTests.swift`

**Step 1: Port scoring algorithm**

Direct port from `src/utils/scoring.ts`. Identical constants, identical math.

```swift
// maven/Utils/Scoring.swift
import Foundation

let lowDataMakerThreshold = 15
let lowDataClickThreshold = 10
let minEngagementBaseline: Double = 3.0

struct ScoringWeights {
    let proximity: Double
    let engagement: Double
    let freshness: Double
}

let normalWeights = ScoringWeights(proximity: 0.4, engagement: 0.4, freshness: 0.2)
let lowDataWeights = ScoringWeights(proximity: 0.55, engagement: 0.2, freshness: 0.25)

/// 1.0 at 0 km, ~0.5 at 5 km, ~0.1 at 20 km. Inverse-square decay.
func proximityScore(_ distanceKm: Double?) -> Double {
    guard let d = distanceKm else { return 0 }
    return 1.0 / (1.0 + pow(d / 5.0, 2))
}

/// Linear decay from 1.0 → 0.0 over 30 days.
func freshnessBoost(_ createdAt: String?) -> Double {
    guard let createdAt, let date = ISO8601DateFormatter().date(from: createdAt) else { return 0 }
    let ageDays = Date().timeIntervalSince(date) / 86400
    if ageDays > 30 { return 0 }
    return 1.0 - ageDays / 30.0
}

struct ScoringInput {
    let distanceKm: Double?
    let engagementScore: Double
    let createdAt: String?
    let p95Engagement: Double
    let isLowData: Bool
}

func compositeScore(_ input: ScoringInput) -> Double {
    let w = input.isLowData ? lowDataWeights : normalWeights
    let prox = proximityScore(input.distanceKm)
    let eng = input.p95Engagement > 0 ? min(1, input.engagementScore / input.p95Engagement) : 0
    let fresh = freshnessBoost(input.createdAt)

    if input.distanceKm == nil {
        let total = w.engagement + w.freshness
        return (w.engagement / total) * eng + (w.freshness / total) * fresh
    }

    return w.proximity * prox + w.engagement * eng + w.freshness * fresh
}
```

**Step 2: Port distance utils**

```swift
// maven/Utils/Distance.swift
import Foundation
import CoreLocation

/// Haversine distance in km
func getDistance(lat1: Double, lng1: Double, lat2: Double, lng2: Double) -> Double {
    let R = 6371.0
    let dLat = (lat2 - lat1) * .pi / 180
    let dLng = (lng2 - lng1) * .pi / 180
    let a = sin(dLat / 2) * sin(dLat / 2) +
        cos(lat1 * .pi / 180) * cos(lat2 * .pi / 180) *
        sin(dLng / 2) * sin(dLng / 2)
    let c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return R * c
}

func formatDistance(_ km: Double) -> String {
    if km < 1 { return "\(Int(round(km * 1000 / 10) * 10)) m" }
    if km < 10 { return "\(round(km * 10) / 10) km" }
    return "\(Int(round(km))) km"
}

func formatLocation(_ maker: Maker) -> String {
    guard let dist = maker.distance else { return maker.city }
    let formatted = formatDistance(dist)
    if dist >= 50, !maker.county.isEmpty { return "\(formatted) · Co. \(maker.county)" }
    return "\(formatted) · \(maker.city)"
}
```

**Step 3: Port interleave**

```swift
// maven/Utils/Interleave.swift
import Foundation

/// Reorder so no more than maxConsecutive same-category makers in a row.
func interleavedByCategory(_ makers: [Maker], maxConsecutive: Int = 2) -> [Maker] {
    var result = makers
    let len = result.count

    for i in 0..<len {
        var streak = 1
        while streak <= maxConsecutive && i - streak >= 0 && result[i - streak].category == result[i].category {
            streak += 1
        }
        if streak > maxConsecutive {
            var swapIdx = -1
            for j in (i + 1)..<len {
                if result[j].category != result[i].category {
                    swapIdx = j
                    break
                }
            }
            if swapIdx != -1 {
                let item = result.remove(at: swapIdx)
                result.insert(item, at: i)
            }
        }
    }
    return result
}
```

**Step 4: Port time utils**

```swift
// maven/Utils/TimeUtils.swift
import Foundation

private let dayKeys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]

func isOpenNow(_ hours: [String: String]?) -> Bool {
    guard let hours else { return false }
    let day = dayKeys[Calendar.current.component(.weekday, from: Date()) - 1]
    guard let todayHours = hours[day], todayHours != "closed" else { return false }
    let parts = todayHours.split(separator: "-").compactMap { Int($0) }
    guard parts.count == 2 else { return false }
    let currentHour = Calendar.current.component(.hour, from: Date())
    return currentHour >= parts[0] && currentHour < parts[1]
}

private func to12h(_ h: Int) -> String {
    if h == 0 || h == 24 { return "12AM" }
    if h == 12 { return "12PM" }
    return h < 12 ? "\(h)AM" : "\(h - 12)PM"
}

func formatHoursRange(_ hoursStr: String?) -> String {
    guard let hoursStr, hoursStr != "closed" else { return "Closed" }
    let parts = hoursStr.split(separator: "-").compactMap { Int($0) }
    guard parts.count == 2 else { return hoursStr }
    return "\(to12h(parts[0]))–\(to12h(parts[1]))"
}

func getTodayHours(_ hours: [String: String]?) -> String {
    guard let hours else { return "Hours unavailable" }
    let day = dayKeys[Calendar.current.component(.weekday, from: Date()) - 1]
    guard let todayHours = hours[day], todayHours != "closed" else { return "Closed today" }
    return "Open \(formatHoursRange(todayHours))"
}

func getInitials(_ name: String) -> String {
    let words = name.split(separator: " ")
    return String(words.prefix(2).compactMap(\.first)).uppercased()
}
```

**Step 5: Image URL optimization**

```swift
// maven/Utils/ImageUtils.swift
import Foundation

enum ImageQuality: Int {
    case thumbnail = 60
    case standard = 80
    case hero = 85
    case lightbox = 90
}

func optimizeImageUrl(_ url: String?, width: Int, quality: ImageQuality = .standard) -> URL? {
    guard let url, !url.isEmpty else { return nil }

    if url.contains(".supabase.co/storage/") {
        let height = Int(Double(width) * 1.25)
        let renderUrl = url.replacingOccurrences(of: "/object/public/", with: "/render/image/public/")
        let base = renderUrl.components(separatedBy: "?").first ?? renderUrl
        return URL(string: "\(base)?width=\(width)&height=\(height)&quality=\(quality.rawValue)&resize=cover")
    }

    return URL(string: url)
}
```

**Step 6: Write tests for scoring and distance**

```swift
// mavenTests/ScoringTests.swift
import XCTest
@testable import maven

final class ScoringTests: XCTestCase {
    func testProximityScoreAtZero() {
        XCTAssertEqual(proximityScore(0), 1.0)
    }

    func testProximityScoreAt5km() {
        XCTAssertEqual(proximityScore(5.0), 0.5, accuracy: 0.01)
    }

    func testProximityScoreNil() {
        XCTAssertEqual(proximityScore(nil), 0.0)
    }

    func testFreshnessBoostOlderThan30Days() {
        let old = ISO8601DateFormatter().string(from: Date().addingTimeInterval(-40 * 86400))
        XCTAssertEqual(freshnessBoost(old), 0.0)
    }

    func testCompositeScoreWithoutLocation() {
        let input = ScoringInput(distanceKm: nil, engagementScore: 5, createdAt: nil, p95Engagement: 10, isLowData: false)
        let score = compositeScore(input)
        // Without location, only engagement contributes (freshness is 0 for nil createdAt)
        XCTAssertGreaterThan(score, 0)
        XCTAssertLessThanOrEqual(score, 1)
    }
}
```

```swift
// mavenTests/DistanceTests.swift
import XCTest
@testable import maven

final class DistanceTests: XCTestCase {
    func testGalwayToDublin() {
        // ~210 km
        let d = getDistance(lat1: 53.2707, lng1: -9.0568, lat2: 53.3498, lng2: -6.2603)
        XCTAssertEqual(d, 192, accuracy: 10)
    }

    func testZeroDistance() {
        let d = getDistance(lat1: 53.27, lng1: -9.05, lat2: 53.27, lng2: -9.05)
        XCTAssertEqual(d, 0, accuracy: 0.01)
    }

    func testFormatDistanceMeters() {
        XCTAssertEqual(formatDistance(0.5), "500 m")
    }

    func testFormatDistanceKm() {
        XCTAssertEqual(formatDistance(3.7), "3.7 km")
    }
}
```

**Step 7: Run tests**

Run: `xcodebuild test -scheme maven -destination 'platform=iOS Simulator,name=iPhone 16'`
Expected: All tests PASS

**Step 8: Commit**

```bash
git add . && git commit -m "feat: scoring, distance, interleave, time, image utils with tests"
```

---

### Task 4: Theme System

**Files:**
- Create: `maven/Theme/ThemeManager.swift`
- Create: `maven/Theme/ThemeTokens.swift`

**Step 1: Define theme tokens**

```swift
// maven/Theme/ThemeTokens.swift
import SwiftUI

struct ThemeTokens {
    let bg: Color
    let card: Color
    let surface: Color
    let pill: Color
    let text: Color
    let textSecondary: Color
    let textMuted: Color
    let border: Color
    let btnBg: Color
    let btnText: Color
    let heart: Color
}

extension ThemeTokens {
    static let dark = ThemeTokens(
        bg: Color(hex: "#121212"),
        card: Color(hex: "#1e1e1e"),
        surface: Color(hex: "#252525"),
        pill: Color(hex: "#2d2d2d"),
        text: Color(hex: "#e8e6e3"),
        textSecondary: Color(hex: "#a0a0a0"),
        textMuted: Color(hex: "#707070"),
        border: Color(hex: "#333333"),
        btnBg: Color(hex: "#e8e6e3"),
        btnText: Color(hex: "#121212"),
        heart: Color(hex: "#fc8181")
    )

    static let light = ThemeTokens(
        bg: Color(hex: "#faf8f4"),
        card: Color.white,
        surface: Color(hex: "#f9f7f3"),
        pill: Color(hex: "#f0ece6"),
        text: Color(hex: "#1a1a1a"),
        textSecondary: Color(hex: "#666666"),
        textMuted: Color(hex: "#999999"),
        border: Color(hex: "#e8e4de"),
        btnBg: Color(hex: "#1a1a1a"),
        btnText: Color.white,
        heart: Color(hex: "#fc8181")
    )
}

// Hex color extension
extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet(charactersIn: "#"))
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let r = Double((int >> 16) & 0xFF) / 255
        let g = Double((int >> 8) & 0xFF) / 255
        let b = Double(int & 0xFF) / 255
        self.init(red: r, green: g, blue: b)
    }
}
```

**Step 2: Create ThemeManager**

```swift
// maven/Theme/ThemeManager.swift
import SwiftUI

@Observable
final class ThemeManager {
    var overrideDark: Bool? {
        didSet { UserDefaults.standard.set(overrideDark.map { $0 ? "true" : "false" }, forKey: "maven_dark_mode") }
    }

    init() {
        if let stored = UserDefaults.standard.string(forKey: "maven_dark_mode") {
            overrideDark = stored == "true"
        }
    }

    func isDark(for systemScheme: ColorScheme) -> Bool {
        overrideDark ?? (systemScheme == .dark)
    }

    func tokens(for systemScheme: ColorScheme) -> ThemeTokens {
        isDark(for: systemScheme) ? .dark : .light
    }

    func toggleTheme(systemScheme: ColorScheme) {
        let current = isDark(for: systemScheme)
        overrideDark = !current
    }
}
```

**Step 3: Build to verify**

Run: `xcodebuild build`
Expected: BUILD SUCCEEDED

**Step 4: Commit**

```bash
git add . && git commit -m "feat: theme system with dark/light tokens and system override"
```

---

### Task 5: Supabase Service

**Files:**
- Create: `maven/Services/SupabaseService.swift`

**Step 1: Create Supabase service**

```swift
// maven/Services/SupabaseService.swift
import Foundation
import Supabase

actor SupabaseService {
    static let shared = SupabaseService()

    private let client: SupabaseClient

    private init() {
        client = SupabaseClient(
            supabaseURL: URL(string: "https://xsibqwoulhymoptduuca.supabase.co")!,
            supabaseKey: "sb_publishable_MQ2jyGBR_TlX_qwWvV3Z7w_AjK3hqm2"
        )
    }

    func fetchMakers() async throws -> [Maker] {
        try await client
            .from("makers")
            .select("id, slug, name, bio, category, city, county, address, country, lat, lng, hero_color, avatar_url, gallery_urls, website_url, instagram_handle, opening_hours, is_featured, is_spotlight, spotlight_quote, is_verified, made_in_ireland, years_active, events, created_at")
            .execute()
            .value
    }

    func fetchClickStats() async throws -> [MakerClickStats] {
        try await client
            .rpc("get_maker_click_stats")
            .execute()
            .value
    }

    func recordClick(makerId: String, visitorId: String) async {
        try? await client
            .rpc("record_maker_click", params: ["p_maker_id": makerId, "p_visitor_id": visitorId])
            .execute()
    }
}
```

**Step 2: Build to verify**

Run: `xcodebuild build`
Expected: BUILD SUCCEEDED (after SPM resolves supabase-swift)

**Step 3: Commit**

```bash
git add . && git commit -m "feat: Supabase service with makers fetch, click stats, click recording"
```

---

### Task 6: AppState — Central Observable

**Files:**
- Create: `maven/App/AppState.swift`

**Step 1: Create AppState**

This replaces the React hooks `useMakers`, `useSavedMakers`, and the scoring logic in `App.tsx`.

```swift
// maven/App/AppState.swift
import Foundation
import CoreLocation

@Observable
final class AppState {
    var rawMakers: [Maker] = []
    var clickStats: [String: MakerClickStats] = [:]
    var userLocation: CLLocationCoordinate2D?
    var isLoading = true
    var error: String?

    // Saved makers (persisted in UserDefaults)
    var savedIds: Set<String> {
        didSet {
            UserDefaults.standard.set(Array(savedIds), forKey: "maven_saved_ids")
        }
    }

    init() {
        let stored = UserDefaults.standard.stringArray(forKey: "maven_saved_ids") ?? []
        savedIds = Set(stored)
    }

    // MARK: - Scored + sorted makers

    var scoredMakers: [Maker] {
        guard !rawMakers.isEmpty else { return [] }

        // p95 engagement
        let engValues = clickStats.values.map(\.engagementScore).sorted()
        let p95Idx = max(0, Int(Double(engValues.count - 1) * 0.95))
        let p95 = max(minEngagementBaseline, engValues.isEmpty ? 1 : engValues[p95Idx])

        // Low-data detection
        let withClicks = clickStats.values.filter { $0.currentWeekClicks >= lowDataClickThreshold }.count
        let isLowData = withClicks < lowDataMakerThreshold

        var scored = rawMakers.map { maker -> Maker in
            var m = maker
            let stats = clickStats[maker.id]
            let engagement = stats?.engagementScore ?? 0
            let dist = userLocation.map { getDistance(lat1: $0.latitude, lng1: $0.longitude, lat2: maker.lat, lng2: maker.lng) }

            m.distance = dist
            m.engagementScore = engagement
            m.currentWeekClicks = stats?.currentWeekClicks ?? 0
            m.previousWeekClicks = stats?.previousWeekClicks ?? 0
            m.score = compositeScore(ScoringInput(
                distanceKm: dist,
                engagementScore: engagement,
                createdAt: maker.createdAt,
                p95Engagement: p95,
                isLowData: isLowData
            ))
            return m
        }

        scored.sort { a, b in
            if (b.score ?? 0) != (a.score ?? 0) { return (b.score ?? 0) < (a.score ?? 0) }
            return a.name < b.name
        }

        for i in scored.indices { scored[i].rank = i + 1 }

        return interleavedByCategory(scored)
    }

    // MARK: - Actions

    func fetchData() async {
        isLoading = true
        error = nil
        do {
            async let makersTask = SupabaseService.shared.fetchMakers()
            async let statsTask = SupabaseService.shared.fetchClickStats()
            let (makers, stats) = try await (makersTask, statsTask)
            rawMakers = makers
            clickStats = Dictionary(uniqueKeysWithValues: stats.map { ($0.makerId, $0) })
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    func toggleSave(_ makerId: String) {
        if savedIds.contains(makerId) {
            savedIds.remove(makerId)
        } else {
            savedIds.insert(makerId)
        }
    }

    func recordClick(_ maker: Maker) {
        let visitorId = UserDefaults.standard.string(forKey: "maven_visitor_id") ?? {
            let id = UUID().uuidString
            UserDefaults.standard.set(id, forKey: "maven_visitor_id")
            return id
        }()
        Task { await SupabaseService.shared.recordClick(makerId: maker.id, visitorId: visitorId) }
    }
}
```

**Step 2: Build to verify**

Run: `xcodebuild build`
Expected: BUILD SUCCEEDED

**Step 3: Commit**

```bash
git add . && git commit -m "feat: AppState with scoring, saved makers, Supabase data fetch"
```

---

### Task 7: Location Service

**Files:**
- Create: `maven/Services/LocationService.swift`

**Step 1: Create LocationService**

```swift
// maven/Services/LocationService.swift
import CoreLocation

@Observable
final class LocationService: NSObject, CLLocationManagerDelegate {
    var location: CLLocationCoordinate2D?
    var authorizationStatus: CLAuthorizationStatus = .notDetermined

    private let manager = CLLocationManager()

    override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyHundredMeters
        authorizationStatus = manager.authorizationStatus
    }

    func requestPermission() {
        manager.requestWhenInUseAuthorization()
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let loc = locations.last else { return }
        location = loc.coordinate
        manager.stopUpdatingLocation()
    }

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        authorizationStatus = manager.authorizationStatus
        if authorizationStatus == .authorizedWhenInUse || authorizationStatus == .authorizedAlways {
            manager.startUpdatingLocation()
        }
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        // Silently fail — app works without location
    }
}
```

**Step 2: Add NSLocationWhenInUseUsageDescription to Info.plist**

Add to target's Info.plist:
```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>Find nearby makers and get directions</string>
```

**Step 3: Build to verify**

Run: `xcodebuild build`
Expected: BUILD SUCCEEDED

**Step 4: Commit**

```bash
git add . && git commit -m "feat: location service with CLLocationManager"
```

---

### Task 8: App Entry Point + Tab Shell

**Files:**
- Create: `maven/App/MavenApp.swift`
- Create: `maven/App/ContentView.swift`
- Create: `maven/Views/Placeholders/PlaceholderView.swift`

**Step 1: App entry point**

```swift
// maven/App/MavenApp.swift
import SwiftUI

@main
struct MavenApp: App {
    @State private var appState = AppState()
    @State private var themeManager = ThemeManager()
    @State private var locationService = LocationService()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(appState)
                .environment(themeManager)
                .environment(locationService)
                .task {
                    await appState.fetchData()
                }
        }
    }
}
```

**Step 2: Tab shell**

```swift
// maven/App/ContentView.swift
import SwiftUI

struct ContentView: View {
    @Environment(AppState.self) private var appState
    @Environment(ThemeManager.self) private var themeManager
    @Environment(LocationService.self) private var locationService
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        let tokens = themeManager.tokens(for: colorScheme)

        TabView {
            Tab("Discover", systemImage: "house") {
                NavigationStack {
                    DiscoverView()
                }
            }
            Tab("Map", systemImage: "map") {
                PlaceholderView(title: "Map", subtitle: "Coming soon")
            }
            Tab("Saved", systemImage: appState.savedIds.isEmpty ? "heart" : "heart.fill") {
                PlaceholderView(title: "Saved", subtitle: "Coming soon")
            }
            Tab("Profile", systemImage: "person") {
                PlaceholderView(title: "Profile", subtitle: "Coming soon")
            }
        }
        .tint(tokens.text)
        .onChange(of: locationService.location) { _, newLoc in
            appState.userLocation = newLoc
        }
    }
}
```

**Step 3: Placeholder view**

```swift
// maven/Views/Placeholders/PlaceholderView.swift
import SwiftUI

struct PlaceholderView: View {
    let title: String
    let subtitle: String

    @Environment(ThemeManager.self) private var themeManager
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        let tokens = themeManager.tokens(for: colorScheme)
        ZStack {
            tokens.bg.ignoresSafeArea()
            VStack(spacing: 8) {
                Text(title)
                    .font(.custom("PlayfairDisplay-Bold", size: 24))
                    .foregroundStyle(tokens.text)
                Text(subtitle)
                    .font(.custom("DMSans-Medium", size: 14))
                    .foregroundStyle(tokens.textMuted)
            }
        }
    }
}
```

**Step 4: Build to verify**

Run: `xcodebuild build`
Expected: BUILD SUCCEEDED

**Step 5: Commit**

```bash
git add . && git commit -m "feat: app entry point with tab shell and placeholder views"
```

---

### Task 9: Shared UI Components

**Files:**
- Create: `maven/Views/Components/MakerAvatar.swift`
- Create: `maven/Views/Components/HeartButton.swift`
- Create: `maven/Views/Components/CategoryPills.swift`

**Step 1: MakerAvatar**

```swift
// maven/Views/Components/MakerAvatar.swift
import SwiftUI

struct MakerAvatar: View {
    let maker: Maker
    var size: CGFloat = 48

    var body: some View {
        ZStack {
            Circle()
                .fill(Color(hex: maker.heroColor))
                .frame(width: size, height: size)

            if let url = optimizeImageUrl(maker.avatarUrl, width: Int(size * 2), quality: .thumbnail) {
                AsyncImage(url: url) { image in
                    image.resizable().scaledToFill()
                } placeholder: {
                    Text(getInitials(maker.name))
                        .font(.custom("DMSans-SemiBold", size: size * 0.35))
                        .foregroundStyle(.white)
                }
                .frame(width: size, height: size)
                .clipShape(Circle())
            } else {
                Text(getInitials(maker.name))
                    .font(.custom("DMSans-SemiBold", size: size * 0.35))
                    .foregroundStyle(.white)
            }
        }
    }
}
```

**Step 2: HeartButton**

```swift
// maven/Views/Components/HeartButton.swift
import SwiftUI

struct HeartButton: View {
    let isSaved: Bool
    let action: () -> Void
    var size: CGFloat = 22

    @Environment(ThemeManager.self) private var themeManager
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        let tokens = themeManager.tokens(for: colorScheme)
        Button(action: {
            action()
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
        }) {
            Image(systemName: isSaved ? "heart.fill" : "heart")
                .font(.system(size: size))
                .foregroundStyle(isSaved ? tokens.heart : tokens.textMuted)
                .contentTransition(.symbolEffect(.replace))
        }
        .accessibilityLabel(isSaved ? "Remove from saved" : "Save maker")
    }
}
```

**Step 3: CategoryPills**

```swift
// maven/Views/Components/CategoryPills.swift
import SwiftUI

struct CategoryPills: View {
    let categories: [String]
    @Binding var selected: String
    var showOpenNow: Bool = false
    @Binding var openNow: Bool

    @Environment(ThemeManager.self) private var themeManager
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        let tokens = themeManager.tokens(for: colorScheme)
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(categories, id: \.self) { category in
                    Button {
                        selected = category
                        UIImpactFeedbackGenerator(style: .light).impactOccurred()
                    } label: {
                        Text(category)
                            .font(.custom("DMSans-Medium", size: 13))
                            .padding(.horizontal, 14)
                            .padding(.vertical, 8)
                            .background(selected == category ? tokens.text : tokens.pill)
                            .foregroundStyle(selected == category ? tokens.bg : tokens.textSecondary)
                            .clipShape(Capsule())
                    }
                }

                if showOpenNow {
                    Button {
                        openNow.toggle()
                        UIImpactFeedbackGenerator(style: .light).impactOccurred()
                    } label: {
                        HStack(spacing: 4) {
                            Circle()
                                .fill(openNow ? .green : tokens.textMuted)
                                .frame(width: 6, height: 6)
                            Text("Open now")
                                .font(.custom("DMSans-Medium", size: 13))
                        }
                        .padding(.horizontal, 14)
                        .padding(.vertical, 8)
                        .background(openNow ? Color.green.opacity(0.15) : tokens.pill)
                        .foregroundStyle(openNow ? .green : tokens.textSecondary)
                        .clipShape(Capsule())
                    }
                }
            }
            .padding(.horizontal, 16)
        }
    }
}
```

**Step 4: Build to verify**

Run: `xcodebuild build`
Expected: BUILD SUCCEEDED

**Step 5: Commit**

```bash
git add . && git commit -m "feat: MakerAvatar, HeartButton, CategoryPills components"
```

---

### Task 10: Discover Feed

**Files:**
- Create: `maven/Views/Discover/DiscoverView.swift`
- Create: `maven/Views/Discover/MakerCard.swift`
- Create: `maven/ViewModels/DiscoverViewModel.swift`

**Step 1: DiscoverViewModel**

```swift
// maven/ViewModels/DiscoverViewModel.swift
import Foundation

@Observable
final class DiscoverViewModel {
    var selectedCategory = "All"
    var openNow = false
    var searchText = ""

    let categories = ["All", "Clothing", "Objects", "Art"]

    func filteredMakers(from makers: [Maker]) -> [Maker] {
        var result = makers

        if selectedCategory != "All" {
            result = result.filter { $0.category == selectedCategory }
        }

        if openNow {
            result = result.filter { isOpenNow($0.openingHours) }
        }

        if !searchText.isEmpty {
            let query = searchText.lowercased()
            result = result.filter {
                $0.name.lowercased().contains(query) ||
                $0.category.lowercased().contains(query) ||
                $0.city.lowercased().contains(query)
            }
        }

        return result
    }
}
```

**Step 2: MakerCard**

```swift
// maven/Views/Discover/MakerCard.swift
import SwiftUI

struct MakerCard: View {
    let maker: Maker
    let isSaved: Bool
    let onToggleSave: () -> Void

    @Environment(ThemeManager.self) private var themeManager
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        let tokens = themeManager.tokens(for: colorScheme)
        let isDark = themeManager.isDark(for: colorScheme)

        VStack(alignment: .leading, spacing: 0) {
            // Hero image
            ZStack(alignment: .bottomLeading) {
                if let url = optimizeImageUrl(maker.galleryUrls.first, width: 400, quality: .hero) {
                    AsyncImage(url: url) { image in
                        image.resizable().scaledToFill()
                    } placeholder: {
                        Rectangle().fill(Color(hex: maker.heroColor))
                    }
                    .frame(height: 200)
                    .clipped()
                    .overlay {
                        LinearGradient(
                            colors: [.clear, .black.opacity(0.5)],
                            startPoint: .center,
                            endPoint: .bottom
                        )
                    }
                    .brightness(isDark ? -0.1 : -0.05)
                    .saturation(isDark ? 0.9 : 1.0)
                } else {
                    Rectangle()
                        .fill(Color(hex: maker.heroColor))
                        .frame(height: 200)
                }

                // Category + city overlay
                VStack(alignment: .leading, spacing: 2) {
                    Text(maker.category.uppercased())
                        .font(.custom("DMSans-SemiBold", size: 10))
                        .tracking(1)
                        .foregroundStyle(.white.opacity(0.8))
                    Text(maker.city)
                        .font(.custom("DMSans-Medium", size: 12))
                        .foregroundStyle(.white.opacity(0.7))
                }
                .padding(12)
            }

            // Info row
            HStack(alignment: .center) {
                MakerAvatar(maker: maker, size: 32)

                VStack(alignment: .leading, spacing: 2) {
                    Text(maker.name)
                        .font(.custom("DMSans-SemiBold", size: 14))
                        .foregroundStyle(tokens.text)
                        .lineLimit(1)
                    Text(formatLocation(maker))
                        .font(.custom("DMSans-Medium", size: 12))
                        .foregroundStyle(tokens.textSecondary)
                        .lineLimit(1)
                }

                Spacer()

                HeartButton(isSaved: isSaved, action: onToggleSave, size: 18)
            }
            .padding(12)
        }
        .background(tokens.card)
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }
}
```

**Step 3: DiscoverView**

```swift
// maven/Views/Discover/DiscoverView.swift
import SwiftUI

struct DiscoverView: View {
    @Environment(AppState.self) private var appState
    @Environment(ThemeManager.self) private var themeManager
    @Environment(\.colorScheme) private var colorScheme
    @State private var viewModel = DiscoverViewModel()

    var body: some View {
        let tokens = themeManager.tokens(for: colorScheme)
        let makers = viewModel.filteredMakers(from: appState.scoredMakers)

        ZStack {
            tokens.bg.ignoresSafeArea()

            ScrollView {
                LazyVStack(spacing: 16) {
                    // Header
                    VStack(alignment: .leading, spacing: 4) {
                        Text("maven")
                            .font(.custom("PlayfairDisplay-Bold", size: 28))
                            .foregroundStyle(tokens.text)
                        Text("Discover local makers")
                            .font(.custom("DMSans-Medium", size: 14))
                            .foregroundStyle(tokens.textSecondary)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 16)
                    .padding(.top, 8)

                    // Category pills
                    CategoryPills(
                        categories: viewModel.categories,
                        selected: $viewModel.selectedCategory,
                        showOpenNow: true,
                        openNow: $viewModel.openNow
                    )

                    if appState.isLoading {
                        ProgressView()
                            .padding(.top, 40)
                    } else if makers.isEmpty {
                        VStack(spacing: 8) {
                            Text("No makers found")
                                .font(.custom("DMSans-SemiBold", size: 16))
                                .foregroundStyle(tokens.text)
                            Text("Try a different category")
                                .font(.custom("DMSans-Medium", size: 14))
                                .foregroundStyle(tokens.textMuted)
                        }
                        .padding(.top, 40)
                    } else {
                        // Two-column masonry grid
                        MasonryLayout(makers: makers)
                    }
                }
                .padding(.bottom, 16)
            }
            .refreshable {
                await appState.fetchData()
            }
        }
        .searchable(text: $viewModel.searchText, prompt: "Search makers...")
        .navigationBarHidden(true)
    }
}

// MARK: - Masonry Layout

private struct MasonryLayout: View {
    let makers: [Maker]
    @Environment(AppState.self) private var appState

    var body: some View {
        let columns = splitColumns(makers)

        HStack(alignment: .top, spacing: 12) {
            LazyVStack(spacing: 12) {
                ForEach(columns.left) { maker in
                    NavigationLink(value: maker) {
                        MakerCard(
                            maker: maker,
                            isSaved: appState.savedIds.contains(maker.id),
                            onToggleSave: { appState.toggleSave(maker.id) }
                        )
                    }
                    .buttonStyle(.plain)
                }
            }
            LazyVStack(spacing: 12) {
                ForEach(columns.right) { maker in
                    NavigationLink(value: maker) {
                        MakerCard(
                            maker: maker,
                            isSaved: appState.savedIds.contains(maker.id),
                            onToggleSave: { appState.toggleSave(maker.id) }
                        )
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .padding(.horizontal, 16)
        .navigationDestination(for: Maker.self) { maker in
            MakerProfileView(maker: maker)
        }
    }

    private func splitColumns(_ makers: [Maker]) -> (left: [Maker], right: [Maker]) {
        var left: [Maker] = []
        var right: [Maker] = []
        for (i, maker) in makers.enumerated() {
            if i % 2 == 0 { left.append(maker) }
            else { right.append(maker) }
        }
        return (left, right)
    }
}
```

**Step 4: Build to verify**

Run: `xcodebuild build`
Expected: BUILD SUCCEEDED

**Step 5: Commit**

```bash
git add . && git commit -m "feat: DiscoverView with masonry grid, MakerCard, filtering"
```

---

### Task 11: MakerProfile Screen

**Files:**
- Create: `maven/Views/MakerProfile/MakerProfileView.swift`
- Create: `maven/Views/MakerProfile/MakerHeroView.swift`
- Create: `maven/Views/MakerProfile/MakerInfoSection.swift`

**Step 1: MakerHeroView**

```swift
// maven/Views/MakerProfile/MakerHeroView.swift
import SwiftUI

struct MakerHeroView: View {
    let maker: Maker

    @Environment(ThemeManager.self) private var themeManager
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        let isDark = themeManager.isDark(for: colorScheme)

        ZStack(alignment: .bottomLeading) {
            if let url = optimizeImageUrl(maker.galleryUrls.first, width: 800, quality: .hero) {
                AsyncImage(url: url) { image in
                    image.resizable().scaledToFill()
                } placeholder: {
                    Rectangle().fill(Color(hex: maker.heroColor))
                }
                .frame(height: 340)
                .clipped()
                .brightness(isDark ? -0.15 : -0.05)
                .saturation(isDark ? 0.9 : 1.0)
            } else {
                Rectangle()
                    .fill(Color(hex: maker.heroColor))
                    .frame(height: 340)
            }

            // Scrim
            LinearGradient(
                colors: [.clear, .clear, .black.opacity(0.6)],
                startPoint: .top,
                endPoint: .bottom
            )

            // Text overlay
            VStack(alignment: .leading, spacing: 4) {
                Text(maker.category.uppercased())
                    .font(.custom("DMSans-SemiBold", size: 11))
                    .tracking(1.5)
                    .foregroundStyle(.white.opacity(0.7))
                Text(maker.name)
                    .font(.custom("PlayfairDisplay-Bold", size: 32))
                    .foregroundStyle(.white)
                HStack(spacing: 4) {
                    Text(maker.city)
                    if let dist = maker.distance {
                        Text("·")
                        Text(formatDistance(dist))
                    }
                }
                .font(.custom("DMSans-Medium", size: 13))
                .foregroundStyle(.white.opacity(0.8))
            }
            .padding(20)
        }
    }
}
```

**Step 2: MakerInfoSection**

```swift
// maven/Views/MakerProfile/MakerInfoSection.swift
import SwiftUI

struct MakerInfoSection: View {
    let maker: Maker

    @Environment(ThemeManager.self) private var themeManager
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        let tokens = themeManager.tokens(for: colorScheme)

        VStack(alignment: .leading, spacing: 16) {
            // Bio
            Text(maker.bio)
                .font(.custom("DMSans-Medium", size: 14))
                .foregroundStyle(tokens.textSecondary)
                .lineSpacing(4)

            // Meta badges
            HStack(spacing: 12) {
                if maker.yearsActive > 0 {
                    Label("\(maker.yearsActive) years", systemImage: "clock")
                        .font(.custom("DMSans-Medium", size: 12))
                        .foregroundStyle(tokens.textMuted)
                }
                if maker.madeInIreland {
                    Label("Made in Ireland", systemImage: "flag")
                        .font(.custom("DMSans-Medium", size: 12))
                        .foregroundStyle(tokens.textMuted)
                }
                if maker.isVerified {
                    Label("Verified", systemImage: "checkmark.seal")
                        .font(.custom("DMSans-Medium", size: 12))
                        .foregroundStyle(tokens.textMuted)
                }
            }

            // Hours
            Text(getTodayHours(maker.openingHours))
                .font(.custom("DMSans-Medium", size: 13))
                .foregroundStyle(isOpenNow(maker.openingHours) ? .green : tokens.textSecondary)

            // Links
            HStack(spacing: 16) {
                if let website = maker.websiteUrl, let url = URL(string: website) {
                    Link(destination: url) {
                        Label("Website", systemImage: "globe")
                            .font(.custom("DMSans-SemiBold", size: 13))
                    }
                }
                if let ig = maker.instagramHandle {
                    Link(destination: URL(string: "https://instagram.com/\(ig)")!) {
                        Label("@\(ig)", systemImage: "camera")
                            .font(.custom("DMSans-SemiBold", size: 13))
                    }
                }
            }
            .foregroundStyle(tokens.text)
        }
        .padding(16)
    }
}
```

**Step 3: MakerProfileView**

```swift
// maven/Views/MakerProfile/MakerProfileView.swift
import SwiftUI

struct MakerProfileView: View {
    let maker: Maker

    @Environment(AppState.self) private var appState
    @Environment(ThemeManager.self) private var themeManager
    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        let tokens = themeManager.tokens(for: colorScheme)
        let isSaved = appState.savedIds.contains(maker.id)

        ScrollView {
            VStack(spacing: 0) {
                MakerHeroView(maker: maker)
                MakerInfoSection(maker: maker)

                // Gallery
                if maker.galleryUrls.count > 1 {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Work")
                            .font(.custom("DMSans-SemiBold", size: 16))
                            .foregroundStyle(tokens.text)
                            .padding(.horizontal, 16)

                        LazyVGrid(columns: [
                            GridItem(.flexible(), spacing: 4),
                            GridItem(.flexible(), spacing: 4),
                            GridItem(.flexible(), spacing: 4),
                        ], spacing: 4) {
                            ForEach(Array(maker.galleryUrls.dropFirst().enumerated()), id: \.offset) { _, url in
                                if let imageUrl = optimizeImageUrl(url, width: 200, quality: .thumbnail) {
                                    AsyncImage(url: imageUrl) { image in
                                        image.resizable().scaledToFill()
                                    } placeholder: {
                                        Rectangle().fill(tokens.surface)
                                    }
                                    .frame(minHeight: 120)
                                    .clipped()
                                }
                            }
                        }
                        .padding(.horizontal, 16)
                    }
                    .padding(.top, 8)
                }

                // Related makers
                relatedMakers
            }
        }
        .background(tokens.bg)
        .ignoresSafeArea(edges: .top)
        .navigationBarBackButtonHidden()
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                Button {
                    dismiss()
                } label: {
                    Image(systemName: "chevron.left")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(.white)
                        .padding(8)
                        .background(.ultraThinMaterial, in: Circle())
                }
            }
            ToolbarItem(placement: .topBarTrailing) {
                HStack(spacing: 12) {
                    ShareLink(item: URL(string: "https://mavenapp.vercel.app/?maker=\(maker.slug)")!) {
                        Image(systemName: "square.and.arrow.up")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(.white)
                            .padding(8)
                            .background(.ultraThinMaterial, in: Circle())
                    }
                    Button {
                        appState.toggleSave(maker.id)
                        UIImpactFeedbackGenerator(style: .light).impactOccurred()
                    } label: {
                        Image(systemName: isSaved ? "heart.fill" : "heart")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(isSaved ? tokens.heart : .white)
                            .padding(8)
                            .background(.ultraThinMaterial, in: Circle())
                            .contentTransition(.symbolEffect(.replace))
                    }
                }
            }
        }
        .task {
            appState.recordClick(maker)
        }
    }

    @ViewBuilder
    private var relatedMakers: some View {
        let tokens = themeManager.tokens(for: colorScheme)
        let related = appState.scoredMakers
            .filter { $0.id != maker.id }
            .sorted { a, b in
                if a.category == maker.category && b.category != maker.category { return true }
                if b.category == maker.category && a.category != maker.category { return false }
                return (a.distance ?? .infinity) < (b.distance ?? .infinity)
            }
            .prefix(6)

        if !related.isEmpty {
            VStack(alignment: .leading, spacing: 12) {
                Text("More makers")
                    .font(.custom("DMSans-SemiBold", size: 16))
                    .foregroundStyle(tokens.text)
                    .padding(.horizontal, 16)

                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 12) {
                        ForEach(Array(related)) { relatedMaker in
                            NavigationLink(value: relatedMaker) {
                                VStack(alignment: .leading, spacing: 8) {
                                    if let url = optimizeImageUrl(relatedMaker.galleryUrls.first, width: 200, quality: .thumbnail) {
                                        AsyncImage(url: url) { image in
                                            image.resizable().scaledToFill()
                                        } placeholder: {
                                            Rectangle().fill(Color(hex: relatedMaker.heroColor))
                                        }
                                        .frame(width: 160, height: 120)
                                        .clipShape(RoundedRectangle(cornerRadius: 12))
                                    }
                                    Text(relatedMaker.name)
                                        .font(.custom("DMSans-SemiBold", size: 13))
                                        .foregroundStyle(tokens.text)
                                        .lineLimit(1)
                                    Text(relatedMaker.city)
                                        .font(.custom("DMSans-Medium", size: 11))
                                        .foregroundStyle(tokens.textSecondary)
                                }
                                .frame(width: 160)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal, 16)
                }
            }
            .padding(.vertical, 20)
        }
    }
}
```

**Step 4: Build to verify**

Run: `xcodebuild build`
Expected: BUILD SUCCEEDED

**Step 5: Commit**

```bash
git add . && git commit -m "feat: MakerProfileView with hero, info, gallery, related makers"
```

---

### Task 12: Custom Fonts + Final Polish

**Files:**
- Modify: `maven/Resources/Fonts/` (add font files)
- Modify: `Info.plist` (register fonts)
- Create: `maven/Extensions/Font+Custom.swift`

**Step 1: Download and add fonts**

Download DM Sans (Medium 500, SemiBold 600, Bold 700) and Playfair Display (SemiBold 600, Bold 700) TTF files. Place in `maven/Resources/Fonts/`.

Add to Info.plist:
```xml
<key>UIAppFonts</key>
<array>
    <string>DMSans-Medium.ttf</string>
    <string>DMSans-SemiBold.ttf</string>
    <string>DMSans-Bold.ttf</string>
    <string>PlayfairDisplay-SemiBold.ttf</string>
    <string>PlayfairDisplay-Bold.ttf</string>
</array>
```

**Step 2: Font convenience extension (optional, for cleaner callsites)**

```swift
// maven/Extensions/Font+Custom.swift
import SwiftUI

extension Font {
    static func dmSans(_ size: CGFloat, weight: Font.Weight = .medium) -> Font {
        switch weight {
        case .bold: return .custom("DMSans-Bold", size: size)
        case .semibold: return .custom("DMSans-SemiBold", size: size)
        default: return .custom("DMSans-Medium", size: size)
        }
    }

    static func playfair(_ size: CGFloat, weight: Font.Weight = .bold) -> Font {
        switch weight {
        case .semibold: return .custom("PlayfairDisplay-SemiBold", size: size)
        default: return .custom("PlayfairDisplay-Bold", size: size)
        }
    }
}
```

**Step 3: Add sensory feedback on tab switches**

In `ContentView.swift`, add `.sensoryFeedback(.selection, trigger: selectedTab)` if using a manual tab state. The system `TabView` already provides haptics.

**Step 4: Build and run on simulator**

Run: `xcodebuild build -destination 'platform=iOS Simulator,name=iPhone 16'`
Expected: BUILD SUCCEEDED

**Step 5: Final commit**

```bash
git add . && git commit -m "feat: custom fonts, font extensions, polish"
```

---

## Task Summary

| Task | What | Key Files |
|------|------|-----------|
| 1 | Xcode project scaffold | Project, Package.swift |
| 2 | Models | Maker.swift, MakerClickStats.swift |
| 3 | Utils | Scoring, Distance, Interleave, Time, Image |
| 4 | Theme | ThemeManager, ThemeTokens |
| 5 | Supabase service | SupabaseService.swift |
| 6 | AppState | Central observable with scoring |
| 7 | Location service | CLLocationManager wrapper |
| 8 | Tab shell | MavenApp, ContentView, placeholders |
| 9 | Shared components | MakerAvatar, HeartButton, CategoryPills |
| 10 | Discover feed | DiscoverView, MakerCard, masonry |
| 11 | Maker profile | MakerProfileView, Hero, Info, Gallery |
| 12 | Fonts + polish | Custom fonts, haptics |
