"use strict";
/* ==========================================================================
   מצב האפליקציה + כל מנגנוני המשחק (XP, לבבות, יהלומים, רצף, משימות, ליגה, הישגים)
   הכול נשמר מקומית ב‑localStorage — בלי שרת, בלי חשבון, בלי איסוף מידע על ילדים.
   ========================================================================== */

var Game = (function () {

  /* ---------- קבועים (מכוילים לילדים בני 5, בהשראת המשחוק של דואולינגו) ---------- */
  var K = {
    XP_LESSON: 20,          /* XP בסיס לשיעור */
    XP_COMBO_MAX: 5,        /* בונוס על רצף תשובות נכונות בתוך שיעור */
    XP_REVIEW: 5,           /* חזרה על שיעור שהושלם */
    XP_PRACTICE: 10,
    XP_STORY: 15,
    XP_LEGEND: 40,          /* אתגר "אלוף היחידה" */

    HEARTS_MAX: 5,
    HEART_REGEN_MIN: 20,    /* דקה לכל לב — קצר יותר מדואולינגו, ילדים לא מחכים 5 שעות */

    GEM_LESSON: 5,
    GEM_CHEST: [10, 20, 35],       /* ארגז ברונזה / כסף / זהב על משימות יומיות */
    PRICE_HEART_REFILL: 350,
    PRICE_FREEZE: 200,
    PRICE_LEGEND: 100,
    FREEZE_MAX: 2,

    GOALS: [
      { id: "chill",   name: "רגוע",  xp: 10, sub: "שיעור אחד ביום" },
      { id: "normal",  name: "רגיל",  xp: 20, sub: "שני שיעורים ביום" },
      { id: "serious", name: "רציני", xp: 30, sub: "שלושה שיעורים" },
      { id: "intense", name: "אלוף",  xp: 50, sub: "חמישה שיעורים" }
    ],

    /* ליגות — עולים/יורדים בכל יום שני */
    LEAGUES: [
      { id: "bronze",   name: "ברונזה",  ic: "🥉", up: 20, down: 0,  gems: [20, 10, 5] },
      { id: "silver",   name: "כסף",     ic: "🥈", up: 15, down: 26, gems: [25, 15, 10] },
      { id: "gold",     name: "זהב",     ic: "🥇", up: 10, down: 26, gems: [30, 20, 15] },
      { id: "sapphire", name: "ספיר",    ic: "💠", up: 7,  down: 26, gems: [35, 25, 20] },
      { id: "ruby",     name: "אודם",    ic: "❤️‍🔥", up: 7, down: 26, gems: [40, 30, 25] },
      { id: "emerald",  name: "אזמרגד",  ic: "💚", up: 7,  down: 26, gems: [45, 35, 30] },
      { id: "amethyst", name: "אחלמה",   ic: "💜", up: 7,  down: 26, gems: [50, 40, 35] },
      { id: "pearl",    name: "פנינה",   ic: "🤍", up: 7,  down: 26, gems: [55, 45, 40] },
      { id: "obsidian", name: "אובסידיאן", ic: "🖤", up: 5, down: 26, gems: [60, 50, 45] },
      { id: "diamond",  name: "יהלום",   ic: "💎", up: 0,  down: 26, gems: [75, 60, 50] }
    ],

    /* אבני דרך ברצף — מעניקות מתנות */
    STREAK_MILES: [3, 7, 14, 30, 50, 75, 100, 150, 200, 250, 365]
  };

  /* ---------- הישגים ---------- */
  var BADGES = [
    { id: "wildfire", name: "להבה", ic: "🔥", desc: "רצף ימים ברציפות",
      levels: [3, 7, 14, 30, 50, 75, 125, 180, 250, 365], stat: "bestStreak" },
    { id: "sage", name: "חכם", ic: "🦉", desc: "לצבור נקודות ניסיון",
      levels: [100, 250, 500, 1000, 2000, 4000, 7500, 12500, 20000, 30000], stat: "xp" },
    { id: "sharp", name: "קליעה למטרה", ic: "🎯", desc: "שיעורים בלי אף טעות",
      levels: [1, 5, 20, 50, 100], stat: "perfect" },
    { id: "scholar", name: "אספן מילים", ic: "📚", desc: "מילים חדשות שלמדת",
      levels: [10, 25, 50, 75, 100, 150, 200, 300], stat: "words" },
    { id: "champion", name: "אלוף הליגה", ic: "🏆", desc: "לעלות ליגה",
      levels: [1, 2, 3, 4, 5, 6, 7, 8, 9], stat: "leagueIdx" },
    { id: "quest", name: "צייד משימות", ic: "🗺️", desc: "משימות יומיות שהושלמו",
      levels: [10, 25, 50, 75, 100, 200, 300, 400], stat: "quests" },
    { id: "early", name: "ציפור מקדימה", ic: "🌅", desc: "שיעורים לפני 9 בבוקר",
      levels: [3, 10, 20, 30, 40, 50, 75, 100], stat: "early" },
    { id: "night", name: "ינשוף לילה", ic: "🌙", desc: "שיעורים אחרי 8 בערב",
      levels: [3, 10, 20, 30, 40, 50, 75, 100], stat: "night" },
    { id: "fixer", name: "מתקן טעויות", ic: "🔧", desc: "טעויות שתיקנת בחזרה",
      levels: [10, 25, 50, 75, 100, 150, 250], stat: "fixed" },
    { id: "legend", name: "אגדי", ic: "👑", desc: "יחידות שסיימת באתגר האלוף",
      levels: [1, 3, 5, 10, 15, 20, 25], stat: "legendary" },
    { id: "weekend", name: "לוחם סופ״ש", ic: "🎈", desc: "ללמוד בשישי וגם בשבת",
      levels: [1], stat: "weekend" },
    { id: "talker", name: "פטפטן", ic: "🎤", desc: "מילים שהקראת נכון במיקרופון",
      levels: [5, 20, 50, 100, 200], stat: "spoken" }
  ];

  /* ---------- משימות יומיות אפשריות ---------- */
  var QUEST_POOL = [
    { id: "xp20",     ic: "⚡", text: "צברו {n} נקודות ניסיון", n: 20,  stat: "xp" },
    { id: "xp40",     ic: "⚡", text: "צברו {n} נקודות ניסיון", n: 40,  stat: "xp" },
    { id: "les2",     ic: "📘", text: "סיימו {n} שיעורים",      n: 2,   stat: "lessons" },
    { id: "les3",     ic: "📘", text: "סיימו {n} שיעורים",      n: 3,   stat: "lessons" },
    { id: "perfect1", ic: "🎯", text: "סיימו {n} שיעור בלי טעויות", n: 1, stat: "perfect" },
    { id: "listen5",  ic: "👂", text: "ענו נכון על {n} תרגילי האזנה", n: 5, stat: "listen" },
    { id: "speak3",   ic: "🎤", text: "הקריאו {n} מילים במיקרופון", n: 3, stat: "spoken" },
    { id: "words5",   ic: "✨", text: "למדו {n} מילים חדשות",  n: 5,   stat: "words" },
    { id: "time5",    ic: "⏱️", text: "למדו {n} דקות",          n: 5,   stat: "minutes" }
  ];

  /* ---------- ברירת מחדל ---------- */
  function fresh() {
    return {
      v: 1,
      name: "",
      avatar: "🦊",
      created: today(),
      onboarded: false,

      xp: 0,
      xpToday: 0,
      gems: 100,
      hearts: K.HEARTS_MAX,
      heartAt: 0,              /* חותמת זמן להתחדשות הלב הבא */
      noPressure: false,       /* מצב ללא לבבות — להורים שרוצים אפס תסכול */

      streak: 0,
      bestStreak: 0,
      lastDay: "",             /* היום האחרון שבו למדו */
      freezes: 1,
      freezeUsed: [],          /* ימים שנשמרו בעזרת הקפאה */
      days: {},                /* "2026-07-28": xp — ללוח הרצף */

      goal: "normal",
      progress: {},            /* nodeId -> { lv: מספר רמות שהושלמו, done: bool, legend: bool } */
      wordsSeen: {},           /* מילים שנחשפו — לשליטה ולחזרה מרווחת */
      mistakes: [],            /* מאגר טעויות לתרגול חוזר */

      quests: { day: "", list: [], claimed: [] },
      counters: { lessons: 0, perfect: 0, listen: 0, spoken: 0, minutes: 0, words: 0,
                  quests: 0, early: 0, night: 0, fixed: 0, legendary: 0, weekend: 0,
                  satSun: {}, seconds: 0 },
      badges: {},              /* id -> רמה שהושגה */

      league: { idx: 0, week: "", xp: 0, bots: [], joined: false },

      settings: { sfx: true, speech: true, dark: false, haptics: true, tlit: true },
      unlockedSections: 1
    };
  }

  var S = fresh();
  var KEY = "tuki.save.v1";

  /* ---------- תאריכים ---------- */
  function today(d) {
    d = d || new Date();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + m + "-" + day;
  }
  function daysBetween(a, b) {
    if (!a || !b) return 999;
    var x = new Date(a + "T00:00:00"), y = new Date(b + "T00:00:00");
    return Math.round((y - x) / 86400000);
  }
  function weekId(d) {
    d = d || new Date();
    var t = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    /* שבוע מתחיל ביום ראשון (כמו בלוח העברי) */
    t.setDate(t.getDate() - t.getDay());
    return today(t);
  }

  /* ---------- שמירה / טעינה ---------- */
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
  }
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var d = JSON.parse(raw);
        S = Object.assign(fresh(), d);
        S.counters = Object.assign(fresh().counters, d.counters || {});
        S.settings = Object.assign(fresh().settings, d.settings || {});
        S.league = Object.assign(fresh().league, d.league || {});
      }
    } catch (e) { S = fresh(); }
    tickDay();
    regenHearts();
    rollQuests();
    ensureLeague();
    return S;
  }
  function reset() { S = fresh(); save(); }

  /* ---------- רצף יומי ---------- */
  function tickDay() {
    var t = today();
    if (S.lastDay === t) return;
    if (!S.lastDay) return;
    var gap = daysBetween(S.lastDay, t);
    if (gap <= 0) return;
    if (gap === 1) return;                 /* אתמול למדו — הרצף עוד חי עד חצות */
    /* פספסו ימים — נסה להשתמש בהקפאות, ורשום אילו ימים ניצלו */
    var missed = gap - 1;
    var d = new Date(S.lastDay + "T00:00:00");
    while (missed > 0 && S.freezes > 0) {
      d.setDate(d.getDate() + 1);
      var key = today(d);
      if (S.freezeUsed.indexOf(key) < 0) S.freezeUsed.push(key);
      S.freezes--; missed--;
    }
    if (S.freezeUsed.length > 60) S.freezeUsed = S.freezeUsed.slice(-60);
    if (missed > 0) { S.streak = 0; }
    save();
  }

  /* נקרא בסיום שיעור — מעדכן רצף ומחזיר מידע לחגיגה */
  function markDayDone() {
    var t = today();
    var res = { newDay: false, streak: S.streak, milestone: 0 };
    if (S.lastDay !== t) {
      var gap = daysBetween(S.lastDay, t);
      if (!S.lastDay || gap === 1 || S.streak === 0) S.streak = S.streak + 1;
      else if (gap > 1) S.streak = 1;
      S.lastDay = t;
      res.newDay = true;
      if (S.streak > S.bestStreak) S.bestStreak = S.streak;
      if (K.STREAK_MILES.indexOf(S.streak) >= 0) {
        res.milestone = S.streak;
        S.gems += 20 + S.streak;
        if (S.streak >= 7) S.freezes = Math.min(K.FREEZE_MAX, S.freezes + 1);
      }
      /* לוחם סופ״ש — שישי + שבת */
      var dow = new Date().getDay();
      if (dow === 5 || dow === 6) {
        S.counters.satSun[weekId()] = (S.counters.satSun[weekId()] || 0) | (dow === 5 ? 1 : 2);
        if (S.counters.satSun[weekId()] === 3) S.counters.weekend = 1;
      }
    }
    S.days[t] = (S.days[t] || 0) + 1;
    res.streak = S.streak;
    save();
    return res;
  }

  /* ---------- לבבות ---------- */
  function regenHearts() {
    if (S.noPressure) { S.hearts = K.HEARTS_MAX; return; }
    if (S.hearts >= K.HEARTS_MAX) { S.heartAt = 0; return; }
    if (!S.heartAt) { S.heartAt = Date.now() + K.HEART_REGEN_MIN * 60000; return; }
    var now = Date.now();
    while (S.hearts < K.HEARTS_MAX && now >= S.heartAt) {
      S.hearts++;
      S.heartAt = S.hearts >= K.HEARTS_MAX ? 0 : S.heartAt + K.HEART_REGEN_MIN * 60000;
    }
    save();
  }
  function loseHeart() {
    if (S.noPressure) return S.hearts;
    if (S.hearts === K.HEARTS_MAX) S.heartAt = Date.now() + K.HEART_REGEN_MIN * 60000;
    S.hearts = Math.max(0, S.hearts - 1);
    save();
    return S.hearts;
  }
  function gainHeart(n) {
    S.hearts = Math.min(K.HEARTS_MAX, S.hearts + (n || 1));
    if (S.hearts >= K.HEARTS_MAX) S.heartAt = 0;
    save();
  }
  function heartTimer() {
    if (S.hearts >= K.HEARTS_MAX || !S.heartAt) return "";
    var ms = Math.max(0, S.heartAt - Date.now());
    var m = Math.floor(ms / 60000), s = Math.floor((ms % 60000) / 1000);
    return m + ":" + String(s).padStart(2, "0");
  }

  /* ---------- יהלומים ---------- */
  function addGems(n) { S.gems = Math.max(0, S.gems + n); save(); }
  function spend(n) {
    if (S.gems < n) return false;
    S.gems -= n; save(); return true;
  }

  /* ---------- XP ---------- */
  function addXP(n) {
    S.xp += n;
    S.xpToday = (S.lastXpDay === today() ? S.xpToday : 0) + n;
    S.lastXpDay = today();
    S.days[today()] = (S.days[today()] || 0);
    S.league.xp += n;
    save();
  }
  function goalXP() {
    var g = K.GOALS.filter(function (x) { return x.id === S.goal; })[0] || K.GOALS[1];
    return g.xp;
  }
  function todayXP() { return S.lastXpDay === today() ? S.xpToday : 0; }

  /* ---------- משימות יומיות ---------- */
  function rollQuests() {
    var t = today();
    if (S.quests.day === t && S.quests.list.length) return;
    /* בחירה דטרמיניסטית לפי התאריך — אותן משימות לאורך כל היום */
    var seed = 0, i;
    for (i = 0; i < t.length; i++) seed = (seed * 31 + t.charCodeAt(i)) >>> 0;
    var pool = QUEST_POOL.slice();
    var picked = [];
    for (i = 0; i < 3 && pool.length; i++) {
      seed = (seed * 1103515245 + 12345) >>> 0;
      var idx = seed % pool.length;
      picked.push(Object.assign({}, pool[idx], { base: null }));
      pool.splice(idx, 1);
    }
    S.quests = { day: t, list: picked, claimed: [], base: snapshotCounters() };
    save();
  }
  function snapshotCounters() {
    return {
      xp: todayXP(), lessons: S.counters.lessons, perfect: S.counters.perfect,
      listen: S.counters.listen, spoken: S.counters.spoken, minutes: S.counters.minutes,
      words: S.counters.words
    };
  }
  function questProgress(q) {
    var base = (S.quests.base || {})[q.stat] || 0;
    var cur = q.stat === "xp" ? todayXP() : (S.counters[q.stat] || 0);
    if (q.stat === "xp") base = 0; /* XP יומי כבר מתאפס */
    return Math.max(0, Math.min(q.n, cur - base));
  }
  function claimQuest(i) {
    if (S.quests.claimed.indexOf(i) >= 0) return 0;
    var q = S.quests.list[i];
    if (!q || questProgress(q) < q.n) return 0;
    S.quests.claimed.push(i);
    S.counters.quests++;
    var g = K.GEM_CHEST[Math.min(i, 2)];
    addGems(g);
    save();
    return g;
  }

  /* ---------- ליגה ---------- */
  var BOT_NAMES = ["נועה", "איתי", "שירה", "יובל", "דניאל", "מאיה", "אריאל", "רוני", "עמית",
    "תמר", "אורי", "ליאם", "אלה", "עידו", "יעל", "גיא", "טליה", "אדם", "רותם", "הלל",
    "נטע", "עופרי", "אביב", "כרמל", "שחר", "לביא", "אלמה", "יהלי", "נעם", "ניצן"];
  var BOT_FACES = ["🦁", "🐼", "🐨", "🐯", "🦄", "🐧", "🐸", "🐵", "🦊", "🐰", "🐻", "🐷",
    "🐔", "🦉", "🐝", "🦋", "🐙", "🦖", "🐢", "🐳", "🦒", "🐘", "🦓", "🐴", "🦔", "🐹",
    "🐭", "🦇", "🐺", "🦅"];

  function ensureLeague() {
    var w = weekId();
    if (S.league.week === w && S.league.bots.length) return;
    var prevRank = S.league.week ? rank() : -1;
    /* קידום / הורדה בסוף שבוע */
    if (S.league.week && S.league.joined) {
      var L = K.LEAGUES[S.league.idx];
      if (prevRank >= 0) {
        var place = prevRank + 1;
        if (place <= 3) addGems(L.gems[place - 1]);
        if (L.up && place <= L.up && S.league.idx < K.LEAGUES.length - 1) S.league.idx++;
        else if (L.down && place >= L.down && S.league.idx > 0) S.league.idx--;
      }
    }
    /* קבוצה חדשה של 29 יריבים */
    var bots = [], used = {};
    var lvl = S.league.idx;
    for (var i = 0; i < 29; i++) {
      var n, f, guard = 0;
      do { n = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)]; guard++; } while (used[n] && guard < 60);
      used[n] = 1;
      f = BOT_FACES[Math.floor(Math.random() * BOT_FACES.length)];
      /* ככל שהליגה גבוהה יותר — היריבים חרוצים יותר */
      var pace = (8 + lvl * 5) * (0.35 + Math.random() * 1.5);
      bots.push({ n: n, f: f, xp: 0, pace: Math.round(pace) });
    }
    S.league = { idx: S.league.idx, week: w, xp: 0, bots: bots, joined: S.league.joined, seen: false };
    save();
  }

  /* היריבים "לומדים" לאורך השבוע — מתקדמים לפי הזמן שעבר */
  function advanceBots() {
    var w = weekId();
    var days = Math.max(0, daysBetween(w, today())) + (new Date().getHours() / 24);
    S.league.bots.forEach(function (b) {
      var target = Math.round(b.pace * days);
      if (target > b.xp) b.xp = target;
    });
    save();
  }

  function standings() {
    advanceBots();
    var list = S.league.bots.map(function (b) { return { n: b.n, f: b.f, xp: b.xp, me: false }; });
    list.push({ n: S.name || "אני", f: S.avatar, xp: S.league.xp, me: true });
    list.sort(function (a, b) { return b.xp - a.xp || (a.me ? 1 : -1); });
    return list;
  }
  function rank() {
    var l = standings();
    for (var i = 0; i < l.length; i++) if (l[i].me) return i;
    return l.length - 1;
  }

  /* ---------- הישגים ---------- */
  function statFor(id) {
    switch (id) {
      case "bestStreak": return S.bestStreak;
      case "xp": return S.xp;
      case "leagueIdx": return S.league.idx;
      case "words": return Object.keys(S.wordsSeen).length;
      default: return S.counters[id] || 0;
    }
  }
  function badgeLevel(b) {
    var v = statFor(b.stat), lv = 0;
    for (var i = 0; i < b.levels.length; i++) if (v >= b.levels[i]) lv = i + 1;
    return lv;
  }
  /* מחזיר רשימת הישגים חדשים שנפתחו מאז הבדיקה הקודמת */
  function checkBadges() {
    var gained = [];
    BADGES.forEach(function (b) {
      var lv = badgeLevel(b);
      var had = S.badges[b.id] || 0;
      if (lv > had) {
        S.badges[b.id] = lv;
        gained.push({ badge: b, level: lv });
        S.gems += 15;
      }
    });
    if (gained.length) save();
    return gained;
  }

  /* ---------- התקדמות במסלול ---------- */
  function nodeState(id) {
    return S.progress[id] || { lv: 0, done: false, legend: false };
  }
  function completeNode(id, levels) {
    var p = nodeState(id);
    p.lv = Math.min(levels, p.lv + 1);
    p.done = p.lv >= levels;
    S.progress[id] = p;
    save();
    return p;
  }

  /* ---------- מילים שנלמדו ---------- */
  function seeWord(en) {
    if (!S.wordsSeen[en]) {
      S.wordsSeen[en] = { n: 0, ok: 0, last: 0 };
      S.counters.words++;
    }
    S.wordsSeen[en].n++;
    S.wordsSeen[en].last = Date.now();
    save();
  }
  function scoreWord(en, ok) {
    if (!S.wordsSeen[en]) seeWord(en);
    if (ok) S.wordsSeen[en].ok++;
    save();
  }
  /* חוזק המילה 0..1 — לחזרה מרווחת */
  function wordStrength(en) {
    var w = S.wordsSeen[en];
    if (!w || !w.n) return 0;
    var acc = w.ok / w.n;
    var ageDays = (Date.now() - w.last) / 86400000;
    return Math.max(0, Math.min(1, acc * Math.pow(0.85, ageDays)));
  }

  /* ---------- מאגר טעויות ---------- */
  function addMistake(item) {
    if (!item || !item.en) return;
    S.mistakes = S.mistakes.filter(function (m) { return m.en !== item.en; });
    S.mistakes.unshift({ en: item.en, he: item.he, emoji: item.emoji, tlit: item.tlit, at: Date.now() });
    if (S.mistakes.length > 60) S.mistakes.length = 60;
    save();
  }
  function clearMistake(en) {
    var before = S.mistakes.length;
    S.mistakes = S.mistakes.filter(function (m) { return m.en !== en; });
    if (S.mistakes.length < before) { S.counters.fixed++; }
    save();
  }

  return {
    K: K, BADGES: BADGES,
    get S() { return S; },
    load: load, save: save, reset: reset,
    today: today, weekId: weekId, daysBetween: daysBetween,
    markDayDone: markDayDone,
    regenHearts: regenHearts, loseHeart: loseHeart, gainHeart: gainHeart, heartTimer: heartTimer,
    addGems: addGems, spend: spend,
    addXP: addXP, goalXP: goalXP, todayXP: todayXP,
    rollQuests: rollQuests, questProgress: questProgress, claimQuest: claimQuest,
    ensureLeague: ensureLeague, standings: standings, rank: rank,
    badgeLevel: badgeLevel, checkBadges: checkBadges, statFor: statFor,
    nodeState: nodeState, completeNode: completeNode,
    seeWord: seeWord, scoreWord: scoreWord, wordStrength: wordStrength,
    addMistake: addMistake, clearMistake: clearMistake
  };
})();
