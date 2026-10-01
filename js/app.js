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
  document.getElementById("score-ring").innerHTML = scoreRingSVG(result.overall);
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
  resultsEl.hidden = false;
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
