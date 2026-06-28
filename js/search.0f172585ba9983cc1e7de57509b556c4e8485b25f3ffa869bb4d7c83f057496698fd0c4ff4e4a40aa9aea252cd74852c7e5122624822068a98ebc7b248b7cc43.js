/**
 * Command-palette search for the Cactus Plus theme.
 *
 * Architecture notes:
 *  - The header (with the trigger button) lives INSIDE `.content`, which the
 *    SPA router (spa-router.js) swaps on every navigation. So we re-inject the
 *    trigger button on each `spa-content-loaded` event.
 *  - The modal is injected into <body> by the search.html partial (outside
 *    `.content`), so it persists across SPA navigations and is built once.
 *  - Result links are plain <a> internal links, so the SPA router picks them up
 *    automatically — we just close the modal on selection.
 *  - The fuse.js index (/searchindex.json) and the fuse library are lazy-loaded
 *    on first open so non-searching visitors pay nothing.
 */
(function () {
  'use strict';

  // --- i18n (mirrors head.html dataset pattern used by code-copy.js) ---------
  // dataset.searchNoResults is set from i18n in head.html (same pattern as
  // code-copy.js). Build the camelCase property from the key.
  function t(key, fallback) {
    var prop = 'search' + key.charAt(0).toUpperCase() + key.slice(1);
    var v = document.documentElement.dataset[prop];
    return v ? v : fallback;
  }

  function isMac() {
    return /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent || '');
  }
  var MOD = isMac() ? '⌘' : 'Ctrl';

  // --- module state ---------------------------------------------------------
  var modal, input, resultsEl, statusEl, closeEl;
  var fuse = null;
  var indexState = 'idle'; // idle | loading | ready | error
  var lastResults = [];
  var activeIndex = -1;
  var lastFocused = null;
  var debounceTimer = null;

  // --- html helpers ---------------------------------------------------------
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // Wrap matched character ranges in <mark>. Indices are [start, end] inclusive
  // pairs against the ORIGINAL text; each segment is escaped individually so the
  // output is XSS-safe.
  function highlight(text, indices) {
    if (!text) return '';
    if (!indices || !indices.length) return escapeHtml(text);
    var ranges = indices.slice().sort(function (a, b) { return a[0] - b[0]; });
    var out = '', i = 0;
    for (var r = 0; r < ranges.length; r++) {
      var start = Math.max(ranges[r][0], i);
      var end = ranges[r][1];
      if (end < start) continue;
      if (start > i) out += escapeHtml(text.slice(i, start));
      out += '<mark>' + escapeHtml(text.slice(start, end + 1)) + '</mark>';
      i = end + 1;
      if (i >= text.length) break;
    }
    if (i < text.length) out += escapeHtml(text.slice(i));
    return out;
  }

  function matchesFor(result, key) {
    if (!result.matches) return null;
    for (var i = 0; i < result.matches.length; i++) {
      if (result.matches[i].key === key) return result.matches[i].indices;
    }
    return null;
  }

  // Produce a ~windowed snippet from long content, centered on the first match.
  function snippet(content, indices) {
    if (!content) return '';
    var PAD = 48;
    var matchStart = (indices && indices.length) ? indices[0][0] : 0;
    var start = Math.max(0, matchStart - PAD);
    var end = Math.min(content.length, matchStart + PAD * 2);
    var frag = content.slice(start, end).replace(/\s+/g, ' ').trim();
    var adj = indices ? indices
      .map(function (r) { return [r[0] - start, r[1] - start]; })
      .filter(function (r) { return r[0] >= 0 && r[1] < frag.length; }) : null;
    var prefix = start > 0 ? '… ' : '';
    var suffix = end < content.length ? ' …' : '';
    return prefix + highlight(frag, adj) + suffix;
  }

  // --- index loading --------------------------------------------------------
  function ensureIndex(cb) {
    if (indexState === 'ready') { cb(true); return; }
    if (indexState === 'error') { cb(false); return; }
    if (indexState === 'loading') { pendingCallbacks.push(cb); return; }
    indexState = 'loading';
    pendingCallbacks.push(cb);
    var url = modal.getAttribute('data-index-url');
    fetch(url, { credentials: 'same-origin' })
      .then(function (r) { if (!r.ok) throw new Error('bad status'); return r.json(); })
      .then(function (data) {
        var docs = (data && data.data) ? data.data : data;
        buildFuse(docs);
        indexState = 'ready';
        flushCallbacks(true);
      })
      .catch(function () {
        indexState = 'error';
        flushCallbacks(false);
      });
  }
  var pendingCallbacks = [];
  function flushCallbacks(ok) {
    var cbs = pendingCallbacks.slice(); pendingCallbacks = [];
    cbs.forEach(function (cb) { cb(ok); });
  }

  function buildFuse(docs) {
    fuse = new Fuse(docs, {
      keys: [
        { name: 'title', weight: 0.5 },
        { name: 'summary', weight: 0.2 },
        { name: 'content', weight: 0.3 }
      ],
      includeMatches: true,
      minMatchCharLength: 2,
      threshold: 0.4,
      ignoreLocation: true, // match anywhere in long content bodies
      ignoreFieldNorm: true
    });
  }

  // --- rendering ------------------------------------------------------------
  function buildResult(result, idx) {
    var item = result.item;
    var li = document.createElement('li');
    li.className = 'search-result';
    li.setAttribute('role', 'option');
    li.id = 'search-result-' + idx;

    var a = document.createElement('a');
    a.className = 'search-result-link';
    a.href = item.url;
    a.setAttribute('tabindex', '-1');

    var titleHtml = highlight(item.title, matchesFor(result, 'title')) || escapeHtml(item.title);
    a.innerHTML =
      '<span class="search-result-title">' + titleHtml + '</span>' +
      '<span class="search-result-meta">' +
        (item.section ? '<span class="search-result-section">' + escapeHtml(item.section) + '</span>' : '') +
        (item.date ? '<span class="search-result-date">' + escapeHtml(item.date) + '</span>' : '') +
      '</span>' +
      '<span class="search-result-summary">' + snippet(item.content || item.summary, matchesFor(result, 'content')) + '</span>';

    li.appendChild(a);
    return li;
  }

  function setStatus(html) { if (statusEl) statusEl.innerHTML = html; }

  function render(query) {
    resultsEl.innerHTML = '';
    activeIndex = -1;
    if (!query) { setStatus(''); return; }
    if (!fuse) {
      setStatus('<span class="search-modal-loading">' + escapeHtml(t('loading', 'Loading…')) + '</span>');
      return;
    }
    var res = fuse.search(query).slice(0, 25);
    lastResults = res;
    if (!res.length) {
      setStatus('<span class="search-modal-empty">' + escapeHtml(t('noResults', 'No results found')) + '</span>');
      return;
    }
    setStatus('');
    var frag = document.createDocumentFragment();
    res.forEach(function (r, idx) { frag.appendChild(buildResult(r, idx)); });
    resultsEl.appendChild(frag);
    setActive(0);
  }

  function setActive(idx) {
    var items = resultsEl.querySelectorAll('.search-result');
    if (!items.length) { activeIndex = -1; return; }
    if (idx < 0) idx = items.length - 1;
    if (idx >= items.length) idx = 0;
    activeIndex = idx;
    items.forEach(function (el, i) {
      var on = i === idx;
      el.classList.toggle('is-active', on);
      el.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    var active = items[idx];
    if (active && active.scrollIntoView) {
      active.scrollIntoView({ block: 'nearest' });
    }
  }

  function openActive() {
    var items = resultsEl.querySelectorAll('.search-result');
    if (activeIndex < 0 || !items[activeIndex]) return;
    items[activeIndex].querySelector('a').click();
  }

  // --- open / close ---------------------------------------------------------
  function openSearch() {
    if (!modal) return;
    if (modal.hasAttribute('hidden')) {
      lastFocused = document.activeElement;
    }
    modal.removeAttribute('hidden');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    setTimeout(function () { if (input) input.focus(); }, 0);
    if (indexState === 'idle') {
      setStatus('<span class="search-modal-loading">' + escapeHtml(t('loading', 'Loading index…')) + '</span>');
      ensureIndex(function (ok) {
        if (!ok) {
          setStatus('<span class="search-modal-error">' + escapeHtml(t('error', 'Search index failed to load.')) + '</span>');
        } else if (input && input.value) {
          render(input.value);
        } else {
          setStatus('');
        }
      });
    }
  }

  function closeSearch() {
    if (!modal || modal.hasAttribute('hidden')) return;
    modal.setAttribute('hidden', '');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (input) input.value = '';
    render('');
    if (lastFocused && lastFocused.focus) { try { lastFocused.focus(); } catch (e) {} }
  }

  // --- corner toolbar trigger -------------------------------------------------
  // The trigger is appended into the .theme-switcher container (which already
  // holds the theme toggle) so the two tools read as one toolbar. The
  // container lives in baseof.html outside .content, so it survives SPA
  // navigation — we bind once. Adding .is-toolbar turns on the translucent
  // "tray" styling only when the search trigger is actually present.
  function bindTrigger() {
    var container = document.querySelector('.theme-switcher');
    if (!container || container.querySelector('.search-trigger')) return;
    var label = t('title', 'Search');
    var tip = label + ' (' + MOD + 'K)';
    var a = document.createElement('a');
    a.href = '#';
    a.className = 'search-trigger';
    a.setAttribute('data-search-open', '');
    a.setAttribute('role', 'button');
    a.setAttribute('aria-label', tip);
    a.setAttribute('data-tip', tip);
    a.innerHTML = '<i class="fas fa-search" aria-hidden="true"></i>';
    a.addEventListener('click', function (e) { e.preventDefault(); openSearch(); });
    container.appendChild(a);
    container.classList.add('is-toolbar');
  }

  // --- events ---------------------------------------------------------------
  function bindModalEvents() {
    if (!modal) return;
    modal.querySelectorAll('[data-search-close]').forEach(function (el) {
      el.addEventListener('click', closeSearch);
    });
    // Clicking a result closes the modal; SPA router handles navigation.
    resultsEl.addEventListener('click', function () { closeSearch(); });

    input.addEventListener('input', function () {
      var q = input.value.trim();
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(function () { render(q); }, 130);
    });

    input.addEventListener('keydown', function (e) {
      switch (e.key) {
        case 'ArrowDown': e.preventDefault(); setActive(activeIndex + 1); break;
        case 'ArrowUp': e.preventDefault(); setActive(activeIndex - 1); break;
        case 'Enter': e.preventDefault(); openActive(); break;
        case 'Escape': e.preventDefault(); closeSearch(); break;
        case 'Tab': e.preventDefault(); break; // keep focus in the palette
      }
    });
  }

  function bindGlobalKey() {
    document.addEventListener('keydown', function (e) {
      // Cmd/Ctrl+K toggles the palette from anywhere.
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        if (modal && !modal.hasAttribute('hidden')) closeSearch();
        else openSearch();
      }
      // Esc closes if open (also handled inside input, but catch escapes that
      // escape to the document when focus is on a result link).
      if (e.key === 'Escape' && modal && !modal.hasAttribute('hidden')) {
        closeSearch();
      }
    });
  }

  // --- init -----------------------------------------------------------------
  function init() {
    modal = document.getElementById('search-modal');
    if (!modal) return; // search not enabled
    input = document.getElementById('search-modal-input');
    resultsEl = document.getElementById('search-modal-results');
    statusEl = document.getElementById('search-modal-status');
    bindModalEvents();
    bindGlobalKey();
    bindTrigger();
  }

  // Wait for DOMContentLoaded so the theme toggle (registered first by
  // main.js) is appended before our trigger — keeping toggle-on-top order in
  // the shared .theme-switcher toolbar. (Defer scripts run at readyState
  // 'interactive', so the old '==='loading'' guard fired too early.)
  if (document.readyState === 'complete') {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }
})();
