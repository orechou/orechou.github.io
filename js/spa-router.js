(function () {
  'use strict';

  var CONTENT_SELECTOR = '.content.index.py4';
  var isInitialLoad = true;

  function normalizeUrl(url) {
    try {
      var u = new URL(url, location.origin);
      var path = u.pathname;
      if (/\.\w+$/.test(path) && !path.endsWith('/')) return url;
      if (!path.endsWith('/')) {
        u.pathname = path + '/';
      }
      return u.pathname + u.search + u.hash;
    } catch (e) {
      return url;
    }
  }

  function isInternalLink(href) {
    if (!href) return false;
    if (href.startsWith('/') && !href.startsWith('//')) return true;
    if (href.startsWith(location.origin + '/')) return true;
    return false;
  }

  function isSamePageAnchor(href) {
    if (!href) return false;
    var path = href.split('#')[0];
    return path === location.pathname || path === location.pathname + '/';
  }

  function reinitScripts(container) {
    var scripts = container.querySelectorAll('script');
    scripts.forEach(function (s) {
      if (s.src) return; // skip external scripts
      var clone = document.createElement('script');
      clone.textContent = s.textContent;
      s.parentNode.replaceChild(clone, s);
    });
  }

  function dispatchSpaEvent() {
    window.dispatchEvent(new CustomEvent('spa-content-loaded'));
  }

  function navigateTo(url, isPop) {
    url = normalizeUrl(url);
    if (!isPop) {
      history.pushState({}, '', url);
    }

    fetch(url)
      .then(function (r) {
        if (!r.ok) throw new Error('fetch failed');
        return r.text();
      })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var incoming = doc.querySelector(CONTENT_SELECTOR);
        if (!incoming) {
          location.href = url;
          return;
        }

        var current = document.querySelector(CONTENT_SELECTOR);
        if (!current) {
          location.href = url;
          return;
        }

        current.innerHTML = incoming.innerHTML;
        reinitScripts(current);
        dispatchSpaEvent();
        window.scrollTo(0, 0);
      })
      .catch(function () {
        location.href = url;
      });
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest('a');
    if (!a) return;

    var href = a.getAttribute('href');
    if (!href) return;

    // Handle pure anchor links (e.g. #heading)
    if (href.charAt(0) === '#') {
      var anchorId = href.substring(1);
      if (anchorId) {
        e.preventDefault();
        var target = document.getElementById(anchorId);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' });
        }
      }
      return;
    }

    // Skip non-internal links
    if (!isInternalLink(href)) return;

    // Handle same-page anchor (e.g. /posts/xxx/#section)
    if (href.includes('#')) {
      var anchor = href.split('#')[1];
      if (isSamePageAnchor(href)) {
        e.preventDefault();
        var target = document.getElementById(anchor) || document.querySelector('[name="' + anchor + '"]');
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' });
        }
        return;
      }
    }

    // Middle-click, Ctrl+click, etc. — let browser handle it
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;

    e.preventDefault();
    navigateTo(href, false);
  });

  window.addEventListener('popstate', function () {
    navigateTo(location.pathname + location.search + location.hash, true);
  });

  // Handle initial page load (browser back to first page)
  window.addEventListener('load', function () {
    isInitialLoad = false;
  });
})();