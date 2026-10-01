import Link from "next/link";

const features = [
  {
    ico: "📝",
    title: "Grammar & spelling",
    text: "Every sentence is checked by LanguageTool — the open-source proofreading engine used by millions.",
  },
  {
    ico: "📚",
    title: "Vocabulary richness",
    text: "Moving-average type-token ratio (MATTR) measures how varied your word choice really is, independent of text length.",
  },
  {
    ico: "🔗",
    title: "Cohesion & flow",
    text: "Detects linking devices (however, therefore, in contrast…) and sentence-length variety — the backbone of academic writing.",
  },
  {
    ico: "🎯",
    title: "CEFR estimate",
    text: "A heuristic estimate of your level from A2 to C1, based on sentence complexity and lexical diversity.",
  },
  {
    ico: "📈",
    title: "Progress tracking",
    text: "Every essay is saved locally in your browser so you can watch your scores climb over time.",
  },
  {
    ico: "🔒",
    title: "Private by design",
    text: "No account needed. Your essays stay in your browser — nothing is stored on our servers.",
  },
];

export default function Home() {
  return (
    <>
      <section className="hero">
        <h1>
          Get your English essay <span className="grad">scored in seconds</span>
        </h1>
        <p>
          EssayScorer evaluates your writing across four dimensions — grammar,
          vocabulary, cohesion and length — and gives you actionable feedback,
          a CEFR estimate, and a score out of 100.
        </p>
        <Link href="/editor" className="btn">Start writing →</Link>
      </section>

      <section className="features">
        {features.map((f) => (
          <div className="feature" key={f.title}>
            <span className="ico">{f.ico}</span>
            <h3>{f.title}</h3>
            <p>{f.text}</p>
          </div>
        ))}
      </section>
    </>
  );
}
