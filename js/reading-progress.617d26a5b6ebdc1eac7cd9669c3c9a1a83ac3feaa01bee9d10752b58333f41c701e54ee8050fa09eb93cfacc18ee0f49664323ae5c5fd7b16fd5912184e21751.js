/**
 * Reading progress bar — a thin accent bar pinned to the top of the viewport
 * that fills as the reader scrolls through a post.
 *
 * The bar element lives in baseof.html (outside .content, so it persists across
 * SPA navigation). Progress is computed relative to the <article.post>: 0% at
 * the article's top, 100% when its bottom reaches the viewport. On non-post
 * pages the bar stays hidden.
 */
(function () {
  'use strict';

  var bar = document.getElementById('reading-progress');
  if (!bar) return;

  var ticking = false;

  function update() {
    ticking = false;
    var article = document.querySelector('article.post');
    if (!article) {
      bar.style.width = '0%';
      bar.hidden = true;
      return;
    }
    bar.hidden = false;

    var rect = article.getBoundingClientRect();
    var top = rect.top + window.scrollY;
    var bottom = rect.bottom + window.scrollY;
    var vh = window.innerHeight;
    var total = (bottom - top) - vh;
    var scrolled = window.scrollY - top;
    var p = total > 0 ? Math.max(0, Math.min(1, scrolled / total)) : 1;
    bar.style.width = (p * 100) + '%';
  }

  function requestUpdate() {
    if (!ticking) {
      window.requestAnimationFrame(update);
      ticking = true;
    }
  }

  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate, { passive: true });
  // Recompute after SPA navigation swaps the article.
  window.addEventListener('spa-content-loaded', update);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', update);
  } else {
    update();
  }
})();
