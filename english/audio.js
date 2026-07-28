"use strict";
/* מנוע שמע:
   1) Speech (TTS) — הקראת מילים באנגלית והוראות בעברית. קריטי לילדים בני 5 שעדיין לא קוראים.
   2) SFX — כל הצלילים מסונתזים ב‑WebAudio, בלי קבצים, כדי שהאפליקציה תעבוד לגמרי אופליין.
   3) Mic — זיהוי דיבור לתרגילי הגייה (במכשירים שתומכים). */

var Sound = (function () {
  var ctx = null;
  var muted = false;
  var speechOn = true;

  function ac() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") { ctx.resume().catch(function () {}); }
    return ctx;
  }

  /* --- סינתזה --- */
  function tone(freq, start, dur, type, vol) {
    var a = ac(); if (!a || muted) return;
    var o = a.createOscillator();
    var g = a.createGain();
    o.type = type || "sine";
    o.frequency.setValueAtTime(freq, a.currentTime + start);
    g.gain.setValueAtTime(0.0001, a.currentTime + start);
    g.gain.exponentialRampToValueAtTime(vol || 0.22, a.currentTime + start + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + start + dur);
    o.connect(g); g.connect(a.destination);
    o.start(a.currentTime + start);
    o.stop(a.currentTime + start + dur + 0.03);
  }

  function slide(from, to, start, dur, type, vol) {
    var a = ac(); if (!a || muted) return;
    var o = a.createOscillator();
    var g = a.createGain();
    o.type = type || "sine";
    o.frequency.setValueAtTime(from, a.currentTime + start);
    o.frequency.exponentialRampToValueAtTime(to, a.currentTime + start + dur);
    g.gain.setValueAtTime(0.0001, a.currentTime + start);
    g.gain.exponentialRampToValueAtTime(vol || 0.2, a.currentTime + start + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + start + dur);
    o.connect(g); g.connect(a.destination);
    o.start(a.currentTime + start);
    o.stop(a.currentTime + start + dur + 0.03);
  }

  function noise(start, dur, vol) {
    var a = ac(); if (!a || muted) return;
    var len = Math.floor(a.sampleRate * dur);
    var buf = a.createBuffer(1, len, a.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) { d[i] = (Math.random() * 2 - 1) * (1 - i / len); }
    var s = a.createBufferSource(); s.buffer = buf;
    var g = a.createGain(); g.gain.value = vol || 0.15;
    var f = a.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 1200;
    s.connect(f); f.connect(g); g.connect(a.destination);
    s.start(a.currentTime + start);
  }

  var SFX = {
    tap:      function () { tone(660, 0, 0.06, "sine", 0.1); },
    select:   function () { tone(880, 0, 0.07, "triangle", 0.12); },
    correct:  function () { tone(659.25, 0, 0.1, "sine", 0.2); tone(783.99, 0.08, 0.1, "sine", 0.2); tone(1046.5, 0.16, 0.22, "sine", 0.22); },
    wrong:    function () { tone(196, 0, 0.16, "sawtooth", 0.14); tone(155.56, 0.1, 0.26, "sawtooth", 0.12); },
    complete: function () {
      var n = [523.25, 659.25, 783.99, 1046.5, 1318.5];
      n.forEach(function (f, i) { tone(f, i * 0.09, 0.3, "triangle", 0.2); });
      noise(0.45, 0.5, 0.08);
    },
    levelup:  function () {
      [392, 523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) { tone(f, i * 0.07, 0.4, "sine", 0.18); });
    },
    gem:      function () { tone(1318.5, 0, 0.08, "sine", 0.16); tone(1760, 0.06, 0.16, "sine", 0.14); },
    heartLost: function () { slide(440, 110, 0, 0.4, "sine", 0.18); },
    streak:   function () { [523.25, 587.33, 659.25, 698.46, 783.99, 880, 1046.5].forEach(function (f, i) { tone(f, i * 0.06, 0.25, "triangle", 0.16); }); },
    whoosh:   function () { noise(0, 0.25, 0.1); },
    pop:      function () { slide(300, 900, 0, 0.09, "sine", 0.16); }
  };

  function play(name) {
    if (muted) return;
    var f = SFX[name];
    if (f) { try { f(); } catch (e) {} }
  }

  /* --- הקראה --- */
  var voices = [];
  function loadVoices() {
    if (!window.speechSynthesis) return;
    voices = window.speechSynthesis.getVoices() || [];
  }
  if (window.speechSynthesis) {
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }

  function pickVoice(lang) {
    if (!voices.length) loadVoices();
    var pref = lang === "he" ? ["he-IL", "he"] : ["en-GB", "en-US", "en-AU", "en"];
    var i, j, v;
    /* עדיף קול נשי/ילדותי — ידידותי יותר לילדים */
    var nice = /female|woman|girl|samantha|karen|moira|tessa|serena|zira|google uk english female|carmit/i;
    for (i = 0; i < pref.length; i++) {
      for (j = 0; j < voices.length; j++) {
        v = voices[j];
        if (v.lang && v.lang.toLowerCase().indexOf(pref[i].toLowerCase()) === 0 && nice.test(v.name)) return v;
      }
    }
    for (i = 0; i < pref.length; i++) {
      for (j = 0; j < voices.length; j++) {
        v = voices[j];
        if (v.lang && v.lang.toLowerCase().indexOf(pref[i].toLowerCase()) === 0) return v;
      }
    }
    return null;
  }

  /* מדברים לאט לילדים; slow=true עוד יותר לאט (לחיצה ארוכה על הרמקול) */
  function speak(text, lang, slow, onEnd) {
    if (!speechOn || !window.speechSynthesis || !text) { if (onEnd) onEnd(); return; }
    try {
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = lang === "he" ? "he-IL" : "en-GB";
      var v = pickVoice(lang || "en");
      if (v) u.voice = v;
      u.rate = slow ? 0.6 : (lang === "he" ? 1.0 : 0.85);
      u.pitch = lang === "he" ? 1.05 : 1.15;
      u.volume = muted ? 0 : 1;
      if (onEnd) u.onend = onEnd;
      window.speechSynthesis.speak(u);
    } catch (e) { if (onEnd) onEnd(); }
  }

  function say(text, slow, onEnd) { speak(text, "en", slow, onEnd); }
  function sayHe(text, onEnd) { speak(text, "he", false, onEnd); }
  function stopSpeech() { try { window.speechSynthesis.cancel(); } catch (e) {} }

  /* --- מיקרופון --- */
  function canListen() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  function listen(expected, onResult, onError) {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { if (onError) onError("unsupported"); return null; }
    var r = new SR();
    r.lang = "en-GB";
    r.interimResults = false;
    r.maxAlternatives = 5;
    r.continuous = false;
    r.onresult = function (e) {
      var heard = [];
      for (var i = 0; i < e.results[0].length; i++) heard.push(e.results[0][i].transcript);
      onResult(heard);
    };
    r.onerror = function (e) { if (onError) onError(e.error); };
    try { r.start(); } catch (e) { if (onError) onError("start"); }
    return r;
  }

  /* התאמה סלחנית — ילד בן 5 לא יבטא מושלם */
  function matches(heardList, expected) {
    var norm = function (s) { return String(s).toLowerCase().replace(/[^a-z ]/g, "").replace(/\s+/g, " ").trim(); };
    var want = norm(expected);
    for (var i = 0; i < heardList.length; i++) {
      var got = norm(heardList[i]);
      if (!got) continue;
      if (got === want || got.indexOf(want) >= 0 || want.indexOf(got) >= 0) return true;
      if (levenshtein(got, want) <= Math.max(1, Math.floor(want.length * 0.34))) return true;
    }
    return false;
  }

  function levenshtein(a, b) {
    var m = a.length, n = b.length, i, j, prev = [], cur = [];
    if (!m) return n; if (!n) return m;
    for (j = 0; j <= n; j++) prev[j] = j;
    for (i = 1; i <= m; i++) {
      cur[0] = i;
      for (j = 1; j <= n; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
      prev = cur.slice();
    }
    return prev[n];
  }

  function vibrate(pattern) {
    if (navigator.vibrate) { try { navigator.vibrate(pattern); } catch (e) {} }
  }

  return {
    play: play,
    say: say,
    sayHe: sayHe,
    stopSpeech: stopSpeech,
    canListen: canListen,
    listen: listen,
    matches: matches,
    vibrate: vibrate,
    unlock: function () { ac(); },
    setMuted: function (v) { muted = !!v; if (muted) stopSpeech(); },
    setSpeech: function (v) { speechOn = !!v; },
    isMuted: function () { return muted; }
  };
})();
