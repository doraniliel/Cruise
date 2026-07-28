"use strict";
/* טוקי — התוכי של האפליקציה.
   דמות מקורית, מצוירת ב‑SVG טהור כדי שתעבוד גם בלי אינטרנט ובכל גודל מסך.
   Mascot.svg(mood, size) מחזיר מחרוזת SVG. mood: happy|cheer|sad|sleep|wave|think|zen */

var Mascot = (function () {
  var C = {
    body: "#58CC02",
    bodyDark: "#4CAF00",
    belly: "#FFC800",
    bellyLight: "#FFDE5C",
    beak: "#FF9600",
    beakDark: "#E58200",
    wing: "#43B000",
    wingTip: "#1CB0F6",
    eye: "#FFFFFF",
    pupil: "#3C3C3C",
    cheek: "#FF8FA3",
    foot: "#FF9600"
  };

  function eyes(mood) {
    if (mood === "sleep") {
      return '<path d="M74 76q10 9 20 0" stroke="' + C.pupil + '" stroke-width="5" fill="none" stroke-linecap="round"/>' +
             '<path d="M106 76q10 9 20 0" stroke="' + C.pupil + '" stroke-width="5" fill="none" stroke-linecap="round"/>';
    }
    if (mood === "sad") {
      return '<circle cx="84" cy="80" r="13" fill="' + C.eye + '"/>' +
             '<circle cx="116" cy="80" r="13" fill="' + C.eye + '"/>' +
             '<circle cx="84" cy="84" r="7" fill="' + C.pupil + '"/>' +
             '<circle cx="116" cy="84" r="7" fill="' + C.pupil + '"/>' +
             '<path d="M70 64q14 -8 27 -1" stroke="' + C.pupil + '" stroke-width="5" fill="none" stroke-linecap="round"/>' +
             '<path d="M103 63q13 -7 27 1" stroke="' + C.pupil + '" stroke-width="5" fill="none" stroke-linecap="round"/>' +
             '<path d="M124 92q6 10 0 14t-6 -14z" fill="#1CB0F6" opacity=".85"/>';
    }
    if (mood === "think") {
      return '<circle cx="84" cy="80" r="13" fill="' + C.eye + '"/>' +
             '<circle cx="116" cy="80" r="13" fill="' + C.eye + '"/>' +
             '<circle cx="87" cy="78" r="7" fill="' + C.pupil + '"/>' +
             '<circle cx="119" cy="78" r="7" fill="' + C.pupil + '"/>' +
             '<path d="M70 60q14 6 26 2" stroke="' + C.pupil + '" stroke-width="5" fill="none" stroke-linecap="round"/>';
    }
    if (mood === "zen") {
      return '<path d="M74 78q10 -9 20 0" stroke="' + C.pupil + '" stroke-width="5" fill="none" stroke-linecap="round"/>' +
             '<path d="M106 78q10 -9 20 0" stroke="' + C.pupil + '" stroke-width="5" fill="none" stroke-linecap="round"/>';
    }
    /* happy / cheer / wave */
    return '<circle cx="84" cy="79" r="14" fill="' + C.eye + '"/>' +
           '<circle cx="116" cy="79" r="14" fill="' + C.eye + '"/>' +
           '<circle cx="86" cy="80" r="8" fill="' + C.pupil + '"/>' +
           '<circle cx="118" cy="80" r="8" fill="' + C.pupil + '"/>' +
           '<circle cx="89" cy="76" r="3" fill="#FFFFFF"/>' +
           '<circle cx="121" cy="76" r="3" fill="#FFFFFF"/>';
  }

  function beak(mood) {
    if (mood === "cheer" || mood === "wave") {
      /* מקור פתוח — שמחה */
      return '<path d="M100 92c-13 0-22 4-22 11 0 12 10 22 22 22s22-10 22-22c0-7-9-11-22-11z" fill="' + C.beak + '"/>' +
             '<path d="M100 92c-13 0-22 4-22 11 0 3 9 5 22 5s22-2 22-5c0-7-9-11-22-11z" fill="' + C.beakDark + '"/>';
    }
    if (mood === "sad") {
      return '<path d="M100 94c-11 0-19 5-19 12 0 6 8 10 19 10s19-4 19-10c0-7-8-12-19-12z" fill="' + C.beak + '"/>' +
             '<path d="M81 106h38" stroke="' + C.beakDark + '" stroke-width="3"/>';
    }
    return '<path d="M100 93c-12 0-20 5-20 12s8 13 20 13 20-6 20-13-8-12-20-12z" fill="' + C.beak + '"/>' +
           '<path d="M80 105q20 8 40 0" stroke="' + C.beakDark + '" stroke-width="3" fill="none" stroke-linecap="round"/>';
  }

  function wings(mood) {
    if (mood === "cheer") {
      /* כנפיים למעלה בחגיגה */
      return '<g fill="' + C.wing + '">' +
             '<path d="M56 132c-16-10-28-30-24-44 4-13 20-10 28 2 7 10 8 28 4 42z"/>' +
             '<path d="M144 132c16-10 28-30 24-44-4-13-20-10-28 2-7 10-8 28-4 42z"/>' +
             '</g>' +
             '<path d="M34 92c-6-6-10-14-8-19" stroke="' + C.wingTip + '" stroke-width="7" fill="none" stroke-linecap="round"/>' +
             '<path d="M166 92c6-6 10-14 8-19" stroke="' + C.wingTip + '" stroke-width="7" fill="none" stroke-linecap="round"/>';
    }
    if (mood === "wave") {
      return '<ellipse cx="52" cy="146" rx="15" ry="26" fill="' + C.wing + '" transform="rotate(-12 52 146)"/>' +
             '<path d="M46 168q6 6 13 4" stroke="' + C.wingTip + '" stroke-width="6" fill="none" stroke-linecap="round"/>' +
             '<path d="M150 128c16-8 27-26 24-39-3-12-19-10-26 1-7 10-4 26 2 38z" fill="' + C.wing + '"/>' +
             '<path d="M172 88c6-6 9-14 7-19" stroke="' + C.wingTip + '" stroke-width="7" fill="none" stroke-linecap="round"/>';
    }
    return '<ellipse cx="52" cy="146" rx="15" ry="26" fill="' + C.wing + '" transform="rotate(-12 52 146)"/>' +
           '<ellipse cx="148" cy="146" rx="15" ry="26" fill="' + C.wing + '" transform="rotate(12 148 146)"/>' +
           '<path d="M46 168q6 6 13 4" stroke="' + C.wingTip + '" stroke-width="6" fill="none" stroke-linecap="round"/>' +
           '<path d="M154 168q-6 6-13 4" stroke="' + C.wingTip + '" stroke-width="6" fill="none" stroke-linecap="round"/>';
  }

  function extras(mood) {
    if (mood === "sleep") {
      return '<g fill="#AFAFAF" font-family="system-ui" font-weight="700">' +
             '<text x="150" y="52" font-size="20">z</text>' +
             '<text x="166" y="34" font-size="26">Z</text>' +
             "</g>";
    }
    if (mood === "cheer") {
      return '<g fill="#FFC800">' +
             '<path d="M28 40l4 9 9 4-9 4-4 9-4-9-9-4 9-4z"/>' +
             '<path d="M176 52l3 7 7 3-7 3-3 7-3-7-7-3 7-3z"/>' +
             '<path d="M150 22l3 6 6 3-6 3-3 6-3-6-6-3 6-3z"/>' +
             "</g>";
    }
    return "";
  }

  var outfit = false;   /* כובע מסיבה שנקנה בחנות */

  function hat() {
    if (!outfit) return "";
    return '<g><path d="M100 6 66 44h68z" fill="#CE82FF"/>' +
      '<path d="M100 6 84 44h16z" fill="#FF6B6B" opacity=".8"/>' +
      '<circle cx="100" cy="4" r="8" fill="#FFC800"/>' +
      '<path d="M64 44h72" stroke="#9069CD" stroke-width="6" stroke-linecap="round"/></g>';
  }

  function svg(mood, size) {
    mood = mood || "happy";
    var s = size || 120;
    var bounce = mood === "cheer" ? ' class="tuki-bounce"' : "";
    return '<svg viewBox="0 0 200 200" width="' + s + '" height="' + s + '"' + bounce +
      ' role="img" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">' +
      extras(mood) +
      /* רגליים */
      '<path d="M84 178v10M116 178v10" stroke="' + C.foot + '" stroke-width="8" stroke-linecap="round"/>' +
      '<path d="M76 190h16M108 190h16" stroke="' + C.foot + '" stroke-width="8" stroke-linecap="round"/>' +
      /* גוף */
      '<ellipse cx="100" cy="140" rx="48" ry="46" fill="' + C.body + '"/>' +
      '<ellipse cx="100" cy="150" rx="31" ry="33" fill="' + C.belly + '"/>' +
      '<ellipse cx="100" cy="154" rx="22" ry="24" fill="' + C.bellyLight + '"/>' +
      wings(mood) +
      /* ציצית */
      '<path d="M100 22c-6-16 1-22 8-22 7 0 11 8 6 16l-6 12z" fill="' + C.beak + '"/>' +
      '<path d="M84 28c-13-11-13-24-5-27 7-3 14 4 13 13l-2 14z" fill="#FF6B6B"/>' +
      '<path d="M116 28c13-11 13-24 5-27-7-3-14 4-13 13l2 14z" fill="#1CB0F6"/>' +
      /* ראש */
      '<circle cx="100" cy="80" r="46" fill="' + C.body + '"/>' +
      '<ellipse cx="68" cy="100" rx="10" ry="7" fill="' + C.cheek + '"/>' +
      '<ellipse cx="132" cy="100" rx="10" ry="7" fill="' + C.cheek + '"/>' +
      eyes(mood) +
      beak(mood) +
      hat() +
      "</svg>";
  }

  return {
    svg: svg,
    colors: C,
    setOutfit: function (v) { outfit = !!v; }
  };
})();

if (typeof module !== "undefined") { module.exports = Mascot; }
