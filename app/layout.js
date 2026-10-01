import "./globals.css";

export const metadata = {
  title: "EssayScorer — AI Essay Evaluation for EFL Students",
  description:
    "Automated writing evaluation: grammar, vocabulary richness, cohesion and CEFR-level feedback for English essays.",
};

const themeInit = `
try {
  var t = localStorage.getItem("theme");
  if (!t) t = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  document.documentElement.dataset.theme = t;
} catch (e) {}
`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body>
        <header className="site-header">
          <div className="container header-inner">
            <a href="/" className="brand">
              <span className="brand-mark">ES</span>
              <span>EssayScorer</span>
            </a>
            <nav className="nav">
              <a href="/editor">Editor</a>
              <a href="/progress">Progress</a>
              <a href="/about">How it works</a>
              <button
                id="theme-toggle"
                className="theme-toggle"
                aria-label="Toggle theme"
                onClick={undefined}
              />
            </nav>
          </div>
        </header>
        <main className="container">{children}</main>
        <footer className="site-footer">
          <div className="container">
            EssayScorer — Automated Writing Evaluation. Built as an academic
            project. Grammar analysis powered by{" "}
            <a href="https://languagetool.org" target="_blank" rel="noreferrer">
              LanguageTool
            </a>
            .
          </div>
        </footer>
        <script
          dangerouslySetInnerHTML={{
            __html: `document.addEventListener("click",function(e){var b=e.target.closest(".theme-toggle");if(!b)return;var d=document.documentElement,t=d.dataset.theme==="dark"?"light":"dark";d.dataset.theme=t;try{localStorage.setItem("theme",t)}catch(x){}});`,
          }}
        />
      </body>
    </html>
  );
}
