(function () {
  'use strict';

  var CONTENT_SELECTOR = '.content.index.py4';
  // Meta tags that should follow the incoming page.
  var META_SELECTORS = [
    'meta[name="description"]',
    'meta[property="og:title"]',
    'meta[property="og:description"]',
    'meta[property="og:url"]',
    'meta[property="og:type"]',
    'meta[property="article:published_time"]',
    'meta[property="article:modified_time"]',
    'meta[name="twitter:title"]',
    'meta[name="twitter:description"]',
    'meta[name="twitter:url"]',
    'link[rel="canonical"]'
  ];

  // Let the browser handle scroll position on back/forward; we only reset
  // scroll on forward navigations (pushState).
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }

  // Scroll Y per URL, so popstate can restore the user's position.
  var scrollPositions = {};
  var currentUrl = location.pathname + location.search;

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
      if (s.src) return; // external scripts are not re-executed via innerHTML
      var clone = document.createElement('script');
      clone.textContent = s.textContent;
      s.parentNode.replaceChild(clone, s);
    });
  }

  function updateHead(doc) {
    var newTitle = doc.querySelector('title');
    if (newTitle) document.title = newTitle.textContent;

    META_SELECTORS.forEach(function (sel) {
      var incoming = doc.querySelector('head ' + sel);
      var current = document.head.querySelector(sel);
      if (incoming) {
        var clone = incoming.cloneNode(true);
        if (current) {
          current.parentNode.replaceChild(clone, current);
        } else {
          document.head.appendChild(clone);
        }
      }
    });
  }

  function trackPageView(url) {
    try {
      if (typeof window.gtag === 'function') {
        window.gtag('config', window.GA_TRACKING_ID, { page_path: url });
      } else if (typeof window.ga === 'function') {
        window.ga('send', 'pageview', url);
      }
    } catch (e) {}
  }

  function dispatchSpaEvent() {
    window.dispatchEvent(new CustomEvent('spa-content-loaded'));
  }

  function navigateTo(url, isPop) {
    url = normalizeUrl(url);

    // Remember scroll position of the page we're leaving.
    if (!isPop) {
      scrollPositions[currentUrl] = window.scrollY;
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

        updateHead(doc);
        current.innerHTML = incoming.innerHTML;
        reinitScripts(current);
        dispatchSpaEvent();
        trackPageView(url);

        var prevUrl = currentUrl;
        currentUrl = url;

        if (isPop && scrollPositions[url] != null) {
          window.scrollTo(0, scrollPositions[url]);
        } else {
          window.scrollTo(0, 0);
        }
        // Clean up the stored position for the page we just left, unless we
        // may come back to it via popstate (keep it).
        if (!isPop) delete scrollPositions[prevUrl];
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
})();
