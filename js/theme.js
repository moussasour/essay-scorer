// EssayScorer — dark/light theme toggle (loaded on every page)
(function () {
  var theme;
  try {
    theme = localStorage.getItem("theme");
    if (!theme) theme = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  } catch (e) { theme = "dark"; }
  document.documentElement.dataset.theme = theme;

  document.addEventListener("click", function (e) {
    var btn = e.target.closest(".theme-toggle");
    if (!btn) return;
    var next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("theme", next); } catch (err) {}
  });
})();
