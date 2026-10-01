"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

function LineChart({ points }) {
  if (points.length === 0) return null;
  const W = 640, H = 220, pad = 34;
  const xs = (i) => pad + (i / Math.max(points.length - 1, 1)) * (W - pad * 2);
  const ys = (v) => H - pad - (v / 100) * (H - pad * 2);
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${xs(i).toFixed(1)},${ys(p).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }} role="img" aria-label="Score trend">
      {[0, 25, 50, 75, 100].map((g) => (
        <g key={g}>
          <line x1={pad} y1={ys(g)} x2={W - pad} y2={ys(g)} stroke="var(--border)" strokeDasharray="3 4" />
          <text x={pad - 6} y={ys(g) + 4} textAnchor="end" fontSize="11" fill="var(--muted)">{g}</text>
        </g>
      ))}
      <path d={path} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" />
      {points.map((p, i) => (
        <circle key={i} cx={xs(i)} cy={ys(p)} r="4" fill="var(--accent-2)" />
      ))}
    </svg>
  );
}

export default function Progress() {
  const [history, setHistory] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setHistory(JSON.parse(localStorage.getItem("es_history") || "[]"));
    } catch (e) {}
    setReady(true);
  }, []);

  function clearHistory() {
    if (!confirm("Delete all saved essay history? This cannot be undone.")) return;
    localStorage.removeItem("es_history");
    setHistory([]);
  }

  if (!ready) return null;

  if (history.length === 0) {
    return (
      <div className="empty-state">
        <span className="big">📈</span>
        <h2 className="page-title" style={{ marginTop: 0 }}>No essays yet</h2>
        <p>Score your first essay and your progress will appear here.</p>
        <Link href="/editor" className="btn">Start writing →</Link>
      </div>
    );
  }

  const scores = history.map((h) => h.overall);
  const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const best = Math.max(...scores);
  const delta = scores.length > 1 ? scores[scores.length - 1] - scores[0] : 0;

  return (
    <>
      <h1 className="page-title">Your progress</h1>
      <p className="page-sub">{history.length} essay{history.length > 1 ? "s" : ""} scored (saved in this browser).</p>

      <div className="chart-card">
        <h2>Overall score over time</h2>
        <p className="sub">Average {avg} · Best {best} · Change {delta >= 0 ? "+" : ""}{delta} points since your first essay</p>
        <LineChart points={scores} />
      </div>

      <div className="chart-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0 }}>History</h2>
          <button className="apply-fix" onClick={clearHistory}>Clear history</button>
        </div>
        <table className="history-table">
          <thead>
            <tr><th>Date</th><th>Type</th><th>Words</th><th>CEFR</th><th>Score</th></tr>
          </thead>
          <tbody>
            {history.slice().reverse().map((h, i) => (
              <tr key={i}>
                <td>{new Date(h.date).toLocaleString()}</td>
                <td style={{ textTransform: "capitalize" }}>{h.type}</td>
                <td>{h.words}</td>
                <td>{h.cefr}</td>
                <td>
                  <span className={`score-pill ${h.overall >= 80 ? "good" : h.overall >= 60 ? "mid" : "low"}`}>
                    {h.overall}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
