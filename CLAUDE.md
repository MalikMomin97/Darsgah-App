@AGENTS.md

# Darsgah

**Darsgah Tracker** (app name everywhere in the UI; slug, package `com.darsgah.app` and the DB file
`darsgah_master.db` keep the old name so installs update in place). The word "darsgah" in
"Darsgah Off" etc. means the school itself and stays) — offline maktab (madrasa) management app: students, groups, daily attendance, curriculum
(books → chapters), daily sabak ratings and monthly reports. Expo SDK 57, Expo Router,
expo-sqlite. All data is local on the device; there is no backend.

**Keep this file up to date.** Any change to the data model, migrations, domain rules or
project layout must update the matching section here in the same change.

## Commands

npm project (`package-lock.json`), so use `npx`.

```bash
npx tsc --noEmit   # typecheck
npx expo lint      # lint
npx prettier --single-quote --print-width 100 --trailing-comma es5 --write <files>
```

There is no prettier config file: always pass the flags above (plain `npx prettier`
reformats to double quotes / width 80). Format only the files you changed.

## Layout

- `src/app/` — Expo Router routes only; each file re-exports a screen from `src/screens/`.
  Tabs: Dashboard (`index`), Students, Curriculum, Attendance, Reports.
- `src/navigation/appNavigation.ts` — `ROUTE_PATHS` maps named screens to routes; screens
  navigate with `useAppNavigation().navigate('Name', params)`.
- `src/screens/<area>/` — screens; `src/components/{common,learning,layout}/` — UI pieces.
- `src/services/*Service.ts` — all SQL lives here (plus the dashboard's stats queries).
- `src/db/` — `database.ts` (singleton connection), `migrations.ts`, seed data.
- `src/types/index.ts` (app types), `src/types/database.ts` (raw row types).
- `src/config/theme.ts` — `Colors`, `Spacing`, `Typography`, `BorderRadius`.

## Design system ("Emerald & Gold")

Tokens live in `src/config/theme.ts`; shared UI in `src/components/common/`. Use them —
no hard-coded hex colours, font sizes outside the scale, or ad-hoc shadows in screens.

- **Colours**: deep emerald `Colors.primary` brand, gold `Colors.accent` for highlights,
  warm ivory `Colors.background`, white `Colors.surface` cards, ink `Colors.text`.
  Tinted backgrounds use the `*Light`/`*Bg` pair of a colour. `Gradients.brand` for heroes.
- **Typography**: Plus Jakarta Sans (UI) and Amiri (Arabic), loaded in `src/app/_layout.tsx`.
  Style text by spreading a `Typography.*` token, or set `fontFamily: Fonts.<weight>`.
  **Never use `fontWeight`** — each weight is a separate font family (Android ignores
  `fontWeight` on custom fonts). Every `<Text>` must get a font family this way.
  Text that may be Arabic (chapter titles) gets `arabicAware(title, size)` appended.
- **Shape**: `BorderRadius.lg` (20) for cards, `md` (14) for inputs/buttons, `full` for
  pills; cards have a 1px `Colors.border` hairline + `Shadows.sm`. Screen gutter `Spacing.lg`.
- **Components**: `Header` (round back button, pill action), `Button` (gradient primary,
  spring press + haptic), `Card` (springs when `onPress`), `Input` (focus ring), `Chip`
  (filter pills), `SectionHeader`, `IconCircle`, `Badge` (dot + label), `StatCard`,
  `EmptyState`, `ConfirmModal`, `LoadingScreen`. Person avatars use `avatarTone(name)` +
  `initialsOf(name)` from `src/utils/avatar.ts` (attendance/sabak rows tint by status instead).
- **Patterns**: screen heroes are `LinearGradient` (`Gradients.brand*`) cards with white
  translucent overlays and `Colors.accentGlow`; pickers and editors are bottom sheets
  (overlay `Colors.overlay`, `BorderRadius.xl` top corners, grab handle, safe-area bottom
  padding) — currently built per screen, a shared `Sheet` component would be a good refactor.
  Grade colours come from `gradeColor()` in `utils/performance.ts` (theme tokens).
  The monthly-report PDF (`utils/exportUtils.ts`) uses the same palette in CSS.
- **Motion** (`components/common/Motion.tsx`): `PressableScale` for custom tappables,
  `<FadeInView index={i}>` for staggered list/section entry, `haptic.tap/select/success/warning`.
  Built on React Native's own `Animated` API (native driver; JS driver only for colour).
  **Do not import `react-native-reanimated`** (or worklets) in app code: the worklets version
  built into the user's client app differs from the project's, and importing it crashes the
  app at startup ("Mismatch between JavaScript code version and Worklets Babel plugin
  version"). Expo UI only loads worklets inside a try/catch, which is why the app is fine
  without it. Hold `Animated.Value`s in `useState(() => new Animated.Value(x))`.

## Database & migrations

- Versioned migrations in `src/db/migrations.ts`, each run once inside a transaction and
  recorded in `schema_migrations`. Never edit a shipped migration; add a new version.
- Migrations run only when the database is first opened, i.e. on a **full app restart**,
  not on Fast Refresh.
- Data migrations must keep existing user data: archive (`is_archived = 1`) instead of
  delete where ratings/attendance reference rows, and match default books by title.
- New tables must be added to the JSON export list in `services/backupService.ts`.

Current versions:
1. Base schema (settings, groups, students, group history, attendance, …)
2. Old subject/track model (superseded)
3. Books → chapters, `student_books`, `lesson_log`; seeds `DEFAULT_BOOKS`
4. & 5. `syncDefaultBookChapters` — Qaida as a single chapter, Arabic para names, all 114
   surahs in Arabic (5 re-runs 4 for devices that got English names; it is idempotent)
6. `holidays` table; attendance statuses reduced to present/absent (late→present,
   excused→absent)
7. Renames the seeded `institution_name` "Darsgah Islamic Institute" → "Darsgah Tracker"
   (only if the user never changed it)

## Domain rules

**Curriculum** — Books → Chapters only (no subjects tree). Books are assigned per student
(`student_books`); a book can have a `next_book_id` for promotion (Qaida → Quran).
Default books (`src/db/bookSeeds.ts`):
- Qaida — one chapter "Qaida" (no lessons); single-chapter books hide the chapter picker
  in Daily Sabak and show "Book completed".
- Quran (Nazira) — 30 paras with Arabic names (`PARA_NAMES`).
- Surah (Hifz) — all 114 surahs in mushaf order, Arabic names (`SURAH_NAMES`).
- Diniyat Part 1 — sections as chapters.
Old English/“Para N”/“Lesson N” titles are in `src/db/legacyBookTitles.ts`, used only by
migrations.

**Daily sabak** — one `lesson_log` row per student, chapter and date with a rating
(excellent / good / needs_improvement / bad) and an optional "completed" tick.
Learning % and grades: `src/utils/performance.ts`.

**Attendance** — statuses are only `present` | `absent`. Percentage = present ÷
(present + absent). One record per student per date.

**Darsgah off days** — `holidays` table (date, optional reason), darsgah-wide (all groups).
Marking a day off deletes that date's attendance after confirmation, and
`saveGroupAttendance` refuses to save on an off day, so off days never affect any student's
attendance. Managed from the Daily Attendance screen ("Darsgah Off" / "Mark as Working Day");
the dashboard shows "Darsgah off today".

**Dashboard** (`screens/dashboard/DashboardScreen.tsx`) — hero stats, quick actions, today's
attendance card, group carousel and a "need improvement" alert. The "Daily Sabak & Lesson
Progress" card was removed at the user's request; don't add it back.

**About & credits** — Settings → "About Us" (`screens/settings/AboutScreen.tsx`, route
`/about`) shows the app icon, version, features and privacy note, and ends with
"Developed by Khadim e Andrabia"; the Settings screen also ends with that credit line.
Keep the credit on both. App icons in `assets/` (emerald field, white open book, gold
crescent + star); adaptive-icon background colour `#0E5C4A` in `app.json`.

**Reports** — monthly student/group reports export as **PDF only** (`utils/exportUtils.ts`,
download to a chosen folder or share). CSV export was removed at the user's request.
The JSON data export in Backup & Restore is separate and still exists.
