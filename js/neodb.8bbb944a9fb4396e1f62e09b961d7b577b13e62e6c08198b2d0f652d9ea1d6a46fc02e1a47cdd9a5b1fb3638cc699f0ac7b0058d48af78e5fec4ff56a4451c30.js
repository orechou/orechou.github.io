(function () {
  'use strict';

  var container, grid, loader, loadMoreBtn, errorEl, noResultsEl, categoryFilterEl, typeFilterEl, loaderText;

  var allItems = [];
  var currentPage = 1;
  var totalPages = 1;
  var loading = false;
  var fetchId = 0;
  var activeCategory = '';
  var activeType = 'complete';

  var CATEGORIES = [
    { key: '', labelKey: 'filterAll' },
    { key: 'book', labelKey: 'filterBook' },
    { key: 'movie', labelKey: 'filterMovie' },
    { key: 'tv', labelKey: 'filterTV' },
    { key: 'music', labelKey: 'filterMusic' },
    { key: 'game', labelKey: 'filterGame' }
  ];

  var TYPES = [
    { key: 'complete', labelKey: 'typeComplete' },
    { key: 'progress', labelKey: 'typeProgress' },
    { key: 'wishlist', labelKey: 'typeWishlist' }
  ];

  var CATEGORY_EMOJIS = {
    book: '\u{1F4D6}',
    movie: '\u{1F3AC}',
    tv: '\u{1F4FA}',
    music: '\u{1F3B5}',
    game: '\u{1F3AE}',
    podcast: '\u{1F3A4}',
    performance: '\u{1F3AD}'
  };

  var CATEGORY_LABELS = {
    book: 'BOOK',
    movie: 'MOVIE',
    tv: 'TV',
    music: 'MUSIC',
    game: 'GAME',
    podcast: 'PODCAST',
    performance: 'SHOW'
  };

  function truncate(str, max) {
    if (!str) return '';
    return str.length > max ? str.substring(0, max) + '...' : str;
  }

  function queryElements() {
    container = document.getElementById('neodb');
    if (!container) return false;
    grid = container.querySelector('.neodb-grid');
    loader = container.querySelector('.neodb-loader');
    loadMoreBtn = container.querySelector('.neodb-load-more');
    errorEl = container.querySelector('.neodb-error');
    noResultsEl = container.querySelector('.neodb-no-results');
    categoryFilterEl = container.querySelector('.neodb-category-filter');
    typeFilterEl = container.querySelector('.neodb-type-filter');
    loaderText = container.querySelector('.loader-text');
    return true;
  }

  function showLoader() {
    if (loader) {
      loader.hidden = false;
      if (loaderText) loaderText.textContent = window.neodbConfig.labels.loading || 'Loading...';
    }
  }

  function hideLoader() {
    if (loader) loader.hidden = true;
  }

  function showError(msg) {
    hideLoader();
    if (errorEl) {
      errorEl.textContent = msg || window.neodbConfig.labels.error || 'Error';
      errorEl.hidden = false;
    }
    if (loadMoreBtn) loadMoreBtn.hidden = true;
  }

  function showNoResults() {
    hideLoader();
    if (noResultsEl) {
      noResultsEl.textContent = window.neodbConfig.labels.noResults || 'No records found';
      noResultsEl.hidden = false;
    }
  }

  function hideAll() {
    if (errorEl) errorEl.hidden = true;
    if (noResultsEl) noResultsEl.hidden = true;
    if (loadMoreBtn) loadMoreBtn.hidden = true;
    hideLoader();
  }

  function renderStars(rating, max) {
    max = max || 5;
    var frag = document.createDocumentFragment();
    for (var i = 1; i <= max; i++) {
      var span = document.createElement('span');
      span.className = 'star' + (i <= rating ? ' filled' : '');
      span.textContent = i <= rating ? '★' : '☆';
      frag.appendChild(span);
    }
    return frag;
  }

  function createCard(item) {
    var a = document.createElement('a');
    a.className = 'neodb-card';
    var itemUrl = item.item.id;
    if (itemUrl && itemUrl.indexOf('http') !== 0) {
      itemUrl = 'https://neodb.social/item/' + itemUrl;
    }
    a.href = itemUrl || '#';
    a.target = '_blank';
    a.rel = 'noopener';

    // Cover
    var cover = document.createElement('div');
    cover.className = 'neodb-card-cover';
    if (item.item.cover_image_url) {
      var img = document.createElement('img');
      img.src = item.item.cover_image_url;
      img.alt = item.item.display_title || item.item.title;
      img.loading = 'lazy';
      img.decoding = 'async';
      cover.appendChild(img);
    } else {
      var placeholder = document.createElement('div');
      placeholder.className = 'neodb-cover-placeholder';
      placeholder.textContent = CATEGORY_EMOJIS[item.item.category] || '\u{1F4C3}';
      cover.appendChild(placeholder);
    }
    a.appendChild(cover);

    // Body
    var body = document.createElement('div');
    body.className = 'neodb-card-body';

    // Title
    var title = document.createElement('h3');
    title.className = 'neodb-card-title';
    title.textContent = item.item.display_title || item.item.title;
    body.appendChild(title);

    // Rating row
    var config = window.neodbConfig;
    if (item.item.rating || item.rating_user) {
      var ratingRow = document.createElement('div');
      ratingRow.className = 'neodb-card-meta';

      if (item.item.rating) {
        var starsDiv = document.createElement('div');
        starsDiv.className = 'neodb-stars';
        var stars5 = Math.round(parseFloat(item.item.rating) / 2);
        starsDiv.appendChild(renderStars(stars5));
        ratingRow.appendChild(starsDiv);

        var ratingVal = document.createElement('span');
        ratingVal.className = 'neodb-rating-value';
        ratingVal.textContent = item.item.rating;
        ratingRow.appendChild(ratingVal);
      }

      if (item.rating_user) {
        var myBadge = document.createElement('span');
        myBadge.className = 'neodb-my-rating';
        myBadge.textContent = '★' + item.rating_user;
        ratingRow.appendChild(myBadge);
      }

      body.appendChild(ratingRow);
    }

    // Comment
    if (item.comment) {
      var comment = document.createElement('p');
      comment.className = 'neodb-card-comment';
      comment.textContent = truncate(item.comment, 120);
      body.appendChild(comment);
    }

    a.appendChild(body);
    return a;
  }

  function renderFilters() {
    var config = window.neodbConfig;
    if (categoryFilterEl) {
      categoryFilterEl.innerHTML = '';
      CATEGORIES.forEach(function (cat) {
        var btn = document.createElement('button');
        btn.className = 'neodb-filter-btn' + (cat.key === activeCategory ? ' active' : '');
        btn.textContent = config.labels[cat.labelKey] || cat.labelKey;
        btn.setAttribute('data-category', cat.key);
        btn.addEventListener('click', function () {
          if (cat.key === activeCategory) return;
          activeCategory = cat.key;
          resetAndFetch();
        });
        categoryFilterEl.appendChild(btn);
      });
    }

    if (typeFilterEl) {
      typeFilterEl.innerHTML = '';
      TYPES.forEach(function (t) {
        var btn = document.createElement('button');
        btn.className = 'neodb-filter-btn' + (t.key === activeType ? ' active' : '');
        btn.textContent = config.labels[t.labelKey] || t.labelKey;
        btn.setAttribute('data-type', t.key);
        btn.addEventListener('click', function () {
          if (t.key === activeType) return;
          activeType = t.key;
          resetAndFetch();
        });
        typeFilterEl.appendChild(btn);
      });
    }
  }

  function updateFilterButtons() {
    if (categoryFilterEl) {
      var catBtns = categoryFilterEl.querySelectorAll('.neodb-filter-btn');
      catBtns.forEach(function (btn) {
        var isActive = btn.getAttribute('data-category') === activeCategory;
        btn.className = 'neodb-filter-btn' + (isActive ? ' active' : '');
      });
    }
    if (typeFilterEl) {
      var typeBtns = typeFilterEl.querySelectorAll('.neodb-filter-btn');
      typeBtns.forEach(function (btn) {
        var isActive = btn.getAttribute('data-type') === activeType;
        btn.className = 'neodb-filter-btn' + (isActive ? ' active' : '');
      });
    }
  }

  function fetchItems(page) {
    if (loading) return;
    loading = true;
    var currentFetchId = ++fetchId;
    var config = window.neodbConfig;

    var url = config.apiUrl + '/shelf/' + activeType + '?page=' + page;
    if (activeCategory) {
      url += '&category=' + activeCategory;
    }

    showLoader();
    if (loadMoreBtn) loadMoreBtn.hidden = true;

    var timeoutId = setTimeout(function () {
      loading = false;
      if (currentFetchId === fetchId) {
        showError(config.labels.error || 'Request timed out');
      }
    }, 15000);

    fetch(url)
      .then(function (r) {
        clearTimeout(timeoutId);
        if (!r.ok) throw new Error('API returned ' + r.status);
        return r.json();
      })
      .then(function (data) {
        if (!container || !container.parentNode) return;
        if (currentFetchId !== fetchId) return;

        hideLoader();

        if (!data.data || data.data.length === 0) {
          // No items on this page. If we have nothing rendered at all,
          // surface the "no results" state explicitly.
          if (grid.querySelectorAll('.neodb-card').length === 0) {
            showNoResults();
          } else if (loadMoreBtn) {
            loadMoreBtn.hidden = true;
          }
          return;
        }

        totalPages = data.pages || 1;
        currentPage = page;

        data.data.forEach(function (item) {
          allItems.push(item);
          grid.appendChild(createCard(item));
        });

        if (page < totalPages) {
          if (loadMoreBtn) {
            loadMoreBtn.textContent = config.labels.loadMore || 'Load More';
            loadMoreBtn.hidden = false;
          }
        } else {
          if (loadMoreBtn) loadMoreBtn.hidden = true;
        }
      })
      .catch(function (err) {
        if (!container || !container.parentNode) return;
        if (currentFetchId !== fetchId) return;
        showError(config.labels.error || 'Failed to load');
      })
      .finally(function () {
        loading = false;
      });
  }

  function resetAndFetch() {
    allItems = [];
    currentPage = 1;
    grid.innerHTML = '';
    hideAll();
    updateFilterButtons();
    fetchItems(1);
  }

  function init() {
    // Re-query DOM elements on every init (SPA may have replaced them)
    if (!queryElements()) return;
    if (!window.neodbConfig || !window.neodbConfig.apiUrl) return;

    allItems = [];
    currentPage = 1;
    totalPages = 1;
    loading = false;
    fetchId = 0;
    activeCategory = '';
    activeType = 'complete';
    grid.innerHTML = '';
    hideAll();
    renderFilters();

    // Rebind Load More button
    if (loadMoreBtn) {
      loadMoreBtn.onclick = function () {
        if (currentPage < totalPages) {
          fetchItems(currentPage + 1);
        }
      };
    }

    fetchItems(1);
  }

  // Expose for SPA re-init (template handles calling it)
  window.initNeoDB = init;
})();
