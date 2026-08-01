# Poker Night — App Plan

A home-game manager for a weekly Texas Hold'em tournament group: entry tracking,
automatic payouts, WhatsApp summaries, and a full-screen blinds clock.
Replaces the weekly Google Sheet.

---

## 1. The game as it works today (requirements)

- Weekly Texas Hold'em tournament with re-entries ("entries").
- **Entry price: ₪30** — every entry (first buy-in and each re-entry) adds ₪30 to the pool.
- **House fee: ₪30 per player, once per night** (separate from the pool).
- At the end of the night, entries per player are totaled.
- **Payout split of the pool: 1st place 65%, 2nd place 25%, house 10%.**
  (65 + 25 + 10 = 100% — the pool splits exactly.)
- Summary is posted to the group's WhatsApp.
- Wanted: date, start time, end time per game night, and a blinds timer with a
  preset structure that can be put up on a screen.

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

**Config, not constants:** entry price, fee, and split percentages live in a
settings screen with these as defaults, so a rule change never needs a code change.
Rounding rule: payouts round to whole shekels; remainder goes to 1st (configurable).

---

## 2. Feature breakdown

### MVP (v1)
1. **Game night lifecycle** — create game (date + start time auto-stamped), pick
   players from a saved roster, end game (end time auto-stamped), pick 1st/2nd.
2. **Entry tracking** — one big `+` per player, running total per player and for
   the pool, undo, entry log (who/when) for dispute-proofing.
3. **Payout calculator** — automatic settlement sheet: what each player pays or
   receives, house total, rounded to whole shekels.
4. **WhatsApp share** — one tap builds a formatted summary message and opens
   WhatsApp via `wa.me` / Web Share API (no API keys, no bot needed).
5. **Blinds clock** — full-screen TV mode; presets; pause/resume; next-level
   preview; sound + optional voice announcement on level change; wake-lock so
   the screen never sleeps; fully offline.
6. **Game history** — every night saved; browsable list replacing the sheet pile.

### v2
- **Leaderboard & stats** — career net ₪ per player, 1st/2nd counts, average
  entries, biggest night, attendance streaks. The killer feature for a weekly group.
- **Phone-drives-TV** — timer displayed on TV, controlled from the host's phone
  (Supabase Realtime channel; the clock itself still runs locally on the display).
- **Custom structure editor** — edit levels, durations, breaks; save named presets.
- **Rebuy window rules** — optional "rebuys close at first break" mode + add-on.
- **Bit / PayBox deep links** on the settlement sheet.

### v3 / later
- Big-blind ante support on the clock, bounties, multiple groups, photos,
  "hand of the night" notes.

---

## 3. Blinds research → defaults

Consensus from tournament-structure guides and home-game hosting resources
(BetMGM Poker, Poker Foundry, Poker Chip Forum, PokerCoaching, Blinds Are Up,
The Poker Timer):

- **Starting stack: 100–150 big blinds** (e.g. T5,000 at 25/50). Below ~50 BB the
  early game is a shove-fest; above ~200 BB the night drags.
- **Level length: 15–20 min** targets a 3–4 hour night. 10–12 min = turbo.
- **Blind growth: ~50% per level**, smoother early, roughly doubling later.
  Never more than double per level.
- **Rebuy period:** classic structure allows rebuys for the first 4–8 levels /
  first hour, closing at a break (often with an add-on). Unlimited all-night
  re-entry is also common in home games — both supported, all-night is our default.
- By the mid-game the average stack should sit around 15–25 BB to create real
  push-fold pressure and finish the tournament on time.

### Default structure — "Standard" (15-min levels, T5,000 start ≈ 100 BB)

| Level | Blinds | | Level | Blinds |
|---|---|---|---|---|
| 1 | 25 / 50 | | 8 | 400 / 800 |
| 2 | 50 / 100 | | 9 | 600 / 1,200 |
| 3 | 75 / 150 | | 10 | 800 / 1,600 |
| 4 | 100 / 200 | | 11 | 1,000 / 2,000 |
| 5 | 150 / 300 | | 12 | 1,500 / 3,000 |
| — | **Break 10 min** | | 13 | 2,000 / 4,000 |
| 6 | 200 / 400 | | 14 | 3,000 / 6,000 |
| 7 | 300 / 600 | | | |

With 6–8 players and typical rebuys this lands at ~3.5–4 hours including the break.

**Presets shipped:** Relaxed (20-min levels), Standard (15), Turbo (10) — same
ladder, different clock. Plus a deep-stack variant (T10,000 start) if the group
ever wants a longer night. Chip denominations in the ladder assume a standard
25/100/500/1000 home set; the structure editor lets us match whatever chipset
the group actually owns.

---

## 4. Technical foundations

**Stack: same recipe as Cruise** — single-file PWA (`index.html`) + Supabase,
installable to the home screen, no app store. Proven in this repo already
(auth by name+code, realtime, service worker). New repo or a subdirectory —
owner's call.

Key technical decisions:

- **Local-first timer.** The clock runs entirely client-side
  (`requestAnimationFrame` + timestamps, not `setInterval` drift); Wake Lock API
  keeps the screen on; works with zero network. Nothing about running the
  actual game night may depend on connectivity.
- **Entries as an event log** (`+1`/`−1` rows with timestamps), not a mutable
  counter — gives undo, audit trail, and safe offline sync (append-only merges
  cleanly when the connection returns).
- **Supabase schema:**
  - `players` (id, name, active)
  - `games` (id, date, start_at, end_at, status, config_json, structure_json)
  - `entry_events` (game_id, player_id, delta, created_at)
  - `results` (game_id, player_id, place)
  - derived: payouts computed, never stored as source of truth.
- **WhatsApp:** message built client-side, shared via Web Share API with
  `https://wa.me/?text=` fallback. User picks the group in WhatsApp itself —
  zero integration risk.
- **Hebrew/RTL-ready:** ₪ formatting, `dir="rtl"` support, day names in Hebrew.
  UI copy can be Hebrew, English, or both — owner's call.
- **PWA:** manifest + service worker precache so the app opens instantly at the
  table even with bad reception.

---

## 5. UX / UI direction

**Theme: "midnight felt."** Near-black background, deep felt green surfaces,
gold/amber accent for money, suit glyphs as subtle texture. Huge tabular-figure
numerals. Dark-only — this app lives in a dim room at 11pm.

**Two faces, one app:**

1. **Host mode (phone, portrait)** — the operational screen during play:
   - Compact timer strip pinned on top (level, blinds, countdown) — always visible.
   - Player list: avatar/initials, entry count, one thumb-sized `+` per row,
     long-press to undo. Running pool total and live 1st/2nd prize amounts at
     the bottom — watching the pot grow is half the fun.
   - Everything reachable one-handed; destructive actions confirm; every
     mutation has undo.

2. **Table mode (TV / tablet, landscape, full-screen)** — the poker clock:
   - Giant countdown in the center (readable from 4 meters).
   - Current blinds huge, **next blinds** small beneath — the single most
     requested clock feature.
   - Side rail: level number, elapsed time, players, total entries, prize pool,
     average stack.
   - Level-change moment: full-screen color pulse + gong + optional voice
     ("Blinds are now two hundred, four hundred"). Break levels get their own
     calm screen with a countdown to resume.
   - Controls (pause, ±1 min, skip/back level) hidden behind a tap, so nobody
     fat-fingers the clock while pointing at it.

**Key flows:**

- **Start night:** open app → "New Game" (one giant button) → roster pre-checked
  from last week → "Deal us in" → clock starts, start time stamped.
- **Mid-game:** bust → tap `+` on the player → chip-clink sound → pool ticks up.
- **End night:** "End Game" → tap 1st, tap 2nd → settlement sheet slides up →
  review → **"Share to WhatsApp"** as the primary CTA → done, night archived.
- **WhatsApp message format (draft):**

  ```
  🃏 Poker Night — Thu 30.7
  🕗 20:30 → 00:45  ·  7 players, 12 entries
  💰 Pool: ₪360
  🥇 Danny — ₪234
  🥈 Yossi — ₪90
  🏠 House — ₪246
  ───────────
  Danny +₪144 · Yossi ±₪0 · Tal −₪90 ...
  ```

**Design details that matter:** optimistic UI with instant feedback on every
tap; numbers animate when they change; empty states teach the flow the first
week; the whole app usable with beer in one hand.

---

## 6. Open questions

1. **"Profits" definition** — plan assumes 65/25/10 splits the entry pool and the
   ₪30/player fee is extra house income on top. Confirm.
2. **Rebuy rules** — re-entries allowed all night, or should they close at a
   certain level/break? (Default: all night.)
3. **Chipset** — which denominations and how many chips per starting stack, so
   presets match the physical chips.
4. **Language** — Hebrew, English, or bilingual UI?
5. **Home** — new repo, or built alongside Cruise in this one?

## 7. Suggested build order

1. Skeleton PWA + Supabase schema + roster and game creation
2. Entry tracking + payout math + settlement sheet (the Google Sheet replacement — immediate value)
3. WhatsApp share
4. Blinds clock: host strip → full-screen table mode → sounds/wake-lock
5. History list → then v2 stats/leaderboard
