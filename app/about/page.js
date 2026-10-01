export const metadata = {
  title: "How it works — EssayScorer",
  description: "The scoring methodology behind EssayScorer: grammar, vocabulary, cohesion, length and CEFR estimation.",
};

export default function About() {
  return (
    <article className="prose">
      <h1>How EssayScorer works</h1>
      <p>
        EssayScorer is an Automated Writing Evaluation (AWE) tool. It analyses an
        English essay along four weighted dimensions and produces a final score
        out of 100, plus a heuristic CEFR level estimate.
      </p>

      <h2>1. Grammar &amp; mechanics — weight 40%</h2>
      <p>
        The text is sent to <a href="https://languagetool.org" target="_blank" rel="noreferrer">LanguageTool</a>,
        an open-source proofreading engine with rule-based and statistical models.
        Every detected issue (grammar, spelling, punctuation, style) counts against
        the grammar score, normalised per 100 words so that long essays are not
        unfairly penalised.
      </p>

      <h2>2. Vocabulary richness — weight 30%</h2>
      <p>
        Lexical diversity is measured with the <em>Moving-Average Type-Token Ratio</em>
        {" "}(MATTR, window 50), which stays stable regardless of text length — unlike
        the raw type-token ratio, which drops as texts get longer. Advanced-word
        density (words of 7+ letters) is combined with diversity in a 60/40 blend.
      </p>

      <h2>3. Cohesion — weight 20%</h2>
      <p>
        Two signals are combined: the density of explicit linking devices
        (however, therefore, in contrast…) per sentence, and sentence-length variety
        (coefficient of variation), a marker of rhetorical rhythm in academic prose.
      </p>

      <h2>4. Length fit — weight 10%</h2>
      <p>
        The word count is compared against a target range for the selected essay
        type (e.g. 250–400 words for an argumentative essay) and scored by proximity.
      </p>

      <h2>CEFR estimation</h2>
      <p>
        The level estimate (A2–C1) is a heuristic index built from average sentence
        length, lexical diversity and advanced-word density. It is indicative only —
        not a substitute for a standardised test.
      </p>

      <h2>Technology</h2>
      <table>
        <tbody>
          <tr><td>Framework</td><td>Next.js (React), server-side API route</td></tr>
          <tr><td>Grammar engine</td><td>LanguageTool public API</td></tr>
          <tr><td>Text metrics</td><td>Custom JavaScript scoring engine (<code>lib/scoring.js</code>)</td></tr>
          <tr><td>Progress storage</td><td>Browser localStorage — no account, no server-side storage</td></tr>
          <tr><td>Hosting</td><td>Vercel</td></tr>
        </tbody>
      </table>

      <h2>Limitations</h2>
      <p>
        The scorer evaluates surface-level features of writing. It does not (yet)
        judge argument quality, idea development or task achievement, which remain
        the domain of human raters. Scores should be read as feedback for revision,
        not as official grades.
      </p>
    </article>
  );
}
