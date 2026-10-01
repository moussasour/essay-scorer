// EssayScorer — editor page logic (plain JavaScript)

var API_URL = "https://api.languagetool.org/v2/check";
var currentText = "";
var currentResult = null;

var essayEl = document.getElementById("essay");
var scoreBtn = document.getElementById("score-btn");
var wordcountEl = document.getElementById("wordcount");
var errorBox = document.getElementById("error-box");
var loadingEl = document.getElementById("loading");
var resultsEl = document.getElementById("results");

function wordCount(text) {
  return ((text.match(/[a-zA-Z]+/g)) || []).length;
}

essayEl.addEventListener("input", function () {
  currentText = essayEl.value;
  wordcountEl.textContent = wordCount(currentText) + " words";
});

scoreBtn.addEventListener("click", evaluate);

var EXAMPLES = [
  { type: "argumentative",
    text: "Social media have become an essential part of young people's daily routine. On the one hand, platforms like Instagram and TikTok allow students to stay connected, discover new ideas, and even learn languages through short videos. On the other hand, excessive scrolling has been linked to shorter attention spans, poor sleep, and anxiety among teenagers. Many educators therefore argue that schools should teach digital literacy instead of simply banning phones. In my opinion, the solution is not prohibition but education: if students understand how these platforms are designed to capture their attention, they can use them more consciously. Moreover, parents and teachers should model healthy habits themselves, because young people imitate what they see rather than what they are told. In conclusion, social media is neither good nor evil; it is a tool whose effects depend entirely on how we choose to use it." },
  { type: "descriptive",
    text: "The old library stood at the end of a narrow street, its wooden door heavy with decades of paint. Inside, the smell of paper and dust mixed with the faint sweetness of cheap tea served at the back desk. Tall shelves reached almost to the ceiling, and the afternoon light fell in dusty columns across the reading tables. An elderly librarian sat behind a mountain of uncatalogued books, stamping returns with a rhythm so steady it seemed like the heartbeat of the building. Students whispered in the corners, their pens scratching quietly against paper, while outside the noise of the market felt like another world." },
  { type: "expository",
    text: "Learning a foreign language is a long process that requires regular practice and clear goals. First of all, vocabulary grows fastest when words are met repeatedly in real contexts rather than memorised from lists. Secondly, speaking improves only when the learner accepts making mistakes in front of others, which is why classroom discussion matters so much. In addition, listening to podcasts and watching films in the target language trains the ear to recognise natural rhythm and intonation. Finally, motivation plays a decisive role: students who connect the language to their personal ambitions, such as studying abroad or finding a better job, progress noticeably faster than those who study only for examinations. Therefore, effective language learning combines daily contact with the language and a strong personal reason for mastering it." }
];
var exampleIndex = 0;
document.getElementById("example-btn").addEventListener("click", function () {
  var ex = EXAMPLES[exampleIndex % EXAMPLES.length];
  exampleIndex++;
  document.getElementById("essay-type").value = ex.type;
  essayEl.value = ex.text;
  currentText = ex.text;
  wordcountEl.textContent = wordCount(ex.text) + " words";
  hide(resultsEl);
  hide(errorBox);
});

async function evaluate() {
  var text = essayEl.value.trim();
  hide(errorBox);
  if (text.length < 40) {
    showError("Please write at least a few sentences (40+ characters) first.");
    return;
  }
  setLoading(true);
  try {
    var body = new URLSearchParams({ text: text, language: "en-US", level: "picky" });
    var res = await fetch(API_URL, { method: "POST", body: body });
    if (!res.ok) throw new Error("LanguageTool responded " + res.status);
    var data = await res.json();
    var result = analyzeEssay(text, {
      essayType: document.getElementById("essay-type").value,
      languageToolMatches: data.matches || []
    });
    currentResult = result;
    currentText = essayEl.value;
    renderResult(result);
    saveToHistory(result);
    resultsEl.scrollIntoView({ behavior: "smooth" });
  } catch (err) {
    showError("Could not reach the grammar service. Check your internet connection and try again. (" + err.message + ")");
  } finally {
    setLoading(false);
  }
}

function renderResult(result) {
  show(resultsEl);
  document.getElementById("score-ring").innerHTML = scoreRingSVG(0);
  animateRing(result.overall);
  var cefr = document.getElementById("cefr");
  cefr.textContent = result.cefr;
  cefr.hidden = false;

  var sub = document.getElementById("subscores");
  sub.innerHTML = "";
  Object.keys(result.subscores).forEach(function (key) {
    var v = result.subscores[key];
    if (!v) return;
    sub.appendChild(subscoreCard(key, v));
  });

  var statsRow = document.createElement("div");
  statsRow.className = "subscore";
  statsRow.style.padding = "16px 8px";
  var strip = document.createElement("div");
  strip.className = "stats-strip";
  [["Words", result.stats.words], ["Sentences", result.stats.sentences],
   ["Avg. sentence", result.stats.avgSentenceLength], ["Linking devices", result.stats.linkingDevices]]
    .forEach(function (pair) {
      var d = document.createElement("div");
      d.className = "stat";
      d.innerHTML = "<div class='num'>" + pair[1] + "</div><div class='lbl'>" + pair[0] + "</div>";
      strip.appendChild(d);
    });
  statsRow.appendChild(strip);
  sub.appendChild(statsRow);

  var issuesEl = document.getElementById("issues");
  issuesEl.innerHTML = "";
  var notice = document.getElementById("notice");
  if (result.issues.length === 0) {
    notice.textContent = "No language issues detected — clean writing! 🎉";
    notice.className = "notice good";
    show(notice);
  } else {
    hide(notice);
    var heading = document.createElement("h3");
    heading.className = "issues-title";
    heading.innerHTML = "The red pen's <em>notes</em> (" + result.issues.length + ")";
    issuesEl.appendChild(heading);
    result.issues.forEach(function (issue) { issuesEl.appendChild(issueRow(issue)); });
  }

  renderTips(result);

  var printWrap = document.getElementById("print-wrap");
  printWrap.innerHTML = "<button class='apply-fix' onclick='window.print()'>⎙ Print / save as PDF</button>";
  show(printWrap);
  resultsEl.hidden = false;
}

// Personalised advice based on the weakest dimension.
var TIPS = {
  grammar: "Most of your marks are grammatical. Revise subject–verb agreement and verb tenses, then read your essay aloud — your ear catches what your eye misses.",
  vocabulary: "Your word choice repeats itself. Replace common verbs with precise ones (get → obtain, big → substantial) and avoid reusing the same adjective in successive paragraphs.",
  cohesion: "Your ideas stand next to each other rather than connecting. Link them with devices like however, moreover, as a result — and vary sentence length so the prose breathes.",
  length: "Your essay needs more development. Expand each paragraph with one extra supporting idea or example, and aim for the full target range of your essay type."
};

function renderTips(result) {
  var wrap = document.getElementById("tips");
  if (!wrap) return;
  var entries = Object.keys(result.subscores)
    .map(function (k) { return [k, result.subscores[k]]; })
    .filter(function (p) { return p[1]; })
    .sort(function (a, b) { return a[1].score - b[1].score; });
  var weakest = entries[0];
  if (!weakest || weakest[1].score >= 90) {
    wrap.innerHTML = "";
    wrap.hidden = true;
    return;
  }
  wrap.innerHTML =
    "<h3 class='issues-title'>How to <em>improve</em></h3>" +
    "<div class='issue tip'><span class='tag'>" + weakest[0] + "</span>" +
    "<div class='issue-body'><div class='issue-text'>" + TIPS[weakest[0]] + "</div></div></div>";
  wrap.hidden = false;
}

function animateRing(target) {
  var el = document.querySelector("#score-ring text");
  var start = null, dur = 900;
  function step(ts) {
    if (!start) start = ts;
    var p = Math.min((ts - start) / dur, 1);
    var eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(target * eased);
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function scoreRingSVG(value) {
  var r = 56, c = 2 * Math.PI * r;
  var pct = Math.max(0, Math.min(100, value)) / 100;
  return '<svg width="150" height="150" viewBox="0 0 150 150" style="display:block;margin:0 auto">' +
    '<circle cx="75" cy="75" r="' + r + '" fill="none" stroke="var(--bg-soft)" stroke-width="12"/>' +
    '<circle cx="75" cy="75" r="' + r + '" fill="none" stroke="var(--red)" stroke-width="12" stroke-linecap="round"' +
    ' stroke-dasharray="' + (c * pct).toFixed(1) + ' ' + c.toFixed(1) + '" transform="rotate(-90 75 75)"/>' +
    '<text x="75" y="76" text-anchor="middle" font-size="38" font-weight="800" fill="currentColor">' + value + '</text>' +
    '<text x="75" y="98" text-anchor="middle" font-size="11" fill="var(--muted)">/ 100</text></svg>';
}

function subscoreCard(key, v) {
  var tone = v.score >= 80 ? "good" : v.score >= 60 ? "warn" : "bad";
  var div = document.createElement("div");
  div.className = "subscore";
  div.innerHTML =
    "<div class='subscore-top'><b style='text-transform:capitalize'>" + key + "</b><span class='val'>" + v.score + "/100</span></div>" +
    "<div class='bar'><span class='" + tone + "' style='width:0%'></span></div>" +
    "<div class='detail'></div>";
  div.querySelector(".detail").textContent = v.detail;
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      div.querySelector(".bar > span").style.width = v.score + "%";
    });
  });
  return div;
}

function issueRow(issue) {
  var div = document.createElement("div");
  div.className = "issue";
  var inner = "<span class='tag " + issue.category + "'>" + issue.category + "</span>" +
    "<div class='issue-body'><div><span class='frag'>" + escapeHTML(issue.fragment || "(empty)") + "</span></div>" +
    "<div class='issue-text'>" + escapeHTML(issue.message) + "</div>";
  if (issue.replacements.length > 0) {
    inner += "<div class='issue-actions'><button class='apply-fix'>Fix: \u201C" +
      escapeHTML(issue.replacements[0]) + "\u201D</button></div>";
  }
  inner += "</div>";
  div.innerHTML = inner;
  var btn = div.querySelector(".apply-fix");
  if (btn) btn.addEventListener("click", function () { applyFix(issue); });
  return div;
}

function applyFix(issue) {
  var rep = issue.replacements[0];
  if (!rep) return;
  var next = essayEl.value.slice(0, issue.offset) + rep + essayEl.value.slice(issue.offset + issue.length);
  essayEl.value = next;
  currentText = next;
  wordcountEl.textContent = wordCount(next) + " words";
  evaluate(); // re-run scoring with the corrected text
}

function saveToHistory(result) {
  try {
    var h = JSON.parse(localStorage.getItem("es_history") || "[]");
    h.push({
      date: new Date().toISOString(),
      type: document.getElementById("essay-type").value,
      overall: result.overall,
      cefr: result.cefr,
      words: result.stats.words,
      subscores: (function () {
        var o = {};
        Object.keys(result.subscores).forEach(function (k) { o[k] = result.subscores[k] ? result.subscores[k].score : null; });
        return o;
      })()
    });
    localStorage.setItem("es_history", JSON.stringify(h.slice(-200)));
  } catch (e) { /* storage unavailable — ignore */ }
}

function showError(msg) { errorBox.textContent = msg; show(errorBox); }
function setLoading(on) { loadingEl.hidden = !on; scoreBtn.disabled = on; if (on) hide(resultsEl); }
function show(el) { el.hidden = false; }
function hide(el) { el.hidden = true; }
function escapeHTML(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
