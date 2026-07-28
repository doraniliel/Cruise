"use strict";
/* ==========================================================================
   תוכנית הלימודים — 12 יחידות, 120 מילים, פונטיקה, משפטים וסיפורים.
   סדר הנושאים לפי תוכניות ESL לגיל 3–7, וסדר האותיות לפי Duolingo ABC
   (m,a,t,s,i,f,d,r → g,o,l,h,u,c,b,n → k,v,e,p,w,j,y,x → sh,ch,th).

   שדה tlit = תעתיק עברי מנוקד של ההגייה באנגלית, בשיטה "אות אחת = צליל אחד":
   פּ=p, פ=f, בּ=b, ב=v, ו=w, ת׳=th (think), ד׳=th (this), ה=h תמיד נשמעת.
   שדה hard = הקושי ההגייתי הידוע לדוברי עברית, לתרגול ממוקד.
   ========================================================================== */

var Curriculum = (function () {

  /* ---------- קשיי הגייה של דוברי עברית ---------- */
  var TIPS = {
    th: { ic: "👅", t: "הצליל TH", he: "מוציאים את קצה הלשון בין השיניים ונושפים. לא ט׳ ולא ס׳!" },
    w:  { ic: "💋", t: "הצליל W", he: "מעגלים את השפתיים כמו נשיקה — לא נוגעים בשיניים. W זה לא V!" },
    h:  { ic: "🌬️", t: "הצליל H", he: "נושפים אוויר חם על כף היד. באנגלית ה־H תמיד נשמעת." },
    r:  { ic: "🐯", t: "הצליל R", he: "מושכים את הלשון אחורה כמו נהמה של נמר, ומעגלים שפתיים." },
    v:  { ic: "🐝", t: "הצליל V", he: "השיניים העליונות נוגעות בשפה התחתונה ומזמזמות." },
    p:  { ic: "🎈", t: "הצליל P", he: "שפתיים סגורות ואז פיצוץ קטן של אוויר. לא F!" },
    ng: { ic: "🔔", t: "הצליל NG", he: "הצליל יוצא מהאף, כמו פעמון מתמשך בסוף המילה." },
    vowel: { ic: "👄", t: "תנועות ארוכות וקצרות", he: "באנגלית יש הבדל בין תנועה קצרה לארוכה: ship / sheep." },
    stress: { ic: "🥁", t: "הטעמה", he: "מוחאים כף על ההברה החזקה: ba-NA-na, WA-ter, AP-ple." },
    cluster: { ic: "🚂", t: "אשכולות עיצורים", he: "בסוף מילה מבטאים את כל העיצורים ברצף: socks, hands." }
  };

  /* ---------- 12 יחידות × 10 מילים ---------- */
  var UNITS = [
    {
      id: "u1", name: "שלום!", en: "Hello!", ic: "👋", color: "green",
      words: [
        { en: "hello", he: "שלום", tlit: "הֶלוֹ", emoji: "👋", hard: "h" },
        { en: "hi", he: "היי", tlit: "הַיי", emoji: "🙋", hard: "h" },
        { en: "bye", he: "להתראות", tlit: "בַּיי", emoji: "✌️" },
        { en: "yes", he: "כן", tlit: "יֶס", emoji: "✅" },
        { en: "no", he: "לא", tlit: "נוֹ", emoji: "❌" },
        { en: "please", he: "בבקשה", tlit: "פְּלִיז", emoji: "🥺", hard: "p" },
        { en: "thank you", he: "תודה", tlit: "תֶ׳נְק יוּ", emoji: "🙏", hard: "th" },
        { en: "sorry", he: "סליחה", tlit: "סוֹרִי", emoji: "😔", hard: "r" },
        { en: "good morning", he: "בוקר טוב", tlit: "גוּד מוֹרְנִינְג", emoji: "🌅" },
        { en: "my name is", he: "קוראים לי", tlit: "מַיי נֵיים אִיז", emoji: "🏷️" }
      ],
      phrases: [
        { en: "Hello! My name is Tuki.", he: "שלום! קוראים לי טוקי." },
        { en: "What is your name?", he: "איך קוראים לך?" },
        { en: "Thank you!", he: "תודה!" }
      ]
    },
    {
      id: "u2", name: "צבעים", en: "Colors", ic: "🎨", color: "blue",
      words: [
        { en: "red", he: "אדום", tlit: "רֶד", emoji: "🔴", hard: "r" },
        { en: "blue", he: "כחול", tlit: "בְּלוּ", emoji: "🔵" },
        { en: "green", he: "ירוק", tlit: "גְּרִין", emoji: "🟢" },
        { en: "yellow", he: "צהוב", tlit: "יֶלוֹ", emoji: "🟡" },
        { en: "orange", he: "כתום", tlit: "אוֹרֶנְג׳", emoji: "🟠" },
        { en: "purple", he: "סגול", tlit: "פֶּרְפְּל", emoji: "🟣", hard: "p" },
        { en: "pink", he: "ורוד", tlit: "פִּינְק", emoji: "🌸", hard: "p" },
        { en: "black", he: "שחור", tlit: "בְּלַאק", emoji: "⚫" },
        { en: "white", he: "לבן", tlit: "וַייט", emoji: "⚪", hard: "w" },
        { en: "brown", he: "חום", tlit: "בְּרַאוּן", emoji: "🟤" }
      ],
      phrases: [
        { en: "It is red.", he: "זה אדום." },
        { en: "What color is it?", he: "באיזה צבע זה?" },
        { en: "I like blue.", he: "אני אוהב כחול." }
      ]
    },
    {
      id: "u3", name: "מספרים", en: "Numbers", ic: "🔢", color: "purple",
      words: [
        { en: "one", he: "אחת", tlit: "וַואן", emoji: "1️⃣", hard: "w" },
        { en: "two", he: "שתיים", tlit: "טוּ", emoji: "2️⃣" },
        { en: "three", he: "שלוש", tlit: "תְ׳רִי", emoji: "3️⃣", hard: "th" },
        { en: "four", he: "ארבע", tlit: "פוֹר", emoji: "4️⃣" },
        { en: "five", he: "חמש", tlit: "פַייב", emoji: "5️⃣", hard: "v" },
        { en: "six", he: "שש", tlit: "סִיקְס", emoji: "6️⃣" },
        { en: "seven", he: "שבע", tlit: "סֶבֶן", emoji: "7️⃣", hard: "v" },
        { en: "eight", he: "שמונה", tlit: "אֵייט", emoji: "8️⃣" },
        { en: "nine", he: "תשע", tlit: "נַיין", emoji: "9️⃣" },
        { en: "ten", he: "עשר", tlit: "טֶן", emoji: "🔟" }
      ],
      phrases: [
        { en: "I am five.", he: "אני בן חמש." },
        { en: "How many?", he: "כמה?" },
        { en: "One, two, three!", he: "אחת, שתיים, שלוש!" }
      ]
    },
    {
      id: "u4", name: "משפחה", en: "Family", ic: "👨‍👩‍👧‍👦", color: "orange",
      words: [
        { en: "mom", he: "אמא", tlit: "מוֹם", emoji: "👩" },
        { en: "dad", he: "אבא", tlit: "דֶּד", emoji: "👨" },
        { en: "sister", he: "אחות", tlit: "סִיסְטֶר", emoji: "👧" },
        { en: "brother", he: "אח", tlit: "בְּרָאדֶ׳ר", emoji: "👦", hard: "th" },
        { en: "baby", he: "תינוק", tlit: "בֵּייבִּי", emoji: "👶" },
        { en: "grandma", he: "סבתא", tlit: "גְּרֶנְדְמָה", emoji: "👵" },
        { en: "grandpa", he: "סבא", tlit: "גְּרֶנְדְפָּה", emoji: "👴", hard: "p" },
        { en: "family", he: "משפחה", tlit: "פֶמִילִי", emoji: "👨‍👩‍👧‍👦" },
        { en: "boy", he: "ילד", tlit: "בּוֹי", emoji: "🧒" },
        { en: "girl", he: "ילדה", tlit: "גֶּרְל", emoji: "👱‍♀️", hard: "r" }
      ],
      phrases: [
        { en: "This is my mom.", he: "זאת אמא שלי." },
        { en: "I love my family.", he: "אני אוהב את המשפחה שלי." },
        { en: "I have a sister.", he: "יש לי אחות." }
      ]
    },
    {
      id: "u5", name: "חיות", en: "Animals", ic: "🐾", color: "green",
      words: [
        { en: "dog", he: "כלב", tlit: "דּוֹג", emoji: "🐶" },
        { en: "cat", he: "חתול", tlit: "קַט", emoji: "🐱", hard: "vowel" },
        { en: "bird", he: "ציפור", tlit: "בֶּרְד", emoji: "🐦", hard: "r" },
        { en: "fish", he: "דג", tlit: "פִישׁ", emoji: "🐟" },
        { en: "cow", he: "פרה", tlit: "קָאוּ", emoji: "🐮" },
        { en: "horse", he: "סוס", tlit: "הוֹרְס", emoji: "🐴", hard: "h" },
        { en: "sheep", he: "כבשה", tlit: "שִׁיפּ", emoji: "🐑", hard: "vowel" },
        { en: "duck", he: "ברווז", tlit: "דַּאק", emoji: "🦆" },
        { en: "lion", he: "אריה", tlit: "לַאיוֹן", emoji: "🦁" },
        { en: "monkey", he: "קוף", tlit: "מַאנְקִי", emoji: "🐵", hard: "stress" }
      ],
      phrases: [
        { en: "I see a dog.", he: "אני רואה כלב." },
        { en: "The cat is black.", he: "החתול שחור." },
        { en: "I like animals.", he: "אני אוהב חיות." }
      ]
    },
    {
      id: "u6", name: "אוכל", en: "Food", ic: "🍎", color: "red",
      words: [
        { en: "apple", he: "תפוח", tlit: "אֶפְּל", emoji: "🍎", hard: "stress" },
        { en: "banana", he: "בננה", tlit: "בֶּנֶנָה", emoji: "🍌", hard: "stress" },
        { en: "bread", he: "לחם", tlit: "בְּרֶד", emoji: "🍞", hard: "r" },
        { en: "milk", he: "חלב", tlit: "מִילְק", emoji: "🥛" },
        { en: "water", he: "מים", tlit: "ווֹטֶר", emoji: "💧", hard: "w" },
        { en: "egg", he: "ביצה", tlit: "אֶג", emoji: "🥚" },
        { en: "cheese", he: "גבינה", tlit: "צִ׳יז", emoji: "🧀" },
        { en: "cake", he: "עוגה", tlit: "קֵייק", emoji: "🍰" },
        { en: "rice", he: "אורז", tlit: "רַייס", emoji: "🍚", hard: "r" },
        { en: "ice cream", he: "גלידה", tlit: "אַייס קְרִים", emoji: "🍦" }
      ],
      phrases: [
        { en: "I am hungry.", he: "אני רעב." },
        { en: "I want water, please.", he: "אני רוצה מים, בבקשה." },
        { en: "I like ice cream.", he: "אני אוהב גלידה." }
      ]
    },
    {
      id: "u7", name: "הגוף שלי", en: "My Body", ic: "🧍", color: "blue",
      words: [
        { en: "head", he: "ראש", tlit: "הֶד", emoji: "👦", hard: "h" },
        { en: "hair", he: "שיער", tlit: "הֵאֶר", emoji: "💇", hard: "h" },
        { en: "eye", he: "עין", tlit: "אַיי", emoji: "👁️" },
        { en: "ear", he: "אוזן", tlit: "אִיר", emoji: "👂" },
        { en: "nose", he: "אף", tlit: "נוֹז", emoji: "👃" },
        { en: "mouth", he: "פה", tlit: "מַאוּת׳", emoji: "👄", hard: "th" },
        { en: "hand", he: "יד", tlit: "הֶנְד", emoji: "✋", hard: "h" },
        { en: "foot", he: "כף רגל", tlit: "פוּט", emoji: "🦶", hard: "vowel" },
        { en: "leg", he: "רגל", tlit: "לֶג", emoji: "🦵" },
        { en: "tummy", he: "בטן", tlit: "טַאמִי", emoji: "🫃" }
      ],
      phrases: [
        { en: "Touch your nose!", he: "תיגע באף!" },
        { en: "I have two eyes.", he: "יש לי שתי עיניים." },
        { en: "Wash your hands.", he: "תשטוף ידיים." }
      ]
    },
    {
      id: "u8", name: "בגדים", en: "Clothes", ic: "👕", color: "purple",
      words: [
        { en: "shirt", he: "חולצה", tlit: "שֶׁרְט", emoji: "👕", hard: "r" },
        { en: "pants", he: "מכנסיים", tlit: "פֶּנְטְס", emoji: "👖", hard: "cluster" },
        { en: "dress", he: "שמלה", tlit: "דְּרֶס", emoji: "👗" },
        { en: "socks", he: "גרביים", tlit: "סוֹקְס", emoji: "🧦", hard: "cluster" },
        { en: "shoes", he: "נעליים", tlit: "שׁוּז", emoji: "👟" },
        { en: "hat", he: "כובע", tlit: "הַט", emoji: "🧢", hard: "h" },
        { en: "coat", he: "מעיל", tlit: "קוֹט", emoji: "🧥" },
        { en: "shorts", he: "מכנסיים קצרים", tlit: "שׁוֹרְטְס", emoji: "🩳", hard: "cluster" },
        { en: "pajamas", he: "פיג׳מה", tlit: "פְּג׳ָמָס", emoji: "🛌", hard: "p" },
        { en: "boots", he: "מגפיים", tlit: "בּוּטְס", emoji: "🥾" }
      ],
      phrases: [
        { en: "I put on my shoes.", he: "אני נועל נעליים." },
        { en: "My shirt is blue.", he: "החולצה שלי כחולה." },
        { en: "Where is my hat?", he: "איפה הכובע שלי?" }
      ]
    },
    {
      id: "u9", name: "צעצועים", en: "Toys", ic: "🧸", color: "orange",
      words: [
        { en: "ball", he: "כדור", tlit: "בּוֹל", emoji: "⚽" },
        { en: "doll", he: "בובה", tlit: "דּוֹל", emoji: "🪆" },
        { en: "car", he: "מכונית", tlit: "קָאר", emoji: "🚗", hard: "r" },
        { en: "teddy bear", he: "דובון", tlit: "טֶדִי בֶּאֶר", emoji: "🧸" },
        { en: "blocks", he: "קוביות", tlit: "בְּלוֹקְס", emoji: "🧱", hard: "cluster" },
        { en: "kite", he: "עפיפון", tlit: "קַייט", emoji: "🪁" },
        { en: "bike", he: "אופניים", tlit: "בַּייק", emoji: "🚲" },
        { en: "balloon", he: "בלון", tlit: "בָּלוּן", emoji: "🎈", hard: "stress" },
        { en: "puzzle", he: "פאזל", tlit: "פַּאזְל", emoji: "🧩", hard: "p" },
        { en: "train", he: "רכבת", tlit: "טְרֵיין", emoji: "🚂", hard: "r" }
      ],
      phrases: [
        { en: "Let us play!", he: "בואו נשחק!" },
        { en: "I have a red ball.", he: "יש לי כדור אדום." },
        { en: "This is my teddy bear.", he: "זה הדובון שלי." }
      ]
    },
    {
      id: "u10", name: "בית וגן", en: "Home", ic: "🏠", color: "green",
      words: [
        { en: "house", he: "בית", tlit: "הַאוּס", emoji: "🏠", hard: "h" },
        { en: "door", he: "דלת", tlit: "דּוֹר", emoji: "🚪" },
        { en: "window", he: "חלון", tlit: "וִינְדוֹ", emoji: "🪟", hard: "w" },
        { en: "table", he: "שולחן", tlit: "טֵייבְּל", emoji: "🪑" },
        { en: "chair", he: "כיסא", tlit: "צֶ׳אֶר", emoji: "💺" },
        { en: "bed", he: "מיטה", tlit: "בֶּד", emoji: "🛏️", hard: "vowel" },
        { en: "book", he: "ספר", tlit: "בּוּק", emoji: "📖", hard: "vowel" },
        { en: "pencil", he: "עיפרון", tlit: "פֶּנְסִל", emoji: "✏️", hard: "p" },
        { en: "bag", he: "תיק", tlit: "בֶּג", emoji: "🎒" },
        { en: "school", he: "בית ספר", tlit: "סְקוּל", emoji: "🏫" }
      ],
      phrases: [
        { en: "I go to school.", he: "אני הולך לגן." },
        { en: "Open the door.", he: "תפתח את הדלת." },
        { en: "The book is on the table.", he: "הספר על השולחן." }
      ]
    },
    {
      id: "u11", name: "פעולות", en: "Actions", ic: "🏃", color: "blue",
      words: [
        { en: "go", he: "ללכת", tlit: "גּוֹ", emoji: "🚶" },
        { en: "run", he: "לרוץ", tlit: "רַאן", emoji: "🏃", hard: "r" },
        { en: "jump", he: "לקפוץ", tlit: "גַ׳אמְפּ", emoji: "🤸" },
        { en: "eat", he: "לאכול", tlit: "אִיט", emoji: "😋" },
        { en: "drink", he: "לשתות", tlit: "דְּרִינְק", emoji: "🥤", hard: "r" },
        { en: "sleep", he: "לישון", tlit: "סְלִיפּ", emoji: "😴", hard: "vowel" },
        { en: "sit", he: "לשבת", tlit: "סִט", emoji: "🧘", hard: "vowel" },
        { en: "stand up", he: "לקום", tlit: "סְטֶנְד אַפּ", emoji: "🧍" },
        { en: "play", he: "לשחק", tlit: "פְּלֵיי", emoji: "🤾", hard: "p" },
        { en: "look", he: "להסתכל", tlit: "לוּק", emoji: "👀" }
      ],
      phrases: [
        { en: "Sit down, please.", he: "שב בבקשה." },
        { en: "I can jump!", he: "אני יודע לקפוץ!" },
        { en: "Look at me!", he: "תסתכל עליי!" }
      ]
    },
    {
      id: "u12", name: "איך אני מרגיש", en: "Feelings", ic: "😊", color: "red",
      words: [
        { en: "happy", he: "שמח", tlit: "הֶפִּי", emoji: "😃", hard: "h" },
        { en: "sad", he: "עצוב", tlit: "סֶד", emoji: "😢" },
        { en: "big", he: "גדול", tlit: "בִּיג", emoji: "🐘" },
        { en: "small", he: "קטן", tlit: "סְמוֹל", emoji: "🐜" },
        { en: "hot", he: "חם", tlit: "הוֹט", emoji: "🔥", hard: "h" },
        { en: "cold", he: "קר", tlit: "קוֹלְד", emoji: "🧊" },
        { en: "hungry", he: "רעב", tlit: "הַאנְגְרִי", emoji: "🤤", hard: "h" },
        { en: "tired", he: "עייף", tlit: "טַאיֶרְד", emoji: "🥱" },
        { en: "good", he: "טוב", tlit: "גּוּד", emoji: "👍" },
        { en: "more", he: "עוד", tlit: "מוֹר", emoji: "➕", hard: "r" }
      ],
      phrases: [
        { en: "I am happy!", he: "אני שמח!" },
        { en: "How are you?", he: "מה שלומך?" },
        { en: "I am tired.", he: "אני עייף." }
      ]
    }
  ];

  /* ---------- מסלול הפונטיקה (אותיות וצלילים) ---------- */
  /* סדר האותיות לפי Duolingo ABC — מתחילים ב‑m כי אפשר למתוח אותה בהרכבת מילים */
  var PHONICS = [
    { id: "p1", name: "אותיות ראשונות", letters: ["m", "a", "t", "s"], color: "purple",
      sounds: [
        { l: "m", sound: "mmm", he: "מ", word: "mom", emoji: "👩" },
        { l: "a", sound: "aaa", he: "אַ", word: "apple", emoji: "🍎" },
        { l: "t", sound: "t", he: "ט", word: "ten", emoji: "🔟" },
        { l: "s", sound: "sss", he: "ס", word: "sun", emoji: "☀️" }
      ],
      blend: [
        { w: "mat", he: "שטיחון", emoji: "🟫" },
        { w: "sat", he: "ישב", emoji: "🪑" },
        { w: "am", he: "אני", emoji: "🙋" }
      ] },
    { id: "p2", name: "עוד אותיות", letters: ["i", "f", "d", "r"], color: "purple",
      sounds: [
        { l: "i", sound: "ih", he: "אִ", word: "in", emoji: "📥" },
        { l: "f", sound: "fff", he: "פ", word: "fish", emoji: "🐟" },
        { l: "d", sound: "d", he: "ד", word: "dog", emoji: "🐶" },
        { l: "r", sound: "rrr", he: "ר", word: "red", emoji: "🔴" }
      ],
      blend: [
        { w: "sit", he: "לשבת", emoji: "🧘" },
        { w: "fat", he: "שמן", emoji: "🐷" },
        { w: "rat", he: "עכברוש", emoji: "🐀" }
      ] },
    { id: "p3", name: "אותיות שכיחות", letters: ["g", "o", "l", "h"], color: "purple",
      sounds: [
        { l: "g", sound: "g", he: "ג", word: "go", emoji: "🚶" },
        { l: "o", sound: "ooh", he: "אוֹ", word: "orange", emoji: "🟠" },
        { l: "l", sound: "lll", he: "ל", word: "lion", emoji: "🦁" },
        { l: "h", sound: "hhh", he: "ה", word: "hat", emoji: "🧢" }
      ],
      blend: [
        { w: "hot", he: "חם", emoji: "🔥" },
        { w: "dog", he: "כלב", emoji: "🐶" },
        { w: "log", he: "בול עץ", emoji: "🪵" }
      ] },
    { id: "p4", name: "אותיות נוספות", letters: ["u", "c", "b", "n"], color: "purple",
      sounds: [
        { l: "u", sound: "uh", he: "אַ", word: "up", emoji: "⬆️" },
        { l: "c", sound: "k", he: "ק", word: "cat", emoji: "🐱" },
        { l: "b", sound: "b", he: "בּ", word: "ball", emoji: "⚽" },
        { l: "n", sound: "nnn", he: "נ", word: "nose", emoji: "👃" }
      ],
      blend: [
        { w: "cat", he: "חתול", emoji: "🐱" },
        { w: "bus", he: "אוטובוס", emoji: "🚌" },
        { w: "sun", he: "שמש", emoji: "☀️" }
      ] },
    { id: "p5", name: "צלילים מיוחדים", letters: ["sh", "ch", "th", "w"], color: "purple",
      sounds: [
        { l: "sh", sound: "shhh", he: "שׁ", word: "shoes", emoji: "👟" },
        { l: "ch", sound: "ch", he: "צ׳", word: "cheese", emoji: "🧀" },
        { l: "th", sound: "thhh", he: "ת׳", word: "three", emoji: "3️⃣", tip: "th" },
        { l: "w", sound: "wuh", he: "ו", word: "water", emoji: "💧", tip: "w" }
      ],
      blend: [
        { w: "ship", he: "אונייה", emoji: "🚢" },
        { w: "chip", he: "צ׳יפס", emoji: "🍟" },
        { w: "wet", he: "רטוב", emoji: "💦" }
      ] }
  ];

  /* ---------- זוגות מינימליים — "חדר הכושר לתנועות" ---------- */
  var MINIMAL_PAIRS = [
    { a: { en: "ship", he: "אונייה", emoji: "🚢" }, b: { en: "sheep", he: "כבשה", emoji: "🐑" }, tip: "vowel" },
    { a: { en: "bed", he: "מיטה", emoji: "🛏️" },   b: { en: "bad", he: "רע", emoji: "👎" },   tip: "vowel" },
    { a: { en: "cat", he: "חתול", emoji: "🐱" },   b: { en: "cut", he: "לחתוך", emoji: "✂️" }, tip: "vowel" },
    { a: { en: "book", he: "ספר", emoji: "📖" },   b: { en: "boot", he: "מגף", emoji: "🥾" },  tip: "vowel" },
    { a: { en: "west", he: "מערב", emoji: "🧭" },  b: { en: "vest", he: "אפודה", emoji: "🦺" }, tip: "w" },
    { a: { en: "wet", he: "רטוב", emoji: "💦" },   b: { en: "vet", he: "וטרינר", emoji: "🩺" }, tip: "w" },
    { a: { en: "hat", he: "כובע", emoji: "🧢" },   b: { en: "at", he: "ב־", emoji: "📍" },     tip: "h" },
    { a: { en: "three", he: "שלוש", emoji: "3️⃣" }, b: { en: "tree", he: "עץ", emoji: "🌳" },  tip: "th" },
    { a: { en: "pan", he: "מחבת", emoji: "🍳" },   b: { en: "fan", he: "מאוורר", emoji: "🌀" }, tip: "p" },
    { a: { en: "pin", he: "סיכה", emoji: "📌" },   b: { en: "fin", he: "סנפיר", emoji: "🐬" }, tip: "p" }
  ];

  /* ---------- מילות מראה (Dolch Pre-K) ---------- */
  var SIGHT_WORDS = [
    { en: "a", he: "־" }, { en: "and", he: "ו־" }, { en: "the", he: "ה־" }, { en: "I", he: "אני" },
    { en: "see", he: "רואה" }, { en: "is", he: "זה" }, { en: "go", he: "לך" }, { en: "look", he: "תסתכל" },
    { en: "have", he: "יש לי" }, { en: "one", he: "אחד" }, { en: "come", he: "בוא" }, { en: "to", he: "אל" },
    { en: "am", he: "אני" }, { en: "my", he: "שלי" }, { en: "we", he: "אנחנו" }, { en: "you", he: "אתה" },
    { en: "big", he: "גדול" }, { en: "little", he: "קטן" }, { en: "play", he: "לשחק" }, { en: "can", he: "יכול" },
    { en: "up", he: "למעלה" }, { en: "down", he: "למטה" }, { en: "help", he: "עזרה" }, { en: "here", he: "כאן" },
    { en: "in", he: "בתוך" }, { en: "it", he: "זה" }, { en: "me", he: "אותי" }, { en: "not", he: "לא" },
    { en: "run", he: "לרוץ" }, { en: "jump", he: "לקפוץ" }, { en: "funny", he: "מצחיק" }, { en: "where", he: "איפה" },
    { en: "yellow", he: "צהוב" }, { en: "blue", he: "כחול" }, { en: "red", he: "אדום" }, { en: "two", he: "שתיים" },
    { en: "three", he: "שלוש", }, { en: "make", he: "לעשות" }, { en: "said", he: "אמר" }, { en: "away", he: "רחוק" }
  ];

  /* ---------- סיפורים — שורה שורה, עם תרגום ושאלת הבנה ---------- */
  var STORIES = {
    u1: {
      title: "Tuki says hello", he: "טוקי אומר שלום", emoji: "👋",
      lines: [
        { who: "🦜", en: "Hello! My name is Tuki.", he: "שלום! קוראים לי טוקי." },
        { who: "🐱", en: "Hi Tuki! My name is Maya.", he: "היי טוקי! קוראים לי מיה." },
        { who: "🦜", en: "Good morning, Maya!", he: "בוקר טוב, מיה!" },
        { who: "🐱", en: "Good morning!", he: "בוקר טוב!" },
        { who: "🦜", en: "Bye bye, Maya!", he: "ביי ביי, מיה!" },
        { who: "🐱", en: "Bye Tuki! Thank you!", he: "ביי טוקי! תודה!" }
      ],
      q: { en: "What is the cat's name?", he: "איך קוראים לחתולה?", opts: ["Maya", "Tuki", "Ron"], ans: 0 }
    },
    u2: {
      title: "The red ball", he: "הכדור האדום", emoji: "🔴",
      lines: [
        { who: "🐶", en: "Look! A ball!", he: "תראו! כדור!" },
        { who: "🦜", en: "What color is it?", he: "באיזה צבע הוא?" },
        { who: "🐶", en: "It is red!", he: "הוא אדום!" },
        { who: "🐱", en: "I like red.", he: "אני אוהבת אדום." },
        { who: "🦜", en: "My hat is blue.", he: "הכובע שלי כחול." },
        { who: "🐶", en: "Red and blue! Nice!", he: "אדום וכחול! יפה!" }
      ],
      q: { en: "What color is the ball?", he: "באיזה צבע הכדור?", opts: ["blue", "red", "green"], ans: 1 }
    },
    u3: {
      title: "How many ducks?", he: "כמה ברווזים?", emoji: "🦆",
      lines: [
        { who: "🦜", en: "Look at the water!", he: "תסתכלו על המים!" },
        { who: "🐱", en: "I see ducks!", he: "אני רואה ברווזים!" },
        { who: "🦜", en: "How many?", he: "כמה?" },
        { who: "🐱", en: "One, two, three!", he: "אחת, שתיים, שלוש!" },
        { who: "🐶", en: "No! I see four ducks.", he: "לא! אני רואה ארבעה ברווזים." },
        { who: "🦜", en: "Yes! Four ducks!", he: "כן! ארבעה ברווזים!" }
      ],
      q: { en: "How many ducks?", he: "כמה ברווזים?", opts: ["three", "four", "ten"], ans: 1 }
    },
    u4: {
      title: "My family", he: "המשפחה שלי", emoji: "👨‍👩‍👧‍👦",
      lines: [
        { who: "🐱", en: "This is my mom.", he: "זאת אמא שלי." },
        { who: "🐱", en: "This is my dad.", he: "זה אבא שלי." },
        { who: "🦜", en: "Do you have a sister?", he: "יש לך אחות?" },
        { who: "🐱", en: "Yes! And a baby brother.", he: "כן! וגם אח תינוק." },
        { who: "🦜", en: "A big family!", he: "משפחה גדולה!" },
        { who: "🐱", en: "I love my family.", he: "אני אוהבת את המשפחה שלי." }
      ],
      q: { en: "Who is the baby?", he: "מי התינוק?", opts: ["her brother", "her mom", "her dad"], ans: 0 }
    },
    u5: {
      title: "The lion and the bird", he: "האריה והציפור", emoji: "🦁",
      lines: [
        { who: "🦁", en: "I am a big lion!", he: "אני אריה גדול!" },
        { who: "🐦", en: "I am a small bird.", he: "אני ציפור קטנה." },
        { who: "🦁", en: "I am hungry.", he: "אני רעב." },
        { who: "🐦", en: "Here is bread!", he: "הנה לחם!" },
        { who: "🦁", en: "Thank you, bird!", he: "תודה, ציפור!" },
        { who: "🐦", en: "We are friends.", he: "אנחנו חברים." }
      ],
      q: { en: "What did the bird give?", he: "מה הציפור נתנה?", opts: ["milk", "bread", "cake"], ans: 1 }
    },
    u6: {
      title: "I am hungry", he: "אני רעב", emoji: "🍎",
      lines: [
        { who: "🐶", en: "I am hungry!", he: "אני רעב!" },
        { who: "🦜", en: "Here is an apple.", he: "הנה תפוח." },
        { who: "🐶", en: "I want cake, please.", he: "אני רוצה עוגה, בבקשה." },
        { who: "🦜", en: "Apple is good for you.", he: "תפוח זה בריא." },
        { who: "🐶", en: "OK! And water, please.", he: "בסדר! וגם מים, בבקשה." },
        { who: "🦜", en: "Here you are!", he: "בבקשה!" }
      ],
      q: { en: "What does the dog eat?", he: "מה הכלב אוכל?", opts: ["cake", "an apple", "rice"], ans: 1 }
    },
    u7: {
      title: "Touch your nose", he: "תיגע באף", emoji: "👃",
      lines: [
        { who: "🦜", en: "Let us play a game!", he: "בואו נשחק משחק!" },
        { who: "🦜", en: "Touch your head!", he: "תיגעו בראש!" },
        { who: "🐱", en: "My head! Easy!", he: "הראש שלי! קל!" },
        { who: "🦜", en: "Touch your nose!", he: "תיגעו באף!" },
        { who: "🐶", en: "My nose! Ha ha!", he: "האף שלי! חה חה!" },
        { who: "🦜", en: "Now touch your feet!", he: "עכשיו תיגעו ברגליים!" }
      ],
      q: { en: "What do they touch first?", he: "במה נוגעים קודם?", opts: ["nose", "head", "hand"], ans: 1 }
    },
    u8: {
      title: "Where is my hat?", he: "איפה הכובע שלי?", emoji: "🧢",
      lines: [
        { who: "🐶", en: "Where is my hat?", he: "איפה הכובע שלי?" },
        { who: "🐱", en: "Is it on the bed?", he: "הוא על המיטה?" },
        { who: "🐶", en: "No. Not here.", he: "לא. לא כאן." },
        { who: "🦜", en: "Look! On your head!", he: "תראה! על הראש שלך!" },
        { who: "🐶", en: "Oh! Thank you!", he: "אוי! תודה!" },
        { who: "🐱", en: "Funny dog!", he: "כלב מצחיק!" }
      ],
      q: { en: "Where was the hat?", he: "איפה היה הכובע?", opts: ["on the bed", "on his head", "in the bag"], ans: 1 }
    },
    u9: {
      title: "Let us play!", he: "בואו נשחק!", emoji: "🎈",
      lines: [
        { who: "🐱", en: "I have a new ball.", he: "יש לי כדור חדש." },
        { who: "🐶", en: "I have a big kite!", he: "יש לי עפיפון גדול!" },
        { who: "🦜", en: "I have a red balloon.", he: "יש לי בלון אדום." },
        { who: "🐱", en: "Let us play together!", he: "בואו נשחק ביחד!" },
        { who: "🐶", en: "Run and jump!", he: "לרוץ ולקפוץ!" },
        { who: "🦜", en: "This is fun!", he: "זה כיף!" }
      ],
      q: { en: "What does Tuki have?", he: "מה יש לטוקי?", opts: ["a ball", "a balloon", "a kite"], ans: 1 }
    },
    u10: {
      title: "Going to school", he: "הולכים לגן", emoji: "🎒",
      lines: [
        { who: "👩", en: "Come! Time for school!", he: "בואי! זמן לגן!" },
        { who: "🐱", en: "Where is my bag?", he: "איפה התיק שלי?" },
        { who: "👩", en: "It is on the chair.", he: "הוא על הכיסא." },
        { who: "🐱", en: "I have my book!", he: "יש לי את הספר שלי!" },
        { who: "👩", en: "Open the door!", he: "תפתחי את הדלת!" },
        { who: "🐱", en: "Bye bye, house!", he: "ביי ביי, בית!" }
      ],
      q: { en: "Where is the bag?", he: "איפה התיק?", opts: ["on the bed", "on the chair", "on the table"], ans: 1 }
    },
    u11: {
      title: "Run, jump, sleep", he: "לרוץ, לקפוץ, לישון", emoji: "🏃",
      lines: [
        { who: "🐶", en: "I can run fast!", he: "אני יודע לרוץ מהר!" },
        { who: "🐱", en: "I can jump high!", he: "אני יודעת לקפוץ גבוה!" },
        { who: "🦜", en: "I can fly!", he: "אני יודע לעוף!" },
        { who: "🐶", en: "Now I am tired.", he: "עכשיו אני עייף." },
        { who: "🐱", en: "Let us eat and drink.", he: "בואו נאכל ונשתה." },
        { who: "🦜", en: "Then we sleep. Good night!", he: "ואז נישן. לילה טוב!" }
      ],
      q: { en: "What can Tuki do?", he: "מה טוקי יודע לעשות?", opts: ["run", "fly", "jump"], ans: 1 }
    },
    u12: {
      title: "How do you feel?", he: "איך אתה מרגיש?", emoji: "😊",
      lines: [
        { who: "🦜", en: "How are you today?", he: "מה שלומך היום?" },
        { who: "🐱", en: "I am happy!", he: "אני שמחה!" },
        { who: "🐶", en: "I am sad. I am hungry.", he: "אני עצוב. אני רעב." },
        { who: "🦜", en: "Here is food for you.", he: "הנה אוכל בשבילך." },
        { who: "🐶", en: "Now I am happy! Thank you!", he: "עכשיו אני שמח! תודה!" },
        { who: "🦜", en: "Good! We are all happy.", he: "יופי! כולנו שמחים." }
      ],
      q: { en: "Why is the dog sad?", he: "למה הכלב עצוב?", opts: ["he is tired", "he is hungry", "he is cold"], ans: 1 }
    }
  };

  /* ---------- בניית המסלול: כל יחידה = 5 צמתים + ארגז ---------- */
  /* ① ללמוד  ② להתאים  ③ להקשיב  ④ להגיד  ⑤ סיפור  🎁 ארגז */
  var NODE_KINDS = [
    { k: "learn",  ic: "📖", he: "מילים חדשות" },
    { k: "match",  ic: "⭐", he: "התאמה ובחירה" },
    { k: "listen", ic: "👂", he: "האזנה" },
    { k: "speak",  ic: "🎤", he: "אמרו בקול" },
    { k: "story",  ic: "📚", he: "סיפור" },
    { k: "trophy", ic: "🏆", he: "אתגר האלוף" }
  ];

  /* חלוקה לחלקים (Sections) — כמו בדואולינגו */
  var SECTIONS = [
    { id: "s1", n: 1, name: "מתחילים", sub: "היכרות ראשונה עם אנגלית", color: "green",  units: ["u1", "u2", "u3", "u4"] },
    { id: "s2", n: 2, name: "מגלים",  sub: "העולם סביבי באנגלית",     color: "blue",   units: ["u5", "u6", "u7", "u8"] },
    { id: "s3", n: 3, name: "אלופים", sub: "מדברים משפטים שלמים",     color: "purple", units: ["u9", "u10", "u11", "u12"] }
  ];

  function unit(id) {
    for (var i = 0; i < UNITS.length; i++) if (UNITS[i].id === id) return UNITS[i];
    return null;
  }
  function allWords() {
    var out = [];
    UNITS.forEach(function (u) { u.words.forEach(function (w) { out.push(Object.assign({ unit: u.id }, w)); }); });
    return out;
  }
  function wordsUpTo(unitId) {
    var out = [], stop = false;
    UNITS.forEach(function (u) {
      if (stop) return;
      u.words.forEach(function (w) { out.push(Object.assign({ unit: u.id }, w)); });
      if (u.id === unitId) stop = true;
    });
    return out;
  }
  function findWord(en) {
    var all = allWords();
    for (var i = 0; i < all.length; i++) if (all[i].en === en) return all[i];
    return null;
  }
  /* מספר הצמתים בכל יחידה */
  function nodesOf(u) {
    return NODE_KINDS.map(function (nk, i) {
      return { id: u.id + "-" + i, kind: nk.k, ic: nk.ic, he: nk.he, unit: u.id, i: i };
    });
  }

  return {
    UNITS: UNITS, SECTIONS: SECTIONS, PHONICS: PHONICS, STORIES: STORIES,
    MINIMAL_PAIRS: MINIMAL_PAIRS, SIGHT_WORDS: SIGHT_WORDS, TIPS: TIPS, NODE_KINDS: NODE_KINDS,
    unit: unit, allWords: allWords, wordsUpTo: wordsUpTo, findWord: findWord, nodesOf: nodesOf
  };
})();
