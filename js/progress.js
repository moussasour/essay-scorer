// EssayScorer — progress page logic (plain JavaScript)

var main = document.getElementById("main");
var esHistory = [];

try { esHistory = JSON.parse(localStorage.getItem("es_history") || "[]"); } catch (e) {}

if (esHistory.length === 0) {
  main.innerHTML =
    '<div class="empty-state"><span class="big">📈</span>' +
    '<h2>No essays yet</h2><p>Score your first essay and your progress will appear here.</p>' +
    '<a href="editor.html" class="btn">Start writing →</a></div>';
} else {
  var scores = esHistory.map(function (h) { return h.overall; });
  var avg = Math.round(scores.reduce(function (a, b) { return a + b; }, 0) / scores.length);
  var best = Math.max.apply(null, scores);
  var delta = scores.length > 1 ? scores[scores.length - 1] - scores[0] : 0;

  var title = document.createElement("h1");
  title.className = "page-title";
  title.textContent = "Your progress";
  var sub = document.createElement("p");
  sub.className = "page-sub";
  sub.textContent = esHistory.length + " essay" + (esHistory.length > 1 ? "s" : "") + " scored (saved in this browser).";
  main.appendChild(title);
  main.appendChild(sub);

  // ---- chart card ----
  var chartCard = document.createElement("div");
  chartCard.className = "chart-card";
  chartCard.innerHTML = "<h2>Overall score over time</h2>" +
    "<p class='sub'></p><div id='chart'></div>";
  chartCard.querySelector(".sub").textContent =
    "Average " + avg + " · Best " + best + " · Change " + (delta >= 0 ? "+" : "") + delta + " points since your first essay";
  chartCard.querySelector("#chart").innerHTML = lineChartSVG(scores);
  main.appendChild(chartCard);

  // ---- esHistory table ----
  var tableCard = document.createElement("div");
  tableCard.className = "chart-card";
  var head = document.createElement("div");
  head.style.cssText = "display:flex;justify-content:space-between;align-items:center";
  head.innerHTML = "<h2 style='margin:0'>History</h2>";
  var clearBtn = document.createElement("button");
  clearBtn.className = "apply-fix";
  clearBtn.textContent = "Clear esHistory";
  clearBtn.addEventListener("click", function () {
    if (confirm("Delete all saved essay esHistory? This cannot be undone.")) {
      localStorage.removeItem("es_history");
      location.reload();
    }
  });
  head.appendChild(clearBtn);
  tableCard.appendChild(head);

  var table = document.createElement("table");
  table.innerHTML = "<thead><tr><th>Date</th><th>Type</th><th>Words</th><th>CEFR</th><th>Score</th></tr></thead><tbody></tbody>";
  var tbody = table.querySelector("tbody");
  esHistory.slice().reverse().forEach(function (h) {
    var tone = h.overall >= 80 ? "good" : h.overall >= 60 ? "mid" : "low";
    var tr = document.createElement("tr");
    tr.innerHTML = "<td>" + new Date(h.date).toLocaleString() + "</td>" +
      "<td style='text-transform:capitalize'>" + h.type + "</td>" +
      "<td>" + h.words + "</td><td>" + h.cefr + "</td>" +
      "<td><span class='score-pill " + tone + "'>" + h.overall + "</span></td>";
    tbody.appendChild(tr);
  });
  tableCard.appendChild(table);
  main.appendChild(tableCard);
}

function lineChartSVG(points) {
  var W = 640, H = 220, pad = 34;
  function xs(i) { return pad + (i / Math.max(points.length - 1, 1)) * (W - pad * 2); }
  function ys(v) { return H - pad - (v / 100) * (H - pad * 2); }
  var path = points.map(function (p, i) {
    return (i === 0 ? "M" : "L") + xs(i).toFixed(1) + "," + ys(p).toFixed(1);
  }).join(" ");
  var grid = "";
  [0, 25, 50, 75, 100].forEach(function (g) {
    grid += "<line x1='" + pad + "' y1='" + ys(g) + "' x2='" + (W - pad) + "' y2='" + ys(g) +
      "' stroke='var(--border)' stroke-dasharray='3 4'/>" +
      "<text x='" + (pad - 6) + "' y='" + (ys(g) + 4) + "' text-anchor='end' font-size='11' fill='var(--muted)'>" + g + "</text>";
  });
  var dots = points.map(function (p, i) {
    return "<circle cx='" + xs(i).toFixed(1) + "' cy='" + ys(p).toFixed(1) + "' r='4' fill='var(--accent-2)'/>";
  }).join("");
  return '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;height:auto">' + grid +
    "<path d='" + path + "' fill='none' stroke='var(--accent)' stroke-width='2.5' stroke-linecap='round'/>" +
    dots + "</svg>";
}
