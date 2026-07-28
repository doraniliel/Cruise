"use strict";
/* ==========================================================================
   אנגלית עם טוקי — לוגיקת האפליקציה
   מבנה: ניווט מסכים → לשוניות (מסלול, ליגה, משימות, חנות, פרופיל)
          → מנוע השיעור (כל סוגי התרגילים) → מסכי סיום → חלונות.
   כל ההוראות מוקראות בעברית, כי בני 5 עדיין לא קוראים.
   ========================================================================== */

var App = (function () {
  var S;                     /* קיצור ל‑Game.S */
  var tab = "learn";
  var L = null;              /* מצב השיעור הפעיל */

  /* ---------------- עזרים ---------------- */
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  /* מילה/משפט באנגלית — תמיד מבודד LTR בתוך ממשק RTL */
  function en(s) { return '<bdi class="en" dir="ltr">' + esc(s) + "</bdi>"; }
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function sample(a, n, exclude) {
    var pool = a.filter(function (x) { return !exclude || exclude.indexOf(x) < 0; });
    return shuffle(pool).slice(0, n);
  }
  function on(node, sel, ev, fn) {
    node.querySelectorAll(sel).forEach(function (e) { e.addEventListener(ev, fn); });
  }
  function tap(fn) {
    /* לחיצה עם צליל קליק — יעד מגע גדול, בלי דיליי */
    return function (e) { Sound.play("tap"); fn(e); };
  }

  /* ---------------- ניווט ---------------- */
  function show(id) {
    ["sc-onboard", "sc-main", "sc-lesson", "sc-done"].forEach(function (s) {
      $(s).classList.toggle("on", s === id);
    });
    window.scrollTo(0, 0);
  }

  function openSheet(html, mid) {
    $("overlay").classList.toggle("mid", !!mid);
    $("sheet").innerHTML = html;
    $("overlay").classList.add("on");
    return $("sheet");
  }
  function closeSheet() { $("overlay").classList.remove("on"); }

  function confetti(n) {
    var box = $("confetti");
    var colors = ["#58cc02", "#1cb0f6", "#ffc800", "#ff4b4b", "#ce82ff", "#ff9600"];
    var h = "";
    for (var i = 0; i < (n || 40); i++) {
      h += '<i style="left:' + Math.random() * 100 + "%;background:" + pick(colors) +
        ";animation-duration:" + (1.4 + Math.random() * 1.4) + "s;animation-delay:" +
        (Math.random() * .5) + 's"></i>';
    }
    box.innerHTML = h;
    box.classList.remove("hidden");
    setTimeout(function () { box.classList.add("hidden"); box.innerHTML = ""; }, 3200);
  }

  /* ==========================================================================
     הרשמה ראשונה
     ========================================================================== */
  var AVATARS = ["🦊", "🐻", "🐼", "🦁", "🐯", "🐨", "🐵", "🐸", "🦄", "🐧", "🐰", "🐱",
                 "🐶", "🦉", "🦋", "🐢", "🦖", "🐬"];

  function renderOnboard(step) {
    step = step || 0;
    var h = '<div class="wrap" style="padding-top:calc(env(safe-area-inset-top) + 24px);padding-bottom:40px">';

    if (step === 0) {
      h += '<div class="hero">' + Mascot.svg("wave", 170) +
        '<div class="ttl">היי! אני טוקי 🦜</div>' +
        '<div class="sub">בואו נלמד אנגלית ביחד — כל יום קצת, בכיף!</div></div>' +
        '<div style="height:28px"></div>' +
        '<button class="btn btn-lg" id="ob-go">יאללה, מתחילים!</button>' +
        '<div style="height:10px"></div>' +
        '<button class="btn btn-flat" id="ob-parent">👨‍👩‍👧 פינת ההורים</button>';
    } else if (step === 1) {
      h += '<div class="hero">' + Mascot.svg("happy", 120) +
        '<div class="ttl">איך קוראים לך?</div></div>' +
        '<input class="txt" id="ob-name" maxlength="12" placeholder="השם שלי…" autocomplete="off">' +
        '<div style="height:22px"></div>' +
        '<div class="section-title">בחרו חיה שתייצג אתכם</div>' +
        '<div class="pick-grid" id="ob-av">' +
        AVATARS.map(function (a, i) {
          return '<button class="pick' + (i === 0 ? " on" : "") + '" data-a="' + a + '">' + a + "</button>";
        }).join("") + "</div>" +
        '<div style="height:24px"></div>' +
        '<button class="btn btn-lg" id="ob-next">אפשר להמשיך</button>';
    } else {
      h += '<div class="hero">' + Mascot.svg("cheer", 120) +
        '<div class="ttl">כמה נלמד כל יום?</div>' +
        '<div class="sub">אפשר לשנות מתי שרוצים</div></div>' +
        '<div style="height:16px"></div>' +
        Game.K.GOALS.map(function (g) {
          return '<button class="goal-opt' + (g.id === "normal" ? " on" : "") + '" data-g="' + g.id + '">' +
            '<span><span class="g-name">' + g.name + "</span><br>" +
            '<span class="g-xp" style="font-size:13px">' + g.sub + "</span></span>" +
            '<span class="g-xp">' + g.xp + " נק׳</span></button>";
        }).join("") +
        '<div style="height:20px"></div>' +
        '<button class="btn btn-lg" id="ob-done">קדימה, ללמוד!</button>';
    }
    h += "</div>";
    var box = $("sc-onboard");
    box.innerHTML = h;
    show("sc-onboard");

    if (step === 0) {
      $("ob-go").onclick = tap(function () { Sound.unlock(); renderOnboard(1); });
      $("ob-parent").onclick = tap(parentZone);
      setTimeout(function () { Sound.sayHe("היי! אני טוקי. בואו נלמד אנגלית ביחד!"); }, 400);
    }
    if (step === 1) {
      on(box, "#ob-av .pick", "click", tap(function (e) {
        box.querySelectorAll("#ob-av .pick").forEach(function (p) { p.classList.remove("on"); });
        e.currentTarget.classList.add("on");
        S.avatar = e.currentTarget.dataset.a;
      }));
      $("ob-next").onclick = tap(function () {
        S.name = ($("ob-name").value || "").trim() || "אלוף";
        renderOnboard(2);
      });
      setTimeout(function () { Sound.sayHe("איך קוראים לך?"); }, 300);
    }
    if (step === 2) {
      on(box, ".goal-opt", "click", tap(function (e) {
        box.querySelectorAll(".goal-opt").forEach(function (p) { p.classList.remove("on"); });
        e.currentTarget.classList.add("on");
        S.goal = e.currentTarget.dataset.g;
      }));
      $("ob-done").onclick = tap(function () {
        S.onboarded = true;
        Game.save();
        goMain("learn");
        confetti(50);
        Sound.play("complete");
      });
    }
  }

  /* ==========================================================================
     מסך ראשי — סרגל, ניווט, לשוניות
     ========================================================================== */
  function goMain(t) {
    if (t) tab = t;
    Game.regenHearts();
    show("sc-main");
    renderTop();
    renderNav();
    renderTab();
  }

  function renderTop() {
    var heartTxt = S.noPressure ? "∞" : S.hearts;
    $("topbar").innerHTML =
      '<button class="stat flag" id="t-flag" aria-label="ההתקדמות שלי">🇬🇧</button>' +
      '<button class="stat streak' + (Game.todayXP() > 0 ? "" : " off") + '" id="t-streak">' +
        '<span class="ic">🔥</span>' + S.streak + "</button>" +
      '<button class="stat gems" id="t-gems"><span class="ic">💎</span>' + S.gems + "</button>" +
      '<button class="stat hearts" id="t-hearts"><span class="ic">❤️</span>' + heartTxt + "</button>";

    $("t-flag").onclick = tap(function () { sheetCourse(); });
    $("t-streak").onclick = tap(sheetStreak);
    $("t-gems").onclick = tap(function () { goMain("shop"); });
    $("t-hearts").onclick = tap(sheetHearts);
  }

  var TABS = [
    { id: "learn",  ic: "🏠", he: "ללמוד" },
    { id: "league", ic: "🛡️", he: "ליגה" },
    { id: "quests", ic: "🎯", he: "משימות" },
    { id: "shop",   ic: "🛍️", he: "חנות" },
    { id: "me",     ic: "🦜", he: "אני" }
  ];
  function renderNav() {
    $("nav").innerHTML = TABS.map(function (t) {
      return '<button class="nav-btn' + (t.id === tab ? " on" : "") + '" data-t="' + t.id + '">' +
        '<span class="ic">' + t.ic + "</span>" + t.he + "</button>";
    }).join("");
    on($("nav"), ".nav-btn", "click", tap(function (e) {
      tab = e.currentTarget.dataset.t;
      renderNav(); renderTab(); window.scrollTo(0, 0);
    }));
  }

  function renderTab() {
    if (tab === "learn")  return renderPath();
    if (tab === "league") return renderLeague();
    if (tab === "quests") return renderQuests();
    if (tab === "shop")   return renderShop();
    if (tab === "me")     return renderMe();
  }

  /* ==========================================================================
     לשונית 1 — המסלול
     ========================================================================== */
  /* היסט אופקי במחזור בן 8 שלבים — יוצר את ה"נחש" */
  var OFFSETS = [0, -44.88, -70, -44.88, 0, 44.88, 70, 44.88];

  function nodeLevels(kind) {
    return (kind === "story" || kind === "trophy") ? 1 : 2;
  }

  /* צומת פתוח אם כל הצמתים שלפניו הושלמו */
  function pathNodes() {
    var out = [];
    Curriculum.SECTIONS.forEach(function (sec, si) {
      sec.units.forEach(function (uid, ui) {
        var u = Curriculum.unit(uid);
        Curriculum.nodesOf(u).forEach(function (n, ni) {
          out.push(Object.assign({}, n, { sec: sec, secI: si, unitObj: u, unitI: ui, ni: ni,
            levels: nodeLevels(n.kind) }));
        });
      });
    });
    var unlocked = true;
    out.forEach(function (n) {
      var st = Game.nodeState(n.id);
      n.lv = st.lv; n.done = st.done;
      n.open = unlocked;
      if (!st.done) unlocked = false;
    });
    return out;
  }

  function unitDone(uid) {
    var u = Curriculum.unit(uid);
    return Curriculum.nodesOf(u).every(function (n) { return Game.nodeState(n.id).done; });
  }

  function renderPath() {
    var nodes = pathNodes();
    var h = "";
    var curUnit = null, firstOpenDrawn = false;

    Curriculum.SECTIONS.forEach(function (sec) {
      h += '<div class="sec-head"><span>חלק ' + sec.n + " · " + esc(sec.name) + "</span></div>";
      sec.units.forEach(function (uid, ui) {
        var u = Curriculum.unit(uid);
        var uNodes = nodes.filter(function (n) { return n.unit === uid; });
        var uOpen = uNodes[0].open;
        var uGold = unitDone(uid);

        h += '<section class="unit-block">';
        h += '<div class="unit-banner ' + (uOpen ? "u-" + u.color : "u-locked") + '">' +
          "<div><div class=\"eyebrow\">יחידה " + (ui + 1) + (uGold ? " · הושלמה 🏆" : "") + "</div>" +
          '<div class="ttl">' + u.ic + " " + esc(u.name) + "</div></div>" +
          '<button class="book" data-guide="' + uid + '" aria-label="מילון היחידה">📔</button></div>';

        h += '<div class="path">';
        uNodes.forEach(function (n, i) {
          var phase = (ui % 2 === 0) ? 0 : 4;
          var off = (i === uNodes.length - 1) ? 0 : OFFSETS[(i + phase) % 8];
          var cls = "node";
          var isCur = n.open && !n.done && !firstOpenDrawn;
          if (!n.open) cls += " locked";
          else if (n.done) cls += " done";
          else if (n.kind === "story") cls += " story";
          else if (n.kind === "trophy") cls += " chest";
          if (isCur) { cls += " big"; firstOpenDrawn = true; }

          var ic = n.done ? (n.kind === "trophy" ? "🏆" : "✔") : (n.open ? n.ic : "🔒");
          var ring = "";
          if (isCur && n.levels > 1) {
            var pct = n.lv / n.levels;
            var C = 2 * Math.PI * 52;
            ring = '<svg class="node-ring" viewBox="0 0 118 118">' +
              '<circle class="track" cx="59" cy="59" r="52"></circle>' +
              '<circle class="fill" cx="59" cy="59" r="52" stroke-dasharray="' + C +
              '" stroke-dashoffset="' + (C * (1 - pct)) + '" transform="rotate(-90 59 59)"></circle></svg>';
          }
          h += '<div class="node-wrap' + (isCur ? " bubbled" : "") +
            '" style="transform:translateX(' + off + 'px)">' +
            (isCur ? '<div class="start-bubble">' + (n.lv > 0 ? "להמשיך" : "להתחיל") + "</div>" : "") +
            ring +
            '<button class="' + cls + '" data-node="' + n.id + '"' + (n.open ? "" : " disabled") +
            '><span class="ic">' + ic + "</span></button></div>";
        });
        h += "</div></section>";
      });
    });

    $("tab-body").innerHTML = h;
    on($("tab-body"), ".node[data-node]", "click", tap(function (e) {
      startNode(e.currentTarget.dataset.node);
    }));
    on($("tab-body"), "[data-guide]", "click", tap(function (e) {
      sheetGuide(e.currentTarget.dataset.guide);
    }));
  }

  /* מילון היחידה */
  function sheetGuide(uid) {
    var u = Curriculum.unit(uid);
    var h = "<h2>" + u.ic + " " + esc(u.name) + "</h2>" +
      '<div class="lead">כל המילים ביחידה — לחצו כדי לשמוע</div>';
    u.words.forEach(function (w) {
      h += '<button class="card-row" data-say="' + esc(w.en) + '">' +
        '<span class="ic">' + w.emoji + "</span>" +
        '<span class="grow"><span class="ttl">' + en(w.en) + "</span>" +
        '<span class="sub">' + esc(w.he) + " · " + esc(w.tlit) + "</span></span>" +
        '<span class="ic">🔊</span></button>';
    });
    h += '<div class="section-title">משפטים שימושיים</div>';
    u.phrases.forEach(function (p) {
      h += '<button class="card-row" data-say="' + esc(p.en) + '">' +
        '<span class="grow"><span class="ttl">' + en(p.en) + "</span>" +
        '<span class="sub">' + esc(p.he) + "</span></span><span class=\"ic\">🔊</span></button>";
    });
    h += '<div style="height:8px"></div><button class="btn btn-ghost" id="gd-close">סגירה</button>';
    var s = openSheet(h);
    on(s, "[data-say]", "click", tap(function (e) { Sound.say(e.currentTarget.dataset.say); }));
    $("gd-close").onclick = tap(closeSheet);
  }

  /* ==========================================================================
     לשונית 2 — ליגה
     ========================================================================== */
  function renderLeague() {
    Game.ensureLeague();
    var L2 = Game.K.LEAGUES[S.league.idx];
    var list = Game.standings();
    var myRank = Game.rank();
    var h = '<div class="league-hero"><div class="league-badge">' + L2.ic + "</div>" +
      "<h2>ליגת " + esc(L2.name) + "</h2>" +
      '<div class="muted" style="font-weight:700">' +
      (L2.up ? esc(L2.up + " המקומות הראשונים עולים לליגה הבאה") : "הליגה הגבוהה ביותר!") + "</div></div>";

    if (!S.league.joined) {
      h += '<div class="card center"><div style="font-size:44px">🔓</div>' +
        "<h3>הליגה עדיין נעולה</h3>" +
        '<p class="muted">סיימו שיעור אחד כדי להצטרף לתחרות השבועית מול 29 ילדים אחרים!</p></div>';
    }

    h += '<div class="card" style="padding:6px 4px">';
    list.forEach(function (p, i) {
      var cls = "lb-row" + (p.me ? " me" : "") + (i < 3 ? " p" + (i + 1) : "");
      if (L2.up && i === L2.up) h += '<div class="zone up">אזור העלייה 🔼</div>';
      if (L2.down && i === L2.down - 1) h += '<div class="zone dn">אזור הירידה 🔽</div>';
      h += '<div class="' + cls + '"><div class="lb-rank">' + (i + 1) + "</div>" +
        '<div class="lb-face">' + p.f + "</div>" +
        '<div class="lb-name">' + esc(p.n) + "</div>" +
        '<div class="lb-xp">' + p.xp + " נק׳</div></div>";
    });
    h += "</div>";
    h += '<div class="card center"><div class="muted" style="font-weight:700">אתם במקום ' +
      (myRank + 1) + " מתוך " + list.length + " · הליגה מתאפסת ביום ראשון</div></div>";
    $("tab-body").innerHTML = h;
  }

  /* ==========================================================================
     לשונית 3 — משימות יומיות
     ========================================================================== */
  function renderQuests() {
    Game.rollQuests();
    var goal = Game.goalXP(), got = Game.todayXP();
    var pct = Math.min(1, got / goal);
    var C = 2 * Math.PI * 32;

    var h = '<div class="card"><div class="row">' +
      '<div class="ring"><svg width="76" height="76" viewBox="0 0 76 76">' +
      '<circle cx="38" cy="38" r="32" fill="none" stroke="var(--line)" stroke-width="8"></circle>' +
      '<circle cx="38" cy="38" r="32" fill="none" stroke="var(--yellow)" stroke-width="8" stroke-linecap="round"' +
      ' stroke-dasharray="' + C + '" stroke-dashoffset="' + (C * (1 - pct)) + '"></circle></svg>' +
      '<div class="mid">' + (pct >= 1 ? "✅" : "⚡") + "</div></div>" +
      '<div class="grow"><div style="font-weight:800;font-size:18px">המטרה היומית</div>' +
      '<div class="muted" style="font-weight:700">' + got + " מתוך " + goal + " נקודות" +
      (pct >= 1 ? " — כל הכבוד! 🎉" : "") + "</div></div>" +
      '<button class="btn btn-ghost btn-sm" style="width:auto;padding:0 14px" id="q-goal">שינוי</button>' +
      "</div></div>";

    h += '<div class="section-title">משימות היום</div><div class="card">';
    S.quests.list.forEach(function (q, i) {
      var p = Game.questProgress(q);
      var done = p >= q.n;
      var claimed = S.quests.claimed.indexOf(i) >= 0;
      h += '<div class="quest' + (done ? " done" : "") + '">' +
        '<div class="ic">' + q.ic + "</div>" +
        '<div class="grow"><div style="font-weight:800">' + esc(q.text.replace("{n}", q.n)) + "</div>" +
        '<div class="qbar"><i style="width:' + (Math.min(1, p / q.n) * 100) + '%"></i>' +
        "<span>" + p + " / " + q.n + "</span></div></div>" +
        (done && !claimed
          ? '<button class="btn btn-yellow btn-sm" style="width:auto;padding:0 12px" data-claim="' + i + '">פתחו!</button>'
          : '<div class="ic">' + (claimed ? "✅" : ["🥉", "🥈", "🥇"][Math.min(i, 2)]) + "</div>") +
        "</div>";
    });
    h += "</div>";

    h += '<div class="section-title">ההישגים שלי</div><div class="card">';
    Game.BADGES.forEach(function (b) {
      var lv = Game.badgeLevel(b);
      var maxed = lv >= b.levels.length;
      var next = maxed ? b.levels[b.levels.length - 1] : b.levels[lv];
      var cur = Game.statFor(b.stat);
      h += '<div class="badge ' + (maxed ? "max" : lv > 0 ? "got" : "locked") + '">' +
        '<div class="medal">' + b.ic + "</div>" +
        '<div class="grow"><div style="font-weight:800">' + esc(b.name) +
        (lv > 0 ? ' <span class="chip">רמה ' + lv + "</span>" : "") + "</div>" +
        '<div class="muted" style="font-size:13px;font-weight:700">' + esc(b.desc) + "</div>" +
        '<div class="qbar"><i style="width:' + (Math.min(1, cur / next) * 100) + '%"></i>' +
        "<span>" + Math.min(cur, next) + " / " + next + "</span></div></div></div>";
    });
    h += "</div>";

    $("tab-body").innerHTML = h;
    $("q-goal").onclick = tap(sheetGoal);
    on($("tab-body"), "[data-claim]", "click", tap(function (e) {
      var g = Game.claimQuest(parseInt(e.currentTarget.dataset.claim, 10));
      if (g) {
        Sound.play("gem"); confetti(30);
        toastBig("🎁", "פתחתם ארגז!", "קיבלתם " + g + " יהלומים 💎");
        renderTop(); renderQuests();
      }
    }));
  }

  function sheetGoal() {
    var h = "<h2>המטרה היומית</h2><div class=\"lead\">כמה נקודות ללמוד כל יום?</div>" +
      Game.K.GOALS.map(function (g) {
        return '<button class="goal-opt' + (g.id === S.goal ? " on" : "") + '" data-g="' + g.id + '">' +
          '<span><span class="g-name">' + g.name + '</span><br><span class="g-xp" style="font-size:13px">' +
          g.sub + "</span></span><span class=\"g-xp\">" + g.xp + " נק׳</span></button>";
      }).join("") + '<div style="height:10px"></div><button class="btn" id="gl-ok">שמירה</button>';
    var s = openSheet(h);
    on(s, ".goal-opt", "click", tap(function (e) {
      s.querySelectorAll(".goal-opt").forEach(function (p) { p.classList.remove("on"); });
      e.currentTarget.classList.add("on");
      S.goal = e.currentTarget.dataset.g; Game.save();
    }));
    $("gl-ok").onclick = tap(function () { closeSheet(); renderQuests(); });
  }

  /* ==========================================================================
     לשונית 4 — חנות
     ========================================================================== */
  function renderShop() {
    var K = Game.K;
    var h = '<div class="card center"><div style="font-size:40px">💎</div>' +
      '<div style="font-weight:800;font-size:22px">' + S.gems + " יהלומים</div>" +
      '<div class="muted" style="font-weight:700">מרוויחים יהלומים בכל שיעור ובכל משימה</div></div>';

    h += '<div class="section-title">חנות</div><div class="card">';
    h += shopItem("❤️", "מילוי לבבות", "ממלא את כל הלבבות מיד",
      K.PRICE_HEART_REFILL, "hearts", S.hearts >= K.HEARTS_MAX || S.noPressure, "מלא");
    h += shopItem("🧊", "הקפאת רצף", "שומרת על הרצף ביום שבו לא הספקתם ללמוד (יש לכם " +
      S.freezes + ")", K.PRICE_FREEZE, "freeze", S.freezes >= K.FREEZE_MAX, "מלא");
    h += shopItem("🎉", "כובע מסיבה לטוקי", "טוקי חובש כובע חגיגי בכל המסכים",
      400, "outfit", !!S.outfit, "נרכש");
    h += "</div>";

    h += '<div class="section-title">תרגול חופשי</div>' +
      '<button class="card-row" data-pr="mistakes"><span class="ic">🔧</span>' +
      '<span class="grow"><span class="ttl">תיקון טעויות</span><span class="sub">' +
      S.mistakes.length + " מילים מחכות לתרגול</span></span><span class=\"ic\">‹</span></button>" +
      '<button class="card-row" data-pr="words"><span class="ic">📚</span>' +
      '<span class="grow"><span class="ttl">כל המילים</span><span class="sub">חזרה על מילים שלמדתם</span></span><span class="ic">‹</span></button>' +
      '<button class="card-row" data-pr="listen"><span class="ic">👂</span>' +
      '<span class="grow"><span class="ttl">אימון האזנה</span><span class="sub">מזהים מילים באוזן</span></span><span class="ic">‹</span></button>' +
      '<button class="card-row" data-pr="speak"><span class="ic">🎤</span>' +
      '<span class="grow"><span class="ttl">אימון דיבור</span><span class="sub">מבטאים נכון עם המיקרופון</span></span><span class="ic">‹</span></button>' +
      '<button class="card-row" data-pr="pairs"><span class="ic">👄</span>' +
      '<span class="grow"><span class="ttl">חדר כושר לצלילים</span><span class="sub">ship או sheep? הצלילים הקשים לדוברי עברית</span></span><span class="ic">‹</span></button>' +
      '<button class="card-row" data-pr="phonics"><span class="ic">🔤</span>' +
      '<span class="grow"><span class="ttl">אותיות וצלילים</span><span class="sub">לומדים לקרוא באנגלית</span></span><span class="ic">‹</span></button>';

    $("tab-body").innerHTML = h;
    on($("tab-body"), "[data-buy]", "click", tap(function (e) { buy(e.currentTarget.dataset.buy); }));
    on($("tab-body"), "[data-pr]", "click", tap(function (e) { startPractice(e.currentTarget.dataset.pr); }));
  }

  function shopItem(ic, ttl, sub, price, id, disabled, doneLabel) {
    return '<div class="shop-item"><div class="ic">' + ic + "</div>" +
      '<div class="grow"><div style="font-weight:800;font-size:17px">' + esc(ttl) + "</div>" +
      '<div class="muted" style="font-size:13px;font-weight:700">' + esc(sub) + "</div></div>" +
      (disabled
        ? '<span class="chip">' + esc(doneLabel || "מלא") + " ✓</span>"
        : '<button class="btn btn-blue btn-sm" style="width:auto;padding:0 14px" data-buy="' + id + '">' +
          "💎 " + price + "</button>") + "</div>";
  }

  function buy(what) {
    var K = Game.K;
    if (what === "hearts") {
      if (!Game.spend(K.PRICE_HEART_REFILL)) return notEnough();
      S.hearts = K.HEARTS_MAX; S.heartAt = 0; Game.save();
      Sound.play("levelup"); toastBig("❤️", "הלבבות מלאים!", "אפשר להמשיך ללמוד");
    } else if (what === "freeze") {
      if (!Game.spend(K.PRICE_FREEZE)) return notEnough();
      S.freezes++; Game.save();
      Sound.play("gem"); toastBig("🧊", "קיבלתם הקפאת רצף!", "הרצף שלכם מוגן ליום אחד");
    } else if (what === "outfit") {
      if (!Game.spend(400)) return notEnough();
      S.outfit = true; Game.save(); Mascot.setOutfit(true);
      Sound.play("complete"); toastBig("🎉", "טוקי קיבל כובע מסיבה!", "עכשיו הוא חוגג איתכם");
    }
    renderTop(); renderShop();
  }
  function notEnough() {
    toastBig("💎", "אין מספיק יהלומים", "סיימו עוד שיעורים כדי להרוויח יהלומים!");
  }

  /* ==========================================================================
     לשונית 5 — פרופיל
     ========================================================================== */
  function renderMe() {
    var words = Object.keys(S.wordsSeen).length;
    var lg = Game.K.LEAGUES[S.league.idx];
    var h = '<div class="center" style="padding-top:12px">' +
      '<div class="avatar-big">' + S.avatar + "</div>" +
      "<h2>" + esc(S.name || "אלוף") + "</h2>" +
      '<div class="muted" style="font-weight:700">לומד/ת אנגלית מאז ' + esc(S.created) + "</div></div>" +
      '<div style="height:18px"></div>';

    h += '<div class="grid2">' +
      mini("🔥", S.streak, "ימים ברצף") +
      mini("⚡", S.xp, "נקודות ניסיון") +
      mini(lg.ic, lg.name, "הליגה שלי") +
      mini("📚", words, "מילים שלמדתי") +
      "</div>";

    /* לוח הרצף — 14 הימים האחרונים */
    h += '<div class="section-title">הרצף שלי</div><div class="card">' +
      '<div style="display:flex;gap:5px;justify-content:space-between;direction:rtl">';
    for (var i = 13; i >= 0; i--) {
      var d = new Date(); d.setDate(d.getDate() - i);
      var key = Game.today(d);
      var did = !!S.days[key];
      var froze = S.freezeUsed.indexOf(key) >= 0;
      h += '<div style="text-align:center;flex:1">' +
        '<div style="font-size:10px;color:var(--ink-3);font-weight:800">' +
        ["א", "ב", "ג", "ד", "ה", "ו", "ש"][d.getDay()] + "</div>" +
        '<div style="width:100%;aspect-ratio:1;border-radius:50%;display:grid;place-items:center;font-size:14px;' +
        "background:" + (did ? "var(--orange)" : froze ? "var(--blue)" : "var(--soft)") + ';color:#fff">' +
        (did ? "🔥" : froze ? "🧊" : "") + "</div></div>";
    }
    h += "</div></div>";

    h += '<div class="section-title">הגדרות</div>' +
      toggleRow("sfx", "🔊", "צלילים במשחק") +
      toggleRow("speech", "🗣️", "הקראה קולית") +
      toggleRow("tlit", "🔤", "הצגת תעתיק בעברית") +
      toggleRow("dark", "🌙", "מצב לילה") +
      '<button class="card-row" id="me-parent"><span class="ic">👨‍👩‍👧</span>' +
      '<span class="grow"><span class="ttl">פינת ההורים</span>' +
      '<span class="sub">מצב ללא לחץ, איפוס והסבר על השיטה</span></span><span class="ic">‹</span></button>';

    $("tab-body").innerHTML = h;
    on($("tab-body"), "[data-tg]", "click", tap(function (e) {
      var k = e.currentTarget.dataset.tg;
      S.settings[k] = !S.settings[k];
      applySettings();
      Game.save();
      renderMe();
    }));
    $("me-parent").onclick = tap(parentZone);
  }
  function mini(ic, v, k) {
    return '<div class="mini"><span class="ic">' + ic + "</span><span>" +
      '<span class="v">' + esc(v) + '</span><br><span class="k">' + esc(k) + "</span></span></div>";
  }
  function toggleRow(key, ic, label) {
    return '<div class="card-row" data-tg="' + key + '"><span class="ic">' + ic + "</span>" +
      '<span class="grow"><span class="ttl">' + esc(label) + "</span></span>" +
      '<span class="switch' + (S.settings[key] ? " on" : "") + '"><i></i></span></div>';
  }

  function applySettings() {
    document.documentElement.setAttribute("data-theme", S.settings.dark ? "dark" : "light");
    Sound.setMuted(!S.settings.sfx);
    Sound.setSpeech(!!S.settings.speech);
    Mascot.setOutfit(!!S.outfit);
  }

  /* פינת ההורים — מוגנת בשאלה פשוטה שילד בן 5 לא יפתור */
  function parentZone() {
    var a = 3 + Math.floor(Math.random() * 6), b = 4 + Math.floor(Math.random() * 6);
    var h = "<h2>👨‍👩‍👧 פינת ההורים</h2>" +
      '<div class="lead">כדי להיכנס, פתרו: <b>' + a + " × " + b + " = ?</b></div>" +
      '<input class="txt" id="pz-a" inputmode="numeric" placeholder="התשובה">' +
      '<div style="height:12px"></div><button class="btn" id="pz-go">כניסה</button>' +
      '<div style="height:8px"></div><button class="btn btn-flat" id="pz-x">ביטול</button>';
    var s = openSheet(h, true);
    $("pz-x").onclick = tap(closeSheet);
    $("pz-go").onclick = tap(function () {
      if (parseInt($("pz-a").value, 10) === a * b) parentZoneReal();
      else { $("pz-a").value = ""; $("pz-a").placeholder = "נסו שוב…"; }
    });
  }

  function parentZoneReal() {
    var h = "<h2>👨‍👩‍👧 פינת ההורים</h2>" +
      '<div class="card"><div style="font-weight:800;margin-bottom:6px">איך האפליקציה מלמדת?</div>' +
      '<p class="muted" style="font-weight:600;font-size:14px">כל ההוראות מוקראות בקול בעברית, כי בגיל 5 הילד עדיין לא קורא. ' +
      "המילים נלמדות קודם באוזן ובתמונה, ורק אחר כך בכתב. מסלול הפונטיקה (אותיות וצלילים) רץ במקביל, לאט יותר. " +
      "התרגול חוזר על מילים שנשכחו לפי מרווחי זמן, וטעויות נשמרות לתרגול נוסף.</p></div>" +

      '<div class="card"><div style="font-weight:800;margin-bottom:6px">צלילים שקשים לדוברי עברית</div>' +
      '<p class="muted" style="font-weight:600;font-size:14px">' +
      "TH (think), W מול V (west/vest), H שנבלעת (hat), ותנועות ארוכות מול קצרות (ship/sheep). " +
      "האפליקציה מתרגלת אותם בנפרד ב\"חדר כושר לצלילים\".</p></div>" +

      '<div class="card-row" data-tg2="noPressure"><span class="ic">🕊️</span>' +
      '<span class="grow"><span class="ttl">מצב ללא לחץ</span>' +
      '<span class="sub">בלי לבבות ובלי כישלון — טעות רק מלמדת ומנסים שוב</span></span>' +
      '<span class="switch' + (S.noPressure ? " on" : "") + '"><i></i></span></div>' +

      '<div class="card"><div style="font-weight:800;margin-bottom:6px">זמן מסך</div>' +
      '<p class="muted" style="font-weight:600;font-size:14px">מומלץ עד 15 דקות ביום בגיל הזה, ורצוי יחד עם מבוגר. ' +
      "כל שיעור אורך כ‑3 דקות. היום למדתם " + Math.round((S.counters.seconds || 0) / 60) + " דקות סה\"כ.</p></div>" +

      '<button class="btn btn-red" id="pz-reset">איפוס כל ההתקדמות</button>' +
      '<div style="height:8px"></div><button class="btn btn-flat" id="pz-close">סגירה</button>';
    var s = openSheet(h);
    on(s, "[data-tg2]", "click", tap(function () {
      S.noPressure = !S.noPressure;
      if (S.noPressure) S.hearts = Game.K.HEARTS_MAX;
      Game.save(); parentZoneReal(); renderTop();
    }));
    $("pz-close").onclick = tap(function () { closeSheet(); if (S.onboarded) goMain(); });
    $("pz-reset").onclick = tap(function () {
      if (confirm("לאפס הכול? כל ההתקדמות תימחק.")) {
        Game.reset(); location.reload();
      }
    });
  }

  /* ==========================================================================
     חלונות: לבבות, רצף, קורס
     ========================================================================== */
  function sheetHearts() {
    var full = S.hearts >= Game.K.HEARTS_MAX;
    var h = '<div class="center"><div style="font-size:70px">' + (S.noPressure ? "🕊️" : full ? "❤️" : "💔") + "</div>" +
      "<h2>" + (S.noPressure ? "מצב ללא לחץ" : S.hearts + " לבבות") + "</h2>" +
      '<div class="lead">' + (S.noPressure
        ? "אין לבבות ואין כישלון — אפשר ללמוד בלי הפסקה."
        : full ? "כל הלבבות מלאים, אפשר ללמוד!"
        : "לב חדש בעוד " + (Game.heartTimer() || "רגע")) + "</div></div>";
    if (!S.noPressure && !full) {
      h += '<button class="btn btn-blue" id="hp-buy">💎 ' + Game.K.PRICE_HEART_REFILL + " — למלא הכול</button>" +
        '<div style="height:10px"></div>' +
        '<button class="btn btn-ghost" id="hp-practice">🔧 תרגול — מרוויחים לב</button>';
    }
    h += '<div style="height:10px"></div><button class="btn btn-flat" id="hp-x">סגירה</button>';
    openSheet(h, true);
    $("hp-x").onclick = tap(closeSheet);
    if ($("hp-buy")) $("hp-buy").onclick = tap(function () { closeSheet(); buy("hearts"); });
    if ($("hp-practice")) $("hp-practice").onclick = tap(function () { closeSheet(); startPractice("mistakes"); });
  }

  function sheetStreak() {
    var h = '<div class="center"><div class="flame-big">🔥</div>' +
      '<div class="streak-num">' + S.streak + "</div>" +
      "<h2>ימים ברצף</h2>" +
      '<div class="lead">השיא שלכם: ' + S.bestStreak + " ימים · הקפאות: " + S.freezes + " 🧊</div></div>";
    var next = Game.K.STREAK_MILES.filter(function (m) { return m > S.streak; })[0];
    if (next) {
      h += '<div class="card center"><div style="font-weight:800">היעד הבא: ' + next + " ימים 🏅</div>" +
        '<div class="muted" style="font-weight:700">עוד ' + (next - S.streak) + " ימים ומקבלים מתנה!</div></div>";
    }
    h += '<button class="btn btn-flat" id="st-x">סגירה</button>';
    openSheet(h, true);
    $("st-x").onclick = tap(closeSheet);
  }

  function sheetCourse() {
    var total = Curriculum.allWords().length;
    var known = Object.keys(S.wordsSeen).length;
    var h = '<div class="center"><div style="font-size:60px">🇬🇧</div><h2>אנגלית</h2>' +
      '<div class="lead">מעברית לאנגלית · רמת גן חובה</div></div>';
    Curriculum.SECTIONS.forEach(function (sec) {
      var done = sec.units.filter(unitDone).length;
      h += '<div class="card"><div class="row"><div class="grow">' +
        '<div style="font-weight:800">חלק ' + sec.n + " · " + esc(sec.name) + "</div>" +
        '<div class="muted" style="font-size:13px;font-weight:700">' + esc(sec.sub) + "</div>" +
        '<div class="qbar"><i style="width:' + (done / sec.units.length * 100) + '%"></i>' +
        "<span>" + done + " / " + sec.units.length + " יחידות</span></div></div></div></div>";
    });
    h += '<div class="card center"><div style="font-weight:800">' + known + " מתוך " + total + " מילים</div></div>" +
      '<button class="btn btn-flat" id="cr-x">סגירה</button>';
    openSheet(h);
    $("cr-x").onclick = tap(closeSheet);
  }

  function toastBig(ic, ttl, sub) {
    var h = '<div class="center"><div style="font-size:64px" class="burst">' + ic + "</div>" +
      "<h2>" + esc(ttl) + "</h2><div class=\"lead\">" + esc(sub) + "</div>" +
      '<button class="btn" id="tb-x">יופי!</button></div>';
    openSheet(h, true);
    $("tb-x").onclick = tap(closeSheet);
  }

  /* ==========================================================================
     מנוע השיעור
     ========================================================================== */
  var PRAISE = [
    ["נכון!", "יופי!", "כן!"],
    ["כל הכבוד!", "יפה מאוד!", "מצוין!"],
    ["מדהים!", "וואו!", "אלוף!"],
    ["פשוט מדהים!", "איזה יופי!", "מלך!"],
    ["אתם בוערים! 🔥", "אין עליכם!", "בלתי ניתנים לעצירה!"]
  ];
  function praise(combo) {
    var t = combo >= 10 ? 4 : combo >= 7 ? 3 : combo >= 5 ? 2 : combo >= 3 ? 1 : 0;
    return pick(PRAISE[t]);
  }

  /* --- בניית רשימת התרגילים לפי סוג הצומת --- */
  function buildChallenges(node) {
    var u = Curriculum.unit(node.unit);
    var words = u.words;
    var earlier = Curriculum.wordsUpTo(node.unit);
    var cs = [];

    function distract(w, n) {
      var pool = (earlier.length >= 8 ? earlier : Curriculum.allWords())
        .filter(function (x) { return x.en !== w.en && x.emoji !== w.emoji; });
      return sample(pool, n);
    }

    if (node.kind === "learn") {
      /* חמש מילים חדשות: כרטיס היכרות ואחריו בדיקה מיידית */
      var news = words.slice(node.lv * 5, node.lv * 5 + 5);
      if (news.length < 5) news = words.slice(0, 5);
      news.forEach(function (w) {
        cs.push({ t: "card", w: w });
        cs.push({ t: "pickImage", w: w, opts: shuffle([w].concat(distract(w, 3))) });
      });
    } else if (node.kind === "match") {
      cs.push({ t: "match", ws: sample(words, 5) });
      sample(words, 3).forEach(function (w) {
        cs.push({ t: "pickImage", w: w, opts: shuffle([w].concat(distract(w, 3))) });
      });
      sample(words, 2).forEach(function (w) {
        cs.push({ t: "pickHe", w: w, opts: shuffle([w].concat(distract(w, 2))) });
      });
    } else if (node.kind === "listen") {
      sample(words, 4).forEach(function (w) {
        cs.push({ t: "listenPick", w: w, opts: shuffle([w].concat(distract(w, 3))) });
      });
      sample(words, 2).forEach(function (w) {
        cs.push({ t: "listenSpell", w: w });
      });
      var mp = sample(Curriculum.MINIMAL_PAIRS, 2);
      mp.forEach(function (p) {
        var which = Math.random() < .5 ? "a" : "b";
        cs.push({ t: "minimal", pair: p, want: which });
      });
    } else if (node.kind === "speak") {
      sample(words, 3).forEach(function (w) { cs.push({ t: "speak", w: w }); });
      sample(words, 2).forEach(function (w) { cs.push({ t: "spell", w: w }); });
      u.phrases.forEach(function (p) { cs.push({ t: "bank", ph: p, unit: u }); });
    } else if (node.kind === "story") {
      cs.push({ t: "story", story: Curriculum.STORIES[node.unit] });
    } else if (node.kind === "trophy") {
      /* אתגר האלוף — סקירה של כל היחידה, מעורב */
      sample(words, 3).forEach(function (w) {
        cs.push({ t: "pickImage", w: w, opts: shuffle([w].concat(distract(w, 3))) });
      });
      sample(words, 2).forEach(function (w) {
        cs.push({ t: "listenPick", w: w, opts: shuffle([w].concat(distract(w, 3))) });
      });
      cs.push({ t: "match", ws: sample(words, 5) });
      sample(words, 2).forEach(function (w) { cs.push({ t: "spell", w: w }); });
      cs.push({ t: "bank", ph: pick(u.phrases), unit: u });
    }
    return cs;
  }

  /* --- תרגול חופשי --- */
  function startPractice(kind) {
    var cs = [], title = "תרגול";
    var known = Curriculum.allWords().filter(function (w) { return S.wordsSeen[w.en]; });
    if (!known.length) known = Curriculum.UNITS[0].words;

    function distract(w, n) {
      return sample(Curriculum.allWords().filter(function (x) { return x.en !== w.en; }), n);
    }

    if (kind === "mistakes") {
      title = "תיקון טעויות";
      var ms = S.mistakes.slice(0, 8).map(function (m) {
        return Curriculum.findWord(m.en) || m;
      });
      if (!ms.length) { toastBig("✨", "אין טעויות לתקן!", "כל הכבוד — הכול נכון עד עכשיו"); return; }
      ms.forEach(function (w) {
        cs.push({ t: "pickImage", w: w, opts: shuffle([w].concat(distract(w, 3))), fix: true });
      });
    } else if (kind === "words") {
      title = "חזרה על מילים";
      /* חזרה מרווחת — קודם המילים הכי "חלשות" */
      var weak = known.slice().sort(function (a, b) {
        return Game.wordStrength(a.en) - Game.wordStrength(b.en);
      }).slice(0, 8);
      weak.forEach(function (w, i) {
        cs.push(i % 2 === 0
          ? { t: "pickImage", w: w, opts: shuffle([w].concat(distract(w, 3))) }
          : { t: "pickHe", w: w, opts: shuffle([w].concat(distract(w, 2))) });
      });
    } else if (kind === "listen") {
      title = "אימון האזנה";
      sample(known, 8).forEach(function (w) {
        cs.push({ t: "listenPick", w: w, opts: shuffle([w].concat(distract(w, 3))) });
      });
    } else if (kind === "speak") {
      title = "אימון דיבור";
      if (!Sound.canListen()) {
        toastBig("🎤", "המיקרופון לא זמין", "נסו בדפדפן כרום או בטלפון");
        return;
      }
      sample(known, 6).forEach(function (w) { cs.push({ t: "speak", w: w }); });
    } else if (kind === "pairs") {
      title = "חדר כושר לצלילים";
      shuffle(Curriculum.MINIMAL_PAIRS).slice(0, 8).forEach(function (p) {
        cs.push({ t: "minimal", pair: p, want: Math.random() < .5 ? "a" : "b" });
      });
    } else if (kind === "phonics") {
      title = "אותיות וצלילים";
      var pset = pick(Curriculum.PHONICS);
      pset.sounds.forEach(function (s) { cs.push({ t: "letter", s: s, set: pset }); });
      pset.blend.forEach(function (b) { cs.push({ t: "blend", b: b, set: pset }); });
    }
    if (!cs.length) return;
    beginLesson({ id: "practice-" + kind, kind: "practice", title: title, levels: 1 }, cs, true);
  }

  function startNode(id) {
    var n = pathNodes().filter(function (x) { return x.id === id; })[0];
    if (!n || !n.open) return;
    if (!S.noPressure && S.hearts <= 0) { sheetHearts(); return; }
    var cs = buildChallenges(n);
    if (!cs.length) return;
    beginLesson(n, cs, false);
  }

  function beginLesson(node, challenges, isPractice) {
    L = {
      node: node,
      isPractice: isPractice,
      queue: challenges.slice(),
      retry: [],
      total: challenges.length,
      doneCount: 0,
      combo: 0, bestCombo: 0,
      wrong: 0, right: 0,
      answered: false, correct: false,
      started: Date.now(),
      cur: null,
      state: {},
      listenOff: false, speakOff: false
    };
    show("sc-lesson");
    nextChallenge();
  }

  function lessonProgress() {
    return L.total ? L.doneCount / L.total : 0;
  }

  function renderLessonChrome() {
    var bar = $("l-bar");
    var pct = lessonProgress() * 100;
    bar.style.width = pct + "%";
    bar.classList.toggle("has", pct > 3);
    $("l-hearts").innerHTML = S.noPressure
      ? '<span class="ic">🕊️</span>'
      : '<span class="ic">❤️</span>' + S.hearts;
  }

  function nextChallenge() {
    L.answered = false; L.correct = false; L.state = {};
    $("l-foot").className = "foot";
    $("l-foot-in").innerHTML = "";

    var c = L.queue.length ? L.queue.shift() : (L.retry.length ? L.retry.shift() : null);
    if (!c) { finishLesson(); return; }
    L.cur = c;
    renderLessonChrome();
    renderChallenge(c);
  }

  /* --- כותרת ההוראה. ההקראה עצמה נעשית ב‑instruct() כדי לשמור על סדר: קודם עברית, אחר כך אנגלית --- */
  function head(heInstruction) {
    return '<div class="q-title">' + esc(heInstruction) + "</div>";
  }
  /* מקריא את ההוראה בעברית ורק כשהיא מסתיימת את המילה באנגלית,
     כדי ששני הקולות לא ידרסו זה את זה. */
  function instruct(heText, enText) {
    setTimeout(function () {
      if (!enText) { Sound.sayHe(heText); return; }
      var went = false;
      var go = function () { if (went) return; went = true; Sound.say(enText); };
      Sound.sayHe(heText, go);
      setTimeout(go, 2600);   /* רשת ביטחון אם onend לא נורה */
    }, 200);
  }

  function speakerBtn(text, cls) {
    return '<button class="speaker ' + (cls || "") + '" data-play="' + esc(text) + '">🔊</button>';
  }
  function turtleBtn(text) {
    return '<button class="speaker turtle" data-slow="' + esc(text) + '">🐢</button>';
  }

  function renderChallenge(c) {
    var b = $("l-body");
    var h = "";

    /* ---------- כרטיס מילה חדשה ---------- */
    if (c.t === "card") {
      h += head("מילה חדשה — הקשיבו ותחזרו אחריי");
      h += '<div class="new-word"><div class="pic">' + c.w.emoji + "</div>" +
        '<div class="w">' + esc(c.w.en) + "</div>" +
        (S.settings.tlit ? '<div class="tl">' + esc(c.w.tlit) + "</div>" : "") +
        '<div class="he">' + esc(c.w.he) + "</div>" +
        '<div class="row" style="justify-content:center;gap:12px;margin-top:16px">' +
        speakerBtn(c.w.en) + turtleBtn(c.w.en) + "</div></div>";
      if (c.w.hard && Curriculum.TIPS[c.w.hard]) {
        var tip = Curriculum.TIPS[c.w.hard];
        h += '<div class="card" style="margin-top:14px"><div class="row">' +
          '<span style="font-size:30px">' + tip.ic + "</span><span class=\"grow\">" +
          '<b>' + esc(tip.t) + "</b><br><span class=\"muted\" style=\"font-size:14px;font-weight:600\">" +
          esc(tip.he) + "</span></span></div></div>";
      }
      b.innerHTML = h;
      Game.seeWord(c.w.en);
      instruct("מילה חדשה — הקשיבו ותחזרו אחריי", c.w.en);
      footerContinue("הבנתי!", function () { L.doneCount++; nextChallenge(); });
    }

    /* ---------- בחירת תמונה ---------- */
    else if (c.t === "pickImage") {
      var q = "מצאו את: " + c.w.he;
      h += head(q);
      h += '<div class="row" style="justify-content:center;margin-bottom:16px">' +
        speakerBtn(c.w.en, "huge") + "</div>";
      h += '<div class="opts-img">' + c.opts.map(function (o, i) {
        return '<button class="opt-img" data-o="' + esc(o.en) + '">' +
          '<span class="pic">' + o.emoji + "</span>" +
          '<span class="lbl">' + esc(o.en) + "</span></button>";
      }).join("") + "</div>";
      b.innerHTML = h;
      instruct(q, c.w.en);
      bindChoice(b, ".opt-img", "o", c.w.en, c.w);
    }

    /* ---------- שמעו ובחרו תמונה ---------- */
    else if (c.t === "listenPick") {
      h += head("מה שמעתם?");
      h += '<div class="row" style="justify-content:center;gap:12px;margin-bottom:18px">' +
        speakerBtn(c.w.en, "huge") + "</div>" +
        '<div class="row" style="justify-content:center;margin-bottom:16px">' + turtleBtn(c.w.en) + "</div>";
      h += '<div class="opts-img">' + c.opts.map(function (o) {
        return '<button class="opt-img" data-o="' + esc(o.en) + '">' +
          '<span class="pic">' + o.emoji + "</span></button>";
      }).join("") + "</div>";
      h += '<div style="height:14px"></div>' +
        '<button class="btn btn-flat" id="cant-listen">🔇 אי אפשר להקשיב עכשיו</button>';
      b.innerHTML = h;
      instruct("מה שמעתם?", c.w.en);
      bindChoice(b, ".opt-img", "o", c.w.en, c.w, true);
      $("cant-listen").onclick = tap(function () { skipChallenge(); });
    }

    /* ---------- בחירת התרגום לעברית ---------- */
    else if (c.t === "pickHe") {
      h += head("מה זה אומר?");
      h += '<div class="speech-row">' + Mascot.svg("happy", 74) +
        '<div class="speech">' + en(c.w.en) +
        (S.settings.tlit ? ' <span class="muted" style="font-size:15px">' + esc(c.w.tlit) + "</span>" : "") +
        "</div></div>" +
        '<div class="row" style="justify-content:center;margin-bottom:18px">' + speakerBtn(c.w.en) + "</div>";
      h += '<div class="opts-list">' + c.opts.map(function (o, i) {
        return '<button class="opt-row" data-o="' + esc(o.en) + '">' +
          '<span class="grow">' + o.emoji + " " + esc(o.he) + "</span></button>";
      }).join("") + "</div>";
      b.innerHTML = h;
      instruct("מה זה אומר?", c.w.en);
      bindChoice(b, ".opt-row", "o", c.w.en, c.w);
    }

    /* ---------- התאמת זוגות ---------- */
    else if (c.t === "match") {
      h += head("חברו כל מילה לתמונה שלה");
      instruct("חברו כל מילה לתמונה שלה");
      var left = shuffle(c.ws), right = shuffle(c.ws);
      h += '<div class="pairs" style="--rows:' + c.ws.length + '">';
      left.forEach(function (w) {
        h += '<button class="pair" data-side="l" data-k="' + esc(w.en) + '">' +
          '<span class="en" style="font-size:19px">' + esc(w.en) + "</span></button>";
      });
      right.forEach(function (w) {
        h += '<button class="pair" data-side="r" data-k="' + esc(w.en) + '">' +
          '<span class="big">' + w.emoji + "</span>" +
          '<span style="font-size:13px;color:var(--ink-2)">' + esc(w.he) + "</span></button>";
      });
      h += "</div>";
      b.innerHTML = h;
      bindMatch(b, c);
    }

    /* ---------- איות מאותיות ---------- */
    else if (c.t === "spell" || c.t === "listenSpell") {
      var listenOnly = c.t === "listenSpell";
      var spellQ = listenOnly ? "הקשיבו וכתבו את המילה" : "הרכיבו את המילה";
      h += head(spellQ);
      if (listenOnly) {
        h += '<div class="row" style="justify-content:center;gap:12px;margin-bottom:16px">' +
          speakerBtn(c.w.en, "huge") + "</div>";
      } else {
        h += '<div class="new-word" style="padding:16px"><div class="pic">' + c.w.emoji + "</div>" +
          '<div class="he">' + esc(c.w.he) + "</div>" +
          '<div class="row" style="justify-content:center;margin-top:10px">' + speakerBtn(c.w.en) + "</div></div>" +
          '<div style="height:18px"></div>';
      }
      var target = c.w.en.replace(/[^a-zA-Z]/g, "");
      var letters = shuffle(target.split("").concat(
        sample("abcdefghijklmnopqrstuvwxyz".split(""), Math.min(3, 8 - target.length))));
      h += '<div class="slots" id="sp-slots">' +
        target.split("").map(function () { return '<div class="slot"></div>'; }).join("") + "</div>";
      h += '<div class="letters" id="sp-letters">' + letters.map(function (l, i) {
        return '<button class="letter" data-l="' + l + '" data-i="' + i + '">' + l + "</button>";
      }).join("") + "</div>";
      b.innerHTML = h;
      instruct(spellQ, c.w.en);
      bindSpell(b, c, target);
    }

    /* ---------- בניית משפט מבנק מילים ---------- */
    else if (c.t === "bank") {
      h += head("הרכיבו את המשפט באנגלית");
      instruct("הרכיבו את המשפט באנגלית: " + c.ph.he);
      h += '<div class="speech-row">' + Mascot.svg("happy", 74) +
        '<div class="speech">' + esc(c.ph.he) + "</div></div>";
      var toks = c.ph.en.replace(/[.!?]/g, "").split(" ");
      var extra = sample(Curriculum.allWords().map(function (w) { return w.en; })
        .filter(function (x) { return toks.indexOf(x) < 0 && x.indexOf(" ") < 0; }), 2);
      var bankToks = shuffle(toks.concat(extra));
      h += '<div class="answer-lines"><div class="answer-line"><div class="answer-zone" id="bk-ans"></div></div></div>';
      h += '<div class="bank" id="bk-bank">' + bankToks.map(function (t, i) {
        return '<button class="tile" data-t="' + esc(t) + '" data-i="' + i + '">' + esc(t) + "</button>";
      }).join("") + "</div>";
      b.innerHTML = h;
      bindBank(b, c, toks);
    }

    /* ---------- דיבור ---------- */
    else if (c.t === "speak") {
      h += head("אמרו את המילה בקול");
      h += '<div class="new-word" style="padding:18px"><div class="pic">' + c.w.emoji + "</div>" +
        '<div class="w">' + esc(c.w.en) + "</div>" +
        (S.settings.tlit ? '<div class="tl">' + esc(c.w.tlit) + "</div>" : "") +
        '<div class="row" style="justify-content:center;gap:12px;margin-top:12px">' +
        speakerBtn(c.w.en) + turtleBtn(c.w.en) + "</div></div>";
      h += '<div style="height:18px"></div>' +
        '<button class="mic-btn" id="mic"><span class="ic">🎤</span><span id="mic-t">לחצו ודברו</span></button>' +
        '<div style="height:12px"></div>' +
        '<button class="btn btn-flat" id="cant-speak">🤫 אי אפשר לדבר עכשיו</button>';
      b.innerHTML = h;
      instruct("אמרו את המילה בקול", c.w.en);
      bindSpeak(b, c);
    }

    /* ---------- זוג מינימלי (חדר כושר לצלילים) ---------- */
    else if (c.t === "minimal") {
      var want = c.pair[c.want];
      var tip = Curriculum.TIPS[c.pair.tip];
      h += head("הקשיבו טוב — איזו מילה שמעתם?");
      h += '<div class="row" style="justify-content:center;gap:12px;margin-bottom:8px">' +
        speakerBtn(want.en, "huge") + "</div>" +
        '<div class="row" style="justify-content:center;margin-bottom:16px">' + turtleBtn(want.en) + "</div>";
      h += '<div class="opts-img">' + shuffle([c.pair.a, c.pair.b]).map(function (o) {
        return '<button class="opt-img" data-o="' + esc(o.en) + '">' +
          '<span class="pic">' + o.emoji + "</span>" +
          '<span class="lbl">' + esc(o.en) + "</span>" +
          '<span style="font-size:13px;color:var(--ink-2);font-weight:700">' + esc(o.he) + "</span></button>";
      }).join("") + "</div>";
      if (tip) {
        h += '<div class="card" style="margin-top:16px"><div class="row">' +
          '<span style="font-size:28px">' + tip.ic + "</span>" +
          '<span class="grow"><b>' + esc(tip.t) + "</b><br>" +
          '<span class="muted" style="font-size:13px;font-weight:600">' + esc(tip.he) + "</span></span></div></div>";
      }
      b.innerHTML = h;
      instruct("הקשיבו טוב — איזו מילה שמעתם?", want.en);
      bindChoice(b, ".opt-img", "o", want.en, { en: want.en, he: want.he, emoji: want.emoji });
    }

    /* ---------- אות וצליל ---------- */
    else if (c.t === "letter") {
      h += head("איזו אות עושה את הצליל הזה?");
      h += '<div class="new-word"><div class="w" style="font-size:78px">' + esc(c.s.l) + "</div>" +
        '<div class="tl">' + esc(c.s.sound) + " · " + esc(c.s.he) + "</div>" +
        '<div class="he">' + c.s.emoji + " " + en(c.s.word) + "</div>" +
        '<div class="row" style="justify-content:center;margin-top:14px">' + speakerBtn(c.s.word) + "</div></div>";
      var others = sample(c.set.sounds.filter(function (x) { return x.l !== c.s.l; }), 3);
      h += '<div style="height:18px"></div><div class="opts-img">' +
        shuffle([c.s].concat(others)).map(function (o) {
          return '<button class="opt-img" data-o="' + esc(o.l) + '">' +
            '<span class="lbl" style="font-size:38px">' + esc(o.l) + "</span></button>";
        }).join("") + "</div>";
      b.innerHTML = h;
      instruct("איזו אות עושה את הצליל הזה?", c.s.word);
      bindChoice(b, ".opt-img", "o", c.s.l, { en: c.s.word, he: c.s.he, emoji: c.s.emoji });
    }

    /* ---------- הרכבת צלילים למילה ---------- */
    else if (c.t === "blend") {
      h += head("חברו את הצלילים — איזו מילה יוצאת?");
      h += '<div class="letters" style="margin-bottom:18px">' +
        c.b.w.split("").map(function (l) {
          return '<button class="letter" data-play="' + l + '">' + l + "</button>";
        }).join("") + "</div>" +
        '<div class="row" style="justify-content:center;margin-bottom:18px">' + speakerBtn(c.b.w, "huge") + "</div>";
      var opts = shuffle([c.b].concat(sample(c.set.blend.filter(function (x) { return x.w !== c.b.w; }), 2)));
      h += '<div class="opts-img">' + opts.map(function (o) {
        return '<button class="opt-img" data-o="' + esc(o.w) + '">' +
          '<span class="pic">' + o.emoji + "</span>" +
          '<span class="lbl">' + esc(o.w) + "</span></button>";
      }).join("") + "</div>";
      b.innerHTML = h;
      instruct("חברו את הצלילים — איזו מילה יוצאת?", c.b.w);
      bindChoice(b, ".opt-img", "o", c.b.w, { en: c.b.w, he: c.b.he, emoji: c.b.emoji });
    }

    /* ---------- סיפור ---------- */
    else if (c.t === "story") {
      renderStory(c.story);
      return;
    }

    /* מאזינים משותפים לכל כפתורי ההשמעה */
    bindPlayers(b);
  }

  function bindPlayers(b) {
    on(b, "[data-play]", "click", function (e) {
      e.stopPropagation();
      var t = e.currentTarget.dataset.play;
      e.currentTarget.classList.add("playing");
      Sound.say(t, false, function () { e.currentTarget.classList.remove("playing"); });
      setTimeout(function () { e.currentTarget.classList.remove("playing"); }, 1600);
    });
    on(b, "[data-slow]", "click", function (e) {
      e.stopPropagation();
      Sound.say(e.currentTarget.dataset.slow, true);
    });
  }

  /* --- בחירה מתוך אפשרויות --- */
  function bindChoice(b, sel, attr, correctKey, word, autoCheck) {
    on(b, sel, "click", tap(function (e) {
      if (L.answered) return;
      b.querySelectorAll(sel).forEach(function (x) { x.classList.remove("sel"); });
      e.currentTarget.classList.add("sel");
      L.state.pickEl = e.currentTarget;
      L.state.pick = e.currentTarget.dataset[attr];
      var w = word;
      if (w && w.en) Sound.say(L.state.pick === correctKey ? correctKey : L.state.pick);
      footerCheck(function () {
        grade(L.state.pick === correctKey, word, correctKey, function () {
          b.querySelectorAll(sel).forEach(function (x) {
            if (x.dataset[attr] === correctKey) x.classList.add("ok");
            else if (x === L.state.pickEl) x.classList.add("bad");
          });
        });
      });
    }));
    bindPlayers(b);
  }

  /* --- התאמת זוגות --- */
  function bindMatch(b, c) {
    var left = null, cleared = 0;
    on(b, ".pair", "click", tap(function (e) {
      var el = e.currentTarget;
      if (el.classList.contains("gone")) return;
      var side = el.dataset.side, k = el.dataset.k;
      if (side === "l") { Sound.say(k); }
      if (!left) {
        b.querySelectorAll('.pair[data-side="' + side + '"]').forEach(function (x) { x.classList.remove("sel"); });
        el.classList.add("sel");
        left = el;
        return;
      }
      if (left === el) { el.classList.remove("sel"); left = null; return; }
      if (left.dataset.side === side) {
        b.querySelectorAll(".pair").forEach(function (x) { x.classList.remove("sel"); });
        el.classList.add("sel"); left = el; return;
      }
      /* בדיקת התאמה */
      if (left.dataset.k === k) {
        left.classList.remove("sel"); left.classList.add("ok"); el.classList.add("ok");
        Sound.play("pop");
        var a = left, bb = el;
        setTimeout(function () { a.classList.add("gone"); bb.classList.add("gone"); }, 350);
        cleared++;
        Game.scoreWord(k, true);
        left = null;
        if (cleared >= c.ws.length) {
          /* התאמת זוגות מסתיימת לבד, בלי כפתור בדיקה */
          setTimeout(function () {
            L.combo++; L.bestCombo = Math.max(L.bestCombo, L.combo); L.right++;
            Sound.play("correct");
            L.doneCount++;
            nextChallenge();
          }, 600);
        }
      } else {
        var w1 = left, w2 = el;
        w1.classList.remove("sel");
        w1.classList.add("bad", "shake"); w2.classList.add("bad", "shake");
        Sound.play("wrong"); Sound.vibrate(60);
        Game.scoreWord(left.dataset.k, false);
        setTimeout(function () {
          w1.classList.remove("bad", "shake"); w2.classList.remove("bad", "shake");
        }, 500);
        left = null;
        /* טעות בהתאמה לא עולה לב — רק לא מתקדמים */
      }
    }));
  }

  /* --- איות --- */
  function bindSpell(b, c, target) {
    var got = [];
    var slots = b.querySelectorAll(".slot");
    function redraw() {
      slots.forEach(function (s, i) {
        s.textContent = got[i] || "";
        s.classList.toggle("filled", !!got[i]);
      });
      if (got.length === target.length) {
        footerCheck(function () {
          var ans = got.join("");
          grade(ans.toLowerCase() === target.toLowerCase(), c.w, target);
        });
      } else {
        $("l-foot").classList.remove("up");
      }
    }
    on(b, "#sp-letters .letter", "click", tap(function (e) {
      if (L.answered) return;
      var el = e.currentTarget;
      if (el.classList.contains("used") || got.length >= target.length) return;
      el.classList.add("used");
      got.push(el.dataset.l);
      L.state.used = (L.state.used || []).concat([el]);
      redraw();
    }));
    on(b, "#sp-slots .slot", "click", tap(function () {
      if (L.answered || !got.length) return;
      got.pop();
      var last = L.state.used.pop();
      if (last) last.classList.remove("used");
      redraw();
    }));
    bindPlayers(b);
  }

  /* --- בנק מילים --- */
  function bindBank(b, c, toks) {
    var chosen = [];
    var ansBox = $("bk-ans");
    function redraw() {
      ansBox.innerHTML = chosen.map(function (t, i) {
        return '<button class="tile" data-rm="' + i + '">' + esc(t.txt) + "</button>";
      }).join("");
      on(ansBox, "[data-rm]", "click", tap(function (e) {
        if (L.answered) return;
        var i = parseInt(e.currentTarget.dataset.rm, 10);
        chosen[i].el.classList.remove("used");
        chosen.splice(i, 1);
        redraw();
      }));
      if (chosen.length) {
        footerCheck(function () {
          var ans = chosen.map(function (x) { return x.txt; }).join(" ");
          var want = toks.join(" ");
          grade(ans.toLowerCase() === want.toLowerCase(), { en: c.ph.en, he: c.ph.he, emoji: "💬" }, c.ph.en);
        });
      } else {
        $("l-foot").classList.remove("up");
      }
    }
    on(b, "#bk-bank .tile", "click", tap(function (e) {
      if (L.answered) return;
      var el = e.currentTarget;
      if (el.classList.contains("used")) return;
      el.classList.add("used");
      chosen.push({ txt: el.dataset.t, el: el });
      Sound.say(el.dataset.t);
      redraw();
    }));
  }

  /* --- דיבור --- */
  function bindSpeak(b, c) {
    var rec = null;
    $("cant-speak").onclick = tap(function () { skipChallenge(); });
    $("mic").onclick = tap(function () {
      if (L.answered) return;
      var btn = $("mic");
      if (rec) { try { rec.stop(); } catch (e) {} rec = null; return; }
      if (!Sound.canListen()) {
        $("mic-t").textContent = "המיקרופון לא נתמך — אפשר לדלג";
        return;
      }
      btn.classList.add("rec");
      $("mic-t").textContent = "מקשיב… דברו עכשיו!";
      rec = Sound.listen(c.w.en, function (heard) {
        btn.classList.remove("rec"); rec = null;
        var ok = Sound.matches(heard, c.w.en);
        if (ok) S.counters.spoken++;
        Game.save();
        $("mic-t").textContent = ok ? "מעולה!" : "כמעט! ננסה שוב?";
        grade(ok, c.w, c.w.en, null, true);
      }, function () {
        btn.classList.remove("rec"); rec = null;
        $("mic-t").textContent = "לא שמעתי… נסו שוב או דלגו";
      });
    });
    bindPlayers(b);
  }

  /* --- דילוג בלי עונש --- */
  function skipChallenge() {
    L.answered = true;
    L.doneCount++;
    L.combo = 0;
    nextChallenge();
  }

  /* ==========================================================================
     בדיקה, משוב ותור חוזר
     ========================================================================== */
  function footerCheck(fn) {
    var f = $("l-foot");
    f.className = "foot up";
    $("l-foot-in").innerHTML = '<button class="btn" id="f-check">בדיקה</button>';
    $("f-check").onclick = tap(fn);
  }
  function footerContinue(label, fn) {
    var f = $("l-foot");
    f.className = "foot up";
    $("l-foot-in").innerHTML = '<button class="btn" id="f-go">' + esc(label || "המשך") + "</button>";
    $("f-go").onclick = tap(fn);
  }

  /* הלב של המנוע: ניקוד, משוב, והחזרת התרגיל לתור אם טעו */
  function grade(ok, word, correctKey, paint, noHeart) {
    if (L.answered) return;
    L.answered = true; L.correct = ok;
    if (paint) paint();

    if (word && word.en) Game.scoreWord(word.en, ok);

    var f = $("l-foot");
    var msg, sub = "";

    if (ok) {
      L.right++; L.combo++; L.bestCombo = Math.max(L.bestCombo, L.combo);
      L.doneCount++;
      if (L.cur.fix) Game.clearMistake(word.en);
      Sound.play("correct"); Sound.vibrate(20);
      msg = praise(L.combo);
      if (L.combo >= 3) showCombo(L.combo);
      if (L.cur.t === "listenPick" || L.cur.t === "listenSpell" || L.cur.t === "minimal") S.counters.listen++;
      f.className = "foot up ok";
      $("l-foot-in").innerHTML =
        '<div class="foot-msg"><span class="ic">✓</span><span class="grow"><span class="t">' + esc(msg) + "</span>" +
        (word && word.en ? '<br><span class="s">' + en(word.en) + " = " + esc(word.he || "") + "</span>" : "") +
        "</span></div>" +
        '<button class="btn" id="f-next">המשך</button>';
    } else {
      L.wrong++; L.combo = 0;
      if (!noHeart && !S.noPressure) {
        Game.loseHeart();
        $("l-hearts").classList.add("shake");
        setTimeout(function () { $("l-hearts").classList.remove("shake"); }, 350);
      }
      Sound.play("wrong"); Sound.vibrate([40, 60, 40]);
      if (word && word.en) Game.addMistake(word);
      /* התרגיל חוזר בסוף — והמונה גדל, כך שהפס "נסוג" */
      L.retry.push(Object.assign({}, L.cur, { isRetry: true }));
      L.total++;
      f.className = "foot up bad";
      $("l-foot-in").innerHTML =
        '<div class="foot-msg"><span class="ic">✕</span><span class="grow"><span class="t">התשובה הנכונה:</span>' +
        '<br><span class="s">' + en(correctKey) + (word && word.he ? " — " + esc(word.he) : "") + "</span></span></div>" +
        '<button class="btn" id="f-next">הבנתי</button>';
    }
    renderLessonChrome();
    $("f-next").onclick = tap(function () {
      if (!S.noPressure && S.hearts <= 0) { outOfHearts(); return; }
      nextChallenge();
    });
    if (word && word.en && ok) setTimeout(function () { Sound.say(word.en); }, 200);
  }

  function showCombo(n) {
    var c = document.createElement("div");
    c.className = "combo-chip";
    c.textContent = "🔥 " + n + " ברצף";
    document.body.appendChild(c);
    setTimeout(function () { c.remove(); }, 1600);
  }

  function outOfHearts() {
    Sound.play("heartLost");
    var h = '<div class="center"><div style="font-size:74px">💔</div>' +
      "<h2>נגמרו הלבבות</h2>" +
      '<div class="lead">לב חדש בעוד ' + (Game.heartTimer() || "רגע") + "</div></div>" +
      '<button class="btn btn-blue" id="oh-buy">💎 ' + Game.K.PRICE_HEART_REFILL + " — למלא לבבות</button>" +
      '<div style="height:10px"></div>' +
      '<button class="btn btn-ghost" id="oh-free">🕊️ להמשיך במצב ללא לחץ</button>' +
      '<div style="height:10px"></div>' +
      '<button class="btn btn-flat" id="oh-quit">לצאת מהשיעור</button>';
    openSheet(h, true);
    $("oh-buy").onclick = tap(function () {
      if (Game.spend(Game.K.PRICE_HEART_REFILL)) {
        S.hearts = Game.K.HEARTS_MAX; S.heartAt = 0; Game.save();
        closeSheet(); renderLessonChrome(); nextChallenge();
      } else notEnough();
    });
    $("oh-free").onclick = tap(function () {
      S.noPressure = true; S.hearts = Game.K.HEARTS_MAX; Game.save();
      closeSheet(); renderLessonChrome(); nextChallenge();
    });
    $("oh-quit").onclick = tap(function () { closeSheet(); goMain("learn"); });
  }

  /* ==========================================================================
     סיפור
     ========================================================================== */
  function renderStory(st) {
    var b = $("l-body");
    var i = 0;
    function draw() {
      var h = '<div class="q-title">' + st.emoji + " " + esc(st.he) + "</div>";
      for (var k = 0; k <= i && k < st.lines.length; k++) {
        var ln = st.lines[k];
        h += '<div class="story-line"><div class="story-face">' + ln.who + "</div>" +
          '<div class="story-bub" data-play="' + esc(ln.en) + '">' +
          '<span class="en">' + esc(ln.en) + "</span>" +
          '<span class="he">' + esc(ln.he) + "</span></div></div>";
      }
      b.innerHTML = h;
      bindPlayers(b);
      window.scrollTo(0, document.body.scrollHeight);
      var line = st.lines[Math.min(i, st.lines.length - 1)];
      Sound.say(line.en);
      if (i < st.lines.length - 1) {
        footerContinue("הלאה", function () { i++; draw(); });
      } else {
        footerContinue("שאלה!", askStory);
      }
    }
    function askStory() {
      var q = st.q;
      var h = '<div class="q-title">' + esc(q.he) + "</div>" +
        '<div class="speech-row">' + Mascot.svg("think", 74) +
        '<div class="speech">' + en(q.en) + "</div></div>" +
        '<div class="opts-list">' + q.opts.map(function (o, idx) {
          return '<button class="opt-row" data-o="' + idx + '"><span class="grow en">' + esc(o) + "</span></button>";
        }).join("") + "</div>";
      b.innerHTML = h;
      Sound.sayHe(q.he);
      $("l-foot").classList.remove("up");
      on(b, ".opt-row", "click", tap(function (e) {
        if (L.answered) return;
        b.querySelectorAll(".opt-row").forEach(function (x) { x.classList.remove("sel"); });
        e.currentTarget.classList.add("sel");
        L.state.pick = e.currentTarget.dataset.o;
        footerCheck(function () {
          var ok = parseInt(L.state.pick, 10) === q.ans;
          b.querySelectorAll(".opt-row").forEach(function (x) {
            if (parseInt(x.dataset.o, 10) === q.ans) x.classList.add("ok");
            else if (x.classList.contains("sel")) x.classList.add("bad");
          });
          grade(ok, { en: q.opts[q.ans], he: "" }, q.opts[q.ans], null, true);
        });
      }));
      bindPlayers(b);
    }
    draw();
  }

  /* ==========================================================================
     סיום שיעור
     ========================================================================== */
  function finishLesson() {
    var secs = Math.round((Date.now() - L.started) / 1000);
    S.counters.seconds = (S.counters.seconds || 0) + secs;
    S.counters.minutes = Math.round(S.counters.seconds / 60);

    var K = Game.K;
    var base = L.node.kind === "trophy" ? K.XP_LEGEND
      : L.isPractice ? K.XP_PRACTICE
      : L.node.kind === "story" ? K.XP_STORY : K.XP_LESSON;
    var combo = Math.min(K.XP_COMBO_MAX, Math.floor(L.bestCombo / 2));
    var xp = base + combo;
    var perfect = L.wrong === 0;

    Game.addXP(xp);
    Game.addGems(K.GEM_LESSON + (perfect ? 3 : 0));
    S.counters.lessons++;
    if (perfect) S.counters.perfect++;
    var hr = new Date().getHours();
    if (hr < 9) S.counters.early++;
    if (hr >= 20) S.counters.night++;
    if (L.node.kind === "trophy") S.counters.legendary++;
    S.league.joined = true;

    var streakInfo = { newDay: false, milestone: 0, streak: S.streak };
    if (!L.isPractice) {
      streakInfo = Game.markDayDone();
      Game.completeNode(L.node.id, L.node.levels || 1);
    } else {
      streakInfo = Game.markDayDone();
    }
    var badges = Game.checkBadges();
    Game.save();

    Sound.play("complete");
    confetti(60);
    showDone(xp, combo, secs, perfect, streakInfo, badges);
  }

  function showDone(xp, combo, secs, perfect, streakInfo, badges) {
    var acc = L.right + L.wrong ? Math.round(L.right / (L.right + L.wrong) * 100) : 100;
    var h = '<div class="done-screen">' + Mascot.svg("cheer", 150) +
      '<div class="done-title">' + (perfect ? "מושלם! בלי אף טעות!" : "כל הכבוד!") + "</div>" +
      '<div class="muted" style="font-weight:700">' + esc(L.node.title || Curriculum.unit(L.node.unit) &&
        Curriculum.unit(L.node.unit).name || "תרגול") + "</div>" +
      '<div class="stats-row">' +
      '<div class="stat-box sb-xp"><div class="cap">ניקוד</div><div class="in"><div class="val">' + xp + "</div></div></div>" +
      '<div class="stat-box sb-time"><div class="cap">זמן</div><div class="in"><div class="val">' +
        Math.floor(secs / 60) + ":" + String(secs % 60).padStart(2, "0") + "</div></div></div>" +
      '<div class="stat-box sb-acc"><div class="cap">דיוק</div><div class="in"><div class="val">' + acc + "%</div></div></div>" +
      "</div>";
    if (combo > 0) {
      h += '<div class="chip" style="margin-top:16px">🔥 בונוס רצף: +' + combo + " נקודות</div>";
    }
    h += '<div style="height:26px"></div>' +
      '<div style="width:100%;max-width:420px"><button class="btn btn-lg" id="d-go">המשך</button></div></div>';
    $("sc-done").innerHTML = h;
    show("sc-done");

    /* שרשרת מסכי החגיגה: רצף → הישג → חזרה למסלול */
    var steps = [];
    if (streakInfo.newDay) steps.push(function (next) { showStreak(streakInfo, next); });
    (badges || []).forEach(function (g) {
      steps.push(function (next) { showBadge(g, next); });
    });
    function advance() {
      if (!steps.length) { goMain("learn"); return; }
      steps.shift()(advance);
    }
    $("d-go").onclick = tap(advance);
  }

  function showStreak(info, next) {
    Sound.play("streak");
    var h = '<div class="done-screen">' +
      '<div class="flame-big burst">🔥</div>' +
      '<div class="streak-num">' + info.streak + "</div>" +
      '<div class="done-title" style="color:var(--orange)">ימים ברצף!</div>' +
      '<div class="muted" style="font-weight:700;max-width:320px">' +
      (info.milestone ? "הגעתם לאבן דרך! קיבלתם מתנה 🎁" : "חזרו מחר כדי לשמור על הרצף") + "</div>" +
      '<div style="height:26px"></div>' +
      '<div style="width:100%;max-width:420px"><button class="btn btn-orange btn-lg" id="s-go">המשך</button></div></div>';
    $("sc-done").innerHTML = h;
    confetti(50);
    $("s-go").onclick = tap(next);
  }

  function showBadge(g, next) {
    Sound.play("levelup");
    var h = '<div class="done-screen">' +
      '<div style="font-size:96px" class="burst">' + g.badge.ic + "</div>" +
      '<div class="done-title">הישג חדש!</div>' +
      "<h2>" + esc(g.badge.name) + " · רמה " + g.level + "</h2>" +
      '<div class="muted" style="font-weight:700">' + esc(g.badge.desc) + " · +15 💎</div>" +
      '<div style="height:26px"></div>' +
      '<div style="width:100%;max-width:420px"><button class="btn btn-yellow btn-lg" id="b-go">מגניב!</button></div></div>';
    $("sc-done").innerHTML = h;
    confetti(40);
    $("b-go").onclick = tap(next);
  }

  /* ==========================================================================
     אתחול
     ========================================================================== */
  function init() {
    S = Game.load();
    applySettings();

    /* יציאה מהשיעור — עם אישור */
    $("l-quit").onclick = tap(function () {
      var h = '<div class="center">' + Mascot.svg("sad", 110) +
        "<h2>לצאת מהשיעור?</h2>" +
        '<div class="lead">ההתקדמות בשיעור הזה תיעלם</div></div>' +
        '<button class="btn btn-red" id="q-yes">כן, לצאת</button>' +
        '<div style="height:10px"></div>' +
        '<button class="btn btn-ghost" id="q-no">להמשיך ללמוד</button>';
      openSheet(h, true);
      $("q-yes").onclick = tap(function () { closeSheet(); Sound.stopSpeech(); goMain("learn"); });
      $("q-no").onclick = tap(closeSheet);
    });

    $("overlay").addEventListener("click", function (e) {
      if (e.target === $("overlay")) closeSheet();
    });

    /* פתיחת האודיו בנגיעה הראשונה (מדיניות דפדפנים) */
    document.addEventListener("pointerdown", function once() {
      Sound.unlock();
      document.removeEventListener("pointerdown", once);
    });

    /* רענון טיימר הלבבות */
    setInterval(function () {
      var before = S.hearts;
      Game.regenHearts();
      if (S.hearts !== before && $("sc-main").classList.contains("on")) renderTop();
    }, 20000);

    /* וו לבדיקות אוטומטיות — פעיל רק עם ?e2e בכתובת */
    if (/[?&]e2e/.test(location.search)) {
      window.__e2e = { cur: function () { return L && L.cur; } };
    }

    if (S.onboarded) goMain("learn");
    else renderOnboard(0);
  }

  return { init: init };
})();

document.addEventListener("DOMContentLoaded", App.init);
