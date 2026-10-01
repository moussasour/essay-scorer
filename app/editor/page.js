"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const ESSAY_TYPES = [
  ["argumentative", "Argumentative"],
  ["expository", "Expository"],
  ["descriptive", "Descriptive"],
  ["narrative", "Narrative"],
  ["short", "Short response"],
];

function ScoreRing({ value }) {
  const r = 56;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value)) / 100;
  return (
    <svg className="score-ring" width="150" height="150" viewBox="0 0 150 150">
      <circle cx="75" cy="75" r={r} fill="none" stroke="var(--bg-soft)" strokeWidth="12" />
      <circle
        cx="75" cy="75" r={r} fill="none" stroke="url(#grad)" strokeWidth="12"
        strokeDasharray={`${c * pct} ${c}`} transform="rotate(-90 75 75)"
      />
      <defs>
        <linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--accent)" />
          <stop offset="100%" stopColor="var(--accent-2)" />
        </linearGradient>
      </defs>
      <text x="75" y="70" textAnchor="middle" className="score-value" fill="currentColor" fontSize="38" fontWeight="800">
        {value}
      </text>
      <text x="75" y="94" textAnchor="middle" fill="var(--muted)" fontSize="11" letterSpacing="1">
        / 100
      </text>
    </svg>
  );
}

function barTone(score) {
  return score >= 80 ? "good" : score >= 60 ? "warn" : "bad";
}

export default function Editor() {
  const [text, setText] = useState("");
  const [essayType, setEssayType] = useState("argumentative");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [resultsKey, setResultsKey] = useState(0);

  const words = (text.match(/[a-zA-Z]+/g) || []).length;

  async function evaluate() {
    if (text.trim().length < 40) {
      setError("Please write at least a few sentences (40+ characters) first.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, essayType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Scoring failed. Please try again.");
      setResult(data);
      setResultsKey((k) => k + 1);
      try {
        const h = JSON.parse(localStorage.getItem("es_history") || "[]");
        h.push({
          date: new Date().toISOString(),
          type: essayType,
          overall: data.overall,
          cefr: data.cefr,
          words: data.stats.words,
          subscores: Object.fromEntries(
            Object.entries(data.subscores).map(([k, v]) => [k, v?.score ?? null])
          ),
        });
        localStorage.setItem("es_history", JSON.stringify(h.slice(-200)));
      } catch (e) {}
      setTimeout(() => document.getElementById("results-anchor")?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch (e) {
      setError(e.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function applyFix(issue) {
    const rep = issue.replacements[0];
    if (!rep) return;
    const next = text.slice(0, issue.offset) + rep + text.slice(issue.offset + issue.length);
    setText(next);
    // Re-run evaluation with the corrected text.
    setLoading(true);
    fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: next, essayType }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data && data.overall !== undefined) setResult(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  return (
    <>
      <div className="editor-head">
        <div>
          <h1 className="page-title" style={{ margin: "24px 0 4px" }}>Essay editor</h1>
          <p className="page-sub">Write or paste your essay, then score it.</p>
        </div>
        <div className="editor-controls">
          <select value={essayType} onChange={(e) => setEssayType(e.target.value)} aria-label="Essay type">
            {ESSAY_TYPES.map(([v, label]) => (
              <option key={v} value={v}>{label}</option>
            ))}
          </select>
          <button className="btn" onClick={evaluate} disabled={loading || words === 0}>
            {loading ? "Scoring…" : "Score my essay"}
          </button>
        </div>
      </div>

      <div className="editor-layout">
        <div>
          <textarea
            className="essay"
            placeholder="Start typing your essay here…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={loading}
          />
          <div className="editor-foot">
            <span className="wordcount">{words} words</span>
            <Link href="/progress">View progress →</Link>
          </div>
        </div>

        {error && <div className="error-box">{error}</div>}
        {loading && (
          <div className="loading">
            <span className="spinner" /> Analysing grammar, vocabulary and cohesion…
          </div>
        )}

        {result && !loading && (
          <section id="results-anchor" key={resultsKey}>
            <div className="score-grid">
              <div className="score-card">
                <div className="score-label">Overall score</div>
                <ScoreRing value={result.overall} />
                <div className="cefr-badge">{result.cefr}</div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>
                  estimated level
                </div>
              </div>
              <div className="subscores">
                {Object.entries(result.subscores).map(([key, v]) =>
                  v ? (
                    <div className="subscore" key={key}>
                      <div className="subscore-top">
                        <b style={{ textTransform: "capitalize" }}>{key}</b>
                        <span>{v.score}/100</span>
                      </div>
                      <div className="bar">
                        <span className={barTone(v.score)} style={{ width: `${v.score}%` }} />
                      </div>
                      <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 6 }}>{v.detail}</div>
                    </div>
                  ) : null
                )}
                <div className="subscore" style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                  {[
                    ["Words", result.stats.words],
                    ["Sentences", result.stats.sentences],
                    ["Avg. sentence", result.stats.avgSentenceLength],
                    ["Linking devices", result.stats.linkingDevices],
                  ].map(([label, val]) => (
                    <div key={label}>
                      <div style={{ fontSize: 20, fontWeight: 700 }}>{val}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {result.notice && <div className="notice">{result.notice}</div>}

            {result.issues.length > 0 && (
              <div className="issues">
                {result.issues.map((issue) => (
                  <div className="issue" key={issue.id}>
                    <span className={`tag ${issue.category}`}>{issue.category}</span>
                    <div className="issue-body">
                      <div>
                        <span className="frag">{issue.fragment || "(empty)"}</span>
                      </div>
                      <div className="issue-text">{issue.message}</div>
                      {issue.replacements.length > 0 && (
                        <div className="issue-actions">
                          <button className="apply-fix" onClick={() => applyFix(issue)}>
                            Fix: “{issue.replacements[0]}”
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {result.issues.length === 0 && !result.grammarUnavailable && (
              <div className="notice" style={{ background: "color-mix(in srgb, var(--good) 12%, transparent)", borderColor: "color-mix(in srgb, var(--good) 40%, transparent)" }}>
                No language issues detected — clean writing! 🎉
              </div>
            )}
          </section>
        )}
      </div>
    </>
  );
}
