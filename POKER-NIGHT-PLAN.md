# Poker Night — App Plan

A home-game manager for a weekly Texas Hold'em tournament group: entry tracking,
automatic payouts, WhatsApp summaries, and a full-screen blinds clock.
Replaces the weekly Google Sheet. **UI is Hebrew-only, RTL throughout.**

---

## 1. Confirmed rules (locked with owner)

- Weekly Texas Hold'em tournament with re-entries ("entries").
- **Entry price: ₪30** — every entry (first buy-in and each re-entry) adds ₪30 to the pool.
- **House fee: ₪30 per player, once per night** — on top of the pool, house income.
- **Payout split of the entry pool: 1st 65%, 2nd 25%, house 10%** (sums to exactly 100%).
- **Rebuy cap: a player may not rebuy more than 12 times** (i.e. max 13 entries
  including the first; cap is configurable — the app blocks the `+` past the limit
  with an override for the host).
- **Each entry = 1,500 tournament chips. Blinds start at 10/20** (75 BB deep).
- **Language: Hebrew only.** Full RTL layout, Hebrew dates, Hebrew copy everywhere.
- Summary posted to the group's WhatsApp.

### Worked example
7 players, 12 total entries:

| Item | Amount |
|---|---|
| Prize pool (12 × ₪30) | ₪360 |
| 1st place (65%) | ₪234 |
| 2nd place (25%) | ₪90 |
| House (10% + 7 × ₪30 fees) | ₪36 + ₪210 = ₪246 |

Per-player net = winnings − (entries × 30 + 30 fee). A player with 2 entries who
took 1st: +₪234 − ₪90 = **+₪144**.

Entry price, fee, split percentages, and rebuy cap all live in a settings screen
with these as defaults. Rounding: payouts round to whole shekels; remainder to 1st
(configurable).

---

## 2. Feature breakdown

### MVP (v1)
1. **Game night lifecycle** — create game (date + start time auto-stamped), pick
   players from the roster, end game (end time auto-stamped), pick 1st/2nd.
2. **Entry tracking** — one big `+` per player, running totals, undo, entry log
   (who/when), rebuy cap enforced at 12 with host override.
3. **Payout calculator** — automatic settlement sheet: what each player pays or
   receives, house total, whole-shekel rounding.
4. **WhatsApp share** — one tap builds a Hebrew summary message and opens
   WhatsApp via Web Share API / `wa.me` (no API keys, no bot).
5. **Blinds clock** — full-screen TV mode; presets built on the 1,500-chip /
   10-20 structure; pause/resume; next-level preview; gong + optional Hebrew
   voice announcement on level change; wake-lock; fully offline.
6. **Player profiles** — nickname + uploaded profile picture (Supabase Storage,
   client-side resize/crop before upload). Avatars appear in the roster, the
   in-game list, the leaderboard, and the clock's side rail.
7. **Manual history entry** — backfill past games: date, players, entries per
   player, 1st/2nd. Marked "הוזן ידנית" (no timer data), feeds all statistics
   identically to live games.
8. **Statistics & leaderboard** — career net ₪ per player, 1st/2nd counts,
   games played, average entries, biggest night. Promoted into v1 because
   backfilled history is the point of manual entry.

### v2
- **Phone-drives-TV** — timer on the TV, controlled from the host's phone
  (Supabase Realtime; clock still runs locally on the display device).
- **Custom structure editor** — edit levels/durations/breaks, save named presets.
- **Bit / PayBox deep links** on the settlement sheet.
- Attendance streaks, head-to-head stats, trends over time.

### v3 / later
- Big-blind ante on the clock, bounties, multiple groups, photos,
  "hand of the night" notes.

---

## 3. Blind structure — built for 1,500 stacks, 10/20 start

Research consensus (BetMGM Poker, Poker Foundry, Poker Chip Forum,
PokerCoaching, Blinds Are Up, The Poker Timer): start 75–150 BB deep,
15–20 minute levels for a 3–4 hour night, blinds growing ~50% per level and
never more than doubling. 1,500 at 10/20 = 75 BB — solid for a rebuy game.

### Default "Standard" preset (15-min levels)

| Level | Blinds | | Level | Blinds |
|---|---|---|---|---|
| 1 | 10 / 20 | | 8 | 100 / 200 |
| 2 | 15 / 30 | | 9 | 150 / 300 |
| 3 | 20 / 40 | | 10 | 200 / 400 |
| 4 | 30 / 60 | | 11 | 300 / 600 |
| 5 | 40 / 80 | | 12 | 400 / 800 |
| — | **Break 10 min** | | 13 | 600 / 1,200 |
| 6 | 50 / 100 | | 14 | 800 / 1,600 |
| 7 | 75 / 150 | | 15 | 1,000 / 2,000 |

Sizing check: 7 players averaging 2 entries ≈ 21,000 chips in play; the game
naturally ends when the big blind reaches ~5–10% of total chips (levels 13–15)
→ **~3.5–4 hours including the break**. More rebuys push chips up and the game
one level deeper — self-balancing.

**Presets shipped:** רגוע (20-min levels) · רגיל (15) · טורבו (10) — same ladder.
Levels 2 and 7 (15/30, 75/150) assume 5-value chips exist; if the physical set
is 25s-based, the editor swaps to a 10/20 → 20/40 → 40/80 ladder. Worth a quick
look at the actual chipset before locking the preset.

---

## 4. Technical foundations

**Stack: same recipe as Cruise** — single-file PWA (`index.html`) + Supabase,
installable to the home screen, no app store.

- **Hebrew/RTL as the foundation, not a layer:** `<html lang="he" dir="rtl">`,
  all copy in Hebrew, Hebrew typeface with proper numerals (Rubik or Heebo),
  dates as «יום חמישי 30.7», numbers/times embedded LTR inside RTL text
  (`unicode-bidi` handled once, globally). The clock's digits are locale-neutral.
- **Local-first timer.** Clock runs client-side off timestamps (no
  `setInterval` drift); Wake Lock API keeps the screen on; zero network needed
  during play.
- **Entries as an append-only event log** (`+1`/`−1` rows with timestamps) —
  undo, audit trail, and clean offline sync.
- **Supabase schema:**
  - `players` (id, name, nickname, avatar_url, active)
  - `games` (id, date, start_at, end_at, status, is_manual, config_json, structure_json)
  - `entry_events` (game_id, player_id, delta, created_at)
  - `results` (game_id, player_id, place)
  - Storage bucket `avatars` (client-side crop/resize to ~256px before upload).
  - Manual games write straight to `games` + aggregate entries + `results`;
    stats queries don't distinguish live from manual.
- **WhatsApp:** Hebrew message built client-side, shared via Web Share API with
  `wa.me` fallback; user picks the group in WhatsApp.
- **PWA:** manifest + service worker precache; opens instantly at the table.

---

## 5. UX / UI direction

**Theme: "midnight felt."** Near-black background, deep felt green surfaces,
gold accent for money, huge numerals. Dark-only — this app lives in a dim room.
Everything mirrored for RTL: navigation flows right-to-left, the `+` buttons
sit on the left end of each player row (thumb side for a right-handed grip).

**Two faces, one app:**

1. **מצב מנהל (host mode, phone, portrait)** — timer strip pinned on top;
   player rows with avatar, nickname, entry count, one thumb-sized `+`
   (long-press to undo, disabled state at the 12-rebuy cap with «הגיע לתקרה»);
   live pool and prize amounts at the bottom. One-handed, undoable, confirm on
   destructive actions.

2. **מצב שולחן (table mode, TV/tablet, landscape)** — giant centered countdown;
   current blinds huge with **next blinds** previewed beneath; side rail with
   level, elapsed time, players, entries, pool, average stack; gong + optional
   Hebrew voice («הבליינדים עולים: מאה–מאתיים») on level change; calm dedicated
   break screen; controls hidden behind a tap.

**Key flows:**

- **Start night:** «משחק חדש» → roster pre-checked from last week → clock starts.
- **Mid-game:** bust → `+` on the player → chip-clink → pool ticks up.
- **End night:** «סיום משחק» → tap 1st, tap 2nd → settlement sheet →
  **«שיתוף בוואטסאפ»** as primary CTA → night archived.
- **Backfill:** «הוספת משחק ישן» → date picker → players → entries per player
  (steppers) → 1st/2nd → saved into stats.
- **Profiles:** tap a player anywhere → sheet with photo (camera/gallery, square
  crop), nickname, career stat line.

**WhatsApp message (draft):**

```
🃏 ערב פוקר — יום חמישי 30.7
🕗 20:30 → 00:45 · 7 שחקנים · 12 כניסות
💰 קופה: ₪360
🥇 דני — ₪234
🥈 יוסי — ₪90
🏠 הבית — ₪246
───────────
דני ‎+144 · יוסי ‎0 · טל ‎−90 ...
```

**Statistics screen:** leaderboard cards sorted by career net ₪ — avatar,
nickname, games, 1st/2nd trophy counts, net in green/red. Tapping a player
opens their history. This is the screen the group argues about on WhatsApp.

---

## 6. Remaining small decisions

1. **Chipset denominations** — confirms whether the ladder keeps 15/30 and
   75/150 levels (needs 5-chips) or shifts to a 25s-friendly ladder.
2. **Rebuy cap semantics** — implemented as 12 *rebuys* (13 total entries).
   If the intent was 12 total entries, it's a one-number config change.
3. **Home** — new repo, or built alongside Cruise in this one?

## 7. Suggested build order

1. Skeleton Hebrew-RTL PWA + Supabase schema + roster, profiles (nickname/avatar)
2. Entry tracking + payout math + settlement sheet (immediate Google-Sheet replacement)
3. Manual history entry + statistics/leaderboard
4. WhatsApp share
5. Blinds clock: host strip → full-screen table mode → sounds/wake-lock
