// ---------------------------------------------------------------
// EssayScorer — scoring engine (plain JavaScript, no dependencies)
// Metrics: Grammar (LanguageTool), Vocabulary (MATTR), Cohesion
// (linking devices), Length fit, and a heuristic CEFR estimate.
// ---------------------------------------------------------------

var LINKING_WORDS = [
  "however", "moreover", "furthermore", "therefore", "thus", "consequently",
  "nevertheless", "nonetheless", "in addition", "for instance", "for example",
  "in contrast", "on the other hand", "as a result", "in conclusion",
  "to conclude", "firstly", "secondly", "thirdly", "finally", "first of all",
  "in fact", "indeed", "similarly", "likewise", "meanwhile", "afterwards",
  "subsequently", "in particular", "specifically", "namely", "although",
  "whereas", "while", "since", "because", "due to", "owing to", "accordingly",
  "hence", "besides", "instead", "rather", "overall", "in summary", "to sum up",
  "on the contrary", "in other words", "that is to say", "above all"
];

var ESSAY_TARGETS = {
  argumentative: { min: 250, max: 400 },
  expository: { min: 250, max: 400 },
  descriptive: { min: 200, max: 350 },
  narrative: { min: 200, max: 350 },
  short: { min: 120, max: 250 }
};

function clamp(v, lo, hi) { return Math.max(lo || 0, Math.min(hi || 100, v)); }
function round1(v) { return Math.round(v * 10) / 10; }

function tokenize(text) {
  var words = (text.toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g)) || [];
  var sentences = (text.match(/[^.!?\n]+[.!?]+(?=\s|$)|[^.!?\n]+$/g) || [])
    .map(function (s) { return s.trim(); })
    .filter(function (s) { return ((s.match(/[a-z]+/gi)) || []).length >= 3; });
  var paragraphs = text.split(/\n\s*\n|\n/).map(function (p) { return p.trim(); }).filter(Boolean);
  return { words: words, sentences: sentences, paragraphs: paragraphs };
}

// Moving-Average Type-Token Ratio (window 50) — vocabulary diversity
// that stays stable across different text lengths.
function mattr(words, window) {
  window = window || 50;
  if (words.length === 0) return 0;
  if (words.length <= window) {
    var uniq = {};
    for (var i = 0; i < words.length; i++) uniq[words[i]] = 1;
    return Object.keys(uniq).length / words.length;
  }
  var sum = 0, n = 0, types = 0, counts = {};
  for (var j = 0; j < words.length; j++) {
    var w = words[j];
    counts[w] = (counts[w] || 0) + 1;
    if (counts[w] === 1) types++;
    if (j >= window) {
      var old = words[j - window];
      counts[old]--;
      if (counts[old] === 0) { delete counts[old]; types--; }
    }
    if (j >= window - 1) { sum += types / window; n++; }
  }
  return sum / n;
}

function vocabularyScore(words) {
  if (words.length < 20) return { score: null, mattr: 0, longWordRatio: 0 };
  var diversity = mattr(words);
  var longWords = words.filter(function (w) { return w.length >= 7; }).length;
  var longWordRatio = longWords / words.length;
  // MATTR of ~0.40–0.70 is typical of competent academic writing.
  var s1;
  if (diversity >= 0.55) s1 = 100;
  else if (diversity >= 0.40) s1 = 55 + ((diversity - 0.40) / 0.15) * 45;
  else s1 = (diversity / 0.40) * 55;
  // Advanced-word density: 10–30% long words is healthy.
  var s2;
  if (longWordRatio >= 0.10 && longWordRatio <= 0.30) s2 = 100;
  else if (longWordRatio > 0.30) s2 = clamp(100 - (longWordRatio - 0.30) * 400);
  else s2 = clamp((longWordRatio / 0.10) * 100);
  return { score: Math.round(s1 * 0.6 + s2 * 0.4), mattr: diversity, longWordRatio: longWordRatio };
}

function cohesionScore(sentences, words) {
  if (sentences.length < 2) return { score: null, perSentence: 0, links: 0 };
  var joined = " " + words.join(" ") + " ";
  var links = 0;
  for (var i = 0; i < LINKING_WORDS.length; i++) {
    var lw = LINKING_WORDS[i].replace(/ /g, "\\s+");
    var re = new RegExp("(?<=^|\\s)" + lw + "(?=$|\\s)", "g");
    links += (joined.match(re) || []).length;
  }
  var perSentence = links / sentences.length;
  // 0.2–0.9 linking devices per sentence signals controlled cohesion.
  var s1;
  if (perSentence >= 0.2 && perSentence <= 0.9) s1 = 100;
  else if (perSentence < 0.2) s1 = clamp((perSentence / 0.2) * 100);
  else s1 = clamp(100 - (perSentence - 0.9) * 80);
  // Sentence-length variety (rhetorical rhythm).
  var lens = sentences.map(function (s) { return ((s.match(/[a-z]+/gi)) || []).length; });
  var mean = lens.reduce(function (a, b) { return a + b; }, 0) / lens.length;
  var variance = lens.reduce(function (a, b) { return a + (b - mean) * (b - mean); }, 0) / lens.length;
  var cv = mean > 0 ? Math.sqrt(variance) / mean : 0;
  var s2 = cv >= 0.25 ? 100 : clamp((cv / 0.25) * 100);
  return { score: Math.round(s1 * 0.65 + s2 * 0.35), perSentence: perSentence, links: links };
}

function lengthScore(words, essayType) {
  var t = ESSAY_TARGETS[essayType] || ESSAY_TARGETS.argumentative;
  if (words.length >= t.min && words.length <= t.max) return 100;
  if (words.length < t.min) return clamp(Math.round((words.length / t.min) * 100));
  return clamp(Math.round(100 - ((words.length - t.max) / t.max) * 60));
}

function grammarScore(matches, words) {
  if (words.length === 0) return { score: null, rate: 0 };
  var rate = (matches.length / words.length) * 100; // issues per 100 words
  return { score: clamp(Math.round(100 - rate * 2.4)), rate: round1(rate) };
}

function estimateCEFR(words, sentences, mattrVal, grammarScore) {
  if (words.length < 60) return "A2";
  var asl = words.length / Math.max(sentences.length, 1); // avg sentence length
  var longRatio = words.filter(function (w) { return w.length >= 7; }).length / words.length;
  // Index spans roughly 30 (simple) to 75 (advanced) for real essays.
  var index = asl * 0.5 + mattrVal * 60 + longRatio * 40;
  var level;
  if (index < 48) level = "A2";
  else if (index < 58) level = "B1";
  else if (index < 68) level = "B2";
  else level = "C1";
  // Grammar quality caps the level: heavy errors cannot yield C1.
  if (grammarScore !== null && grammarScore !== undefined) {
    if (grammarScore < 60) level = "A2";
    else if (grammarScore < 75) level = level === "C1" || level === "B2" ? "B1" : level;
    else if (grammarScore < 88) level = level === "C1" ? "B2" : level;
  }
  return level;
}

function categorizeIssue(m) {
  var cats = (m.rule && m.rule.categories ? m.rule.categories.map(function (c) { return c.id; }) : []);
  if (cats.indexOf("TYPOS") !== -1) return "misspelling";
  if (cats.indexOf("GRAMMAR") !== -1) return "grammar";
  if (cats.indexOf("PUNCTUATION") !== -1 || cats.indexOf("TYPOGRAPHY") !== -1) return "punctuation";
  if (cats.indexOf("STYLE") !== -1 || cats.indexOf("COLLOQUIALISMS") !== -1) return "style";
  // Some grammar rules sit under other categories — catch them by rule id.
  var rid = (m.rule && m.rule.id) || "";
  if (/AGREEMENT|VERB|NOUN|TENSE|PLURAL|SINGULAR|A_INFINITIVE|MISSING|SENTENCE/i.test(rid)) return "grammar";
  if (/MORFOLOGIK|SPELL|HUNSPELL/i.test(rid)) return "misspelling";
  if (/COMMA|PUNCT/i.test(rid)) return "punctuation";
  return "other";
}

function analyzeEssay(text, opts) {
  opts = opts || {};
  var essayType = opts.essayType || "argumentative";
  var matches = opts.languageToolMatches || [];
  var tokens = tokenize(text);
  var words = tokens.words, sentences = tokens.sentences, paragraphs = tokens.paragraphs;
  var vocab = vocabularyScore(words);
  var coh = cohesionScore(sentences, words);
  var len = lengthScore(words, essayType);
  var gram = grammarScore(matches, words);
  var cefr = estimateCEFR(words, sentences, vocab.mattr, gram.score);

  // Weighted final score. Missing metrics (text too short) are dropped
  // and their weight redistributed.
  var parts = [
    { w: 0.4, s: gram.score }, { w: 0.3, s: vocab.score },
    { w: 0.2, s: coh.score }, { w: 0.1, s: len }
  ];
  var usable = parts.filter(function (p) { return p.s !== null && p.s !== undefined; });
  var totalW = usable.reduce(function (a, p) { return a + p.w; }, 0) || 1;
  var overall = Math.round(usable.reduce(function (a, p) { return a + p.w * p.s; }, 0) / totalW);

  var subscores = {};
  if (gram.score !== null) subscores.grammar = { score: gram.score, detail: gram.rate + " issues per 100 words" };
  if (vocab.score !== null) subscores.vocabulary = { score: vocab.score,
    detail: "diversity " + Math.round(vocab.mattr * 100) + "%, advanced words " + Math.round(vocab.longWordRatio * 100) + "%" };
  if (coh.score !== null) subscores.cohesion = { score: coh.score,
    detail: coh.links + " linking devices across " + sentences.length + " sentences" };
  subscores.length = { score: len,
    detail: words.length + " words (target " + ESSAY_TARGETS[essayType].min + "\u2013" + ESSAY_TARGETS[essayType].max + ")" };

  return {
    overall: overall,
    cefr: cefr,
    stats: {
      words: words.length,
      sentences: sentences.length,
      paragraphs: paragraphs.length,
      avgSentenceLength: sentences.length ? round1(words.length / sentences.length) : 0,
      lexicalDiversity: Math.round(vocab.mattr * 100),
      linkingDevices: coh.links
    },
    subscores: subscores,
    issues: matches.map(function (m, i) {
      return {
        id: i,
        offset: m.offset,
        length: m.length,
        fragment: text.slice(m.offset, m.offset + m.length),
        category: categorizeIssue(m),
        message: m.message,
        replacements: (m.replacements || []).slice(0, 3).map(function (r) { return r.value; })
      };
    })
  };
}
