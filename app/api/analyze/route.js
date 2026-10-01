import { NextResponse } from "next/server";
import { analyzeEssay } from "@/lib/scoring";

export const runtime = "nodejs";
export const maxDuration = 30;

const LT_ENDPOINT = "https://api.languagetool.org/v2/check";

async function fetchLanguageTool(text) {
  const body = new URLSearchParams({
    text,
    language: "en-US",
    enabledOnly: "false",
    level: "picky",
  });
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch(LT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: ctrl.signal,
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`LanguageTool responded ${res.status}`);
    const data = await res.json();
    return data.matches || [];
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(request) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const text = (payload.text || "").trim();
  const essayType = payload.essayType || "argumentative";

  if (text.length < 40) {
    return NextResponse.json(
      { error: "Please write at least a few sentences (40+ characters) before scoring." },
      { status: 400 }
    );
  }
  if (text.length > 20000) {
    return NextResponse.json(
      { error: "Text too long — 20,000 characters max." },
      { status: 413 }
    );
  }

  let matches = [];
  let grammarUnavailable = false;
  try {
    matches = await fetchLanguageTool(text);
  } catch (err) {
    console.error("LanguageTool error:", err.message);
    grammarUnavailable = true;
  }

  const result = analyzeEssay(text, { essayType, languageToolMatches: matches });
  result.grammarUnavailable = grammarUnavailable;
  if (grammarUnavailable) {
    result.notice =
      "Grammar analysis is temporarily unavailable — scores for vocabulary, cohesion and length are still valid.";
  }

  return NextResponse.json(result);
}
