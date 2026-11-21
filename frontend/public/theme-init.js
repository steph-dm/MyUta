// Runs before the app (render-blocking, tiny): theme class, browser UI colour and <html lang>.
(function () {
  try {
    var saved = localStorage.getItem("theme");
    var dark = saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.add(dark ? "dark" : "light");
    document
      .querySelector('meta[name="theme-color"]')
      .setAttribute("content", dark ? "#121212" : "#fafafa");
    var lng = localStorage.getItem("i18nextLng") || navigator.language || "en";
    document.documentElement.lang = lng.indexOf("ja") === 0 ? "ja" : "en";
  } catch (e) {
    /* storage unavailable: keep defaults */
  }
})();
