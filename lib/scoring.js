// ---------------------------------------------------------------
// EssayScorer — scoring engine (pure functions, no dependencies)
// Metrics: Grammar (LanguageTool), Vocabulary (MATTR), Cohesion
// (linking devices), Length fit, and a heuristic CEFR estimate.
// ---------------------------------------------------------------

const LINKING_WORDS = [
  "however", "moreover", "furthermore", "therefore", "thus", "consequently",
  "nevertheless", "nonetheless", "in addition", "for instance", "for example",
  "in contrast", "on the other hand", "as a result", "in conclusion",
  "to conclude", "firstly", "secondly", "thirdly", "finally", "first of all",
  "in fact", "indeed", "similarly", "likewise", "meanwhile", "afterwards",
  "subsequently", "in particular", "specifically", "namely", "although",
  "whereas", "while", "since", "because", "due to", "owing to", "accordingly",
  "hence", "besides", "instead", "rather", "overall", "in summary", "to sum up",
  "on the contrary", "in other words", "that is to say", "above all",
];

const ESSAY_TARGETS = {
  argumentative: { min: 250, max: 400 },
  expository: { min: 250, max: 400 },
  descriptive: { min: 200, max: 350 },
  narrative: { min: 200, max: 350 },
  short: { min: 120, max: 250 },
};

const clamp = (v, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));
const round1 = (v) => Math.round(v * 10) / 10;

function tokenize(text) {
  const words = (text.toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g) || []);
  const sentences = (text.match(/[^.!?\n]+[.!?]+(?=\s|$)|[^.!?\n]+$/g) || [])
    .map((s) => s.trim())
    .filter((s) => (s.match(/[a-z]+/gi) || []).length >= 3);
  const paragraphs = (text.split(/\n\s*\n|\n/).map((p) => p.trim()).filter(Boolean));
  return { words, sentences, paragraphs };
}

// Moving-Average Type-Token Ratio (window 50) — vocabulary diversity
// that stays stable across different text lengths.
function mattr(words, window = 50) {
  if (words.length === 0) return 0;
  if (words.length <= window) {
    return new Set(words).size / words.length;
  }
  let sum = 0, n = 0;
  const counts = new Map();
  let types = 0;
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    counts.set(w, (counts.get(w) || 0) + 1);
    if (counts.get(w) === 1) types++;
    if (i >= window) {
      const old = words[i - window];
      const c = counts.get(old) - 1;
      if (c === 0) counts.delete(old), types--;
      else counts.set(old, c);
    }
    if (i >= window - 1) { sum += types / window; n++; }
  }
  return sum / n;
}

function vocabularyScore(words) {
  if (words.length < 20) return { score: null, mattr: 0, longWordRatio: 0 };
  const diversity = mattr(words);
  const longWords = words.filter((w) => w.length >= 7).length;
  const longWordRatio = longWords / words.length;
  // MATTR of ~0.40–0.70 is typical of competent academic writing.
  let s1;
  if (diversity >= 0.55) s1 = 100;
  else if (diversity >= 0.40) s1 = 55 + ((diversity - 0.40) / 0.15) * 45;
  else s1 = (diversity / 0.40) * 55;
  // Advanced-word density: 10–25% long words is healthy.
  let s2;
  if (longWordRatio >= 0.10 && longWordRatio <= 0.30) s2 = 100;
  else if (longWordRatio > 0.30) s2 = clamp(100 - (longWordRatio - 0.30) * 400);
  else s2 = clamp((longWordRatio / 0.10) * 100);
  return { score: Math.round(s1 * 0.6 + s2 * 0.4), mattr: diversity, longWordRatio };
}

function cohesionScore(sentences, words) {
  if (sentences.length < 2) return { score: null, perSentence: 0, links: 0 };
  const lower = " " + words.join(" ") + " ";
  let links = 0;
  for (const lw of LINKING_WORDS) {
    const re = new RegExp("(?<=^|\\s)" + lw.replace(/ /g, "\\s+") + "(?=$|\\s)", "g");
    links += (lower.match(re) || []).length;
  }
  const perSentence = links / sentences.length;
  // 0.2–0.8 linking devices per sentence signals controlled cohesion.
  let s1;
  if (perSentence >= 0.2 && perSentence <= 0.9) s1 = 100;
  else if (perSentence < 0.2) s1 = clamp((perSentence / 0.2) * 100);
  else s1 = clamp(100 - (perSentence - 0.9) * 80);
  // Sentence-length variety (rhetorical rhythm).
  const lens = sentences.map((s) => (s.match(/[a-z]+/gi) || []).length);
  const mean = lens.reduce((a, b) => a + b, 0) / lens.length;
  const sd = Math.sqrt(lens.reduce((a, b) => a + (b - mean) ** 2, 0) / lens.length);
  const cv = mean > 0 ? sd / mean : 0; // coefficient of variation
  let s2;
  if (cv >= 0.25) s2 = 100;
  else s2 = clamp((cv / 0.25) * 100);
  return { score: Math.round(s1 * 0.65 + s2 * 0.35), perSentence: round1(perSentence * 100) / 100, links };
}

function lengthScore(words, essayType) {
  const t = ESSAY_TARGETS[essayType] || ESSAY_TARGETS.argumentative;
  if (words.length >= t.min && words.length <= t.max) return 100;
  if (words.length < t.min) {
    return clamp(Math.round((words.length / t.min) * 100));
  }
  return clamp(Math.round(100 - ((words.length - t.max) / t.max) * 60));
}

function grammarScore(matches, words) {
  if (words.length === 0) return { score: null, rate: 0, penalty: 0 };
  const rate = matches.length / words.length * 100; // issues per 100 words
  const penalty = rate * 2.4;
  return { score: clamp(Math.round(100 - penalty)), rate: round1(rate), penalty: round1(penalty) };
}

function estimateCEFR(words, sentences, mattrVal) {
  if (words.length < 60) return { level: "A2", note: "text too short for a reliable estimate" };
  const asl = words.length / Math.max(sentences.length, 1); // avg sentence length
  const longRatio = words.filter((w) => w.length >= 7).length / words.length;
  const index = asl * 0.5 + mattrVal * 60 + longRatio * 40;
  let level;
  if (index < 28) level = "A2";
  else if (index < 36) level = "B1";
  else if (index < 44) level = "B2";
  else level = "C1";
  return { level, note: "heuristic estimate from sentence length, lexical diversity and word complexity" };
}

function categorizeIssue(m) {
  const cats = m.rule?.categories?.map((c) => c.id) || [];
  if (cats.includes("TYPOS")) return "misspelling";
  if (cats.includes("GRAMMAR")) return "grammar";
  if (cats.includes("PUNCTUATION")) return "punctuation";
  if (cats.includes("STYLE")) return "style";
  return "other";
}

export function analyzeEssay(text, { essayType = "argumentative", languageToolMatches = [] } = {}) {
  const { words, sentences, paragraphs } = tokenize(text);
  const vocab = vocabularyScore(words);
  const coh = cohesionScore(sentences, words);
  const len = lengthScore(words, essayType);
  const gram = grammarScore(languageToolMatches, words);
  const cefr = estimateCEFR(words, sentences, vocab.mattr);

  // Weighted final score. Missing metrics (text too short) are dropped
  // and their weight redistributed.
  const parts = [
    { w: 0.4, s: gram.score },
    { w: 0.3, s: vocab.score },
    { w: 0.2, s: coh.score },
    { w: 0.1, s: len },
  ];
  const usable = parts.filter((p) => p.s !== null && p.s !== undefined);
  const totalW = usable.reduce((a, p) => a + p.w, 0) || 1;
  const overall = Math.round(usable.reduce((a, p) => a + p.w * p.s, 0) / totalW);

  return {
    overall,
    cefr: cefr.level,
    stats: {
      words: words.length,
      sentences: sentences.length,
      paragraphs: paragraphs.length,
      avgSentenceLength: sentences.length ? round1(words.length / sentences.length) : 0,
      lexicalDiversity: round1(vocab.mattr * 100),
      linkingDevices: coh.links,
    },
    subscores: {
      grammar: gram.score && { score: gram.score, detail: `${gram.rate} issues per 100 words` },
      vocabulary: vocab.score && {
        score: vocab.score,
        detail: `diversity ${Math.round(vocab.mattr * 100)}%, advanced words ${Math.round(vocab.longWordRatio * 100)}%`,
      },
      cohesion: coh.score && { score: coh.score, detail: `${coh.links} linking devices across ${sentences.length} sentences` },
      length: { score: len, detail: `${words.length} words (target ${ESSAY_TARGETS[essayType].min}–${ESSAY_TARGETS[essayType].max})` },
    },
    issues: languageToolMatches.map((m, i) => ({
      id: i,
      offset: m.offset,
      length: m.length,
      fragment: text.slice(m.offset, m.offset + m.length),
      category: categorizeIssue(m),
      message: m.message,
      shortMessage: m.shortMessage || "",
      replacements: (m.replacements || []).slice(0, 3).map((r) => r.value),
    })),
  };
}

export { categorizeIssue };
