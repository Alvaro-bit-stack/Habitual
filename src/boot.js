(function () {
  function boot() {
    if (window.SQUI && typeof window.SQUI.start === "function") window.SQUI.start();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
