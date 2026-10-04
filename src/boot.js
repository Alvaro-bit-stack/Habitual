(function () {
  function boot() {
    if (window.SQUI && typeof window.SQUI.start === "function") window.SQUI.start();
    if (window.SQCloud) window.SQCloud.init();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
