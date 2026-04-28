(function () {
  var container = document.getElementById('paintings');
  if (!container) return;

  var masonry = container.querySelector('.paintings-masonry');
  var loader = container.querySelector('.paintings-loader');
  var filterBar = container.querySelector('.paintings-filter');
  var modal = document.getElementById('paintingModal');

  var paintingsData;
  var currentIndex = 0;
  var batchSize = 3;
  var loading = false;
  var activeFilter = '';

  function showLoader() {
    loader.style.display = 'flex';
  }

  function hideLoader() {
    loader.style.display = 'none';
  }

  function getColumns() {
    return Array.prototype.slice.call(
      masonry.querySelectorAll('.paintings-column')
    ).filter(function (col) {
      return getComputedStyle(col).display !== 'none';
    });
  }

  function getShortestColumn() {
    var cols = getColumns();
    if (cols.length === 0) return null;
    var shortest = cols[0];
    var minCount = shortest.children.length;
    for (var i = 1; i < cols.length; i++) {
      if (cols[i].children.length < minCount) {
        minCount = cols[i].children.length;
        shortest = cols[i];
      }
    }
    return shortest;
  }

  function createCard(item, index) {
    var card = document.createElement('div');
    card.className = 'painting-card';
    card.setAttribute('data-index', index);
    card.setAttribute('data-tags', (item.tags || []).join(','));

    var html = '<div class="painting-card-image">';
    if (item.image) {
      html += '<img src="' + item.image + '" alt="' + item.title + '" loading="lazy" decoding="async">';
    } else {
      html += '<div class="painting-placeholder">🎨</div>';
    }
    html += '</div>';
    html += '<div class="painting-card-overlay">';
    html += '<h3 class="painting-card-title">' + item.title + '</h3>';
    if (item.tags && item.tags.length) {
      html += '<div class="painting-card-tags">';
      item.tags.slice(0, 3).forEach(function (t) {
        html += '<span class="painting-tag">' + t + '</span>';
      });
      html += '</div>';
    }
    html += '</div>';

    card.innerHTML = html;
    return card;
  }

  function renderBatch() {
    var end = Math.min(currentIndex + batchSize, paintingsData.length);
    for (var i = currentIndex; i < end; i++) {
      var card = createCard(paintingsData[i], i);
      var col = getShortestColumn();
      if (col) col.appendChild(card);
    }
    currentIndex = end;
    filterCards();
  }

  function waitForImages() {
    var images = masonry.querySelectorAll('img');
    var pending = [];
    images.forEach(function (img) {
      if (img.complete) return;
      pending.push(new Promise(function (resolve) {
        img.addEventListener('load', resolve, { once: true });
        img.addEventListener('error', resolve, { once: true });
      }));
    });
    return pending.length > 0 ? Promise.all(pending) : Promise.resolve();
  }

  function loadMore(isAutoFill) {
    if (loading) return;
    if (currentIndex >= paintingsData.length) {
      hideLoader();
      window.removeEventListener('scroll', onScroll);
      return;
    }

    loading = true;
    showLoader();

    renderBatch();

    if (currentIndex >= paintingsData.length) {
      loading = false;
      hideLoader();
      window.removeEventListener('scroll', onScroll);
      return;
    }

    hideLoader();
    loading = false;

    if (!isAutoFill) return;

    // Auto-fill: wait for images then check if we should load more
    waitForImages().then(function () {
      // Force reflow before checking scrollHeight
      void document.documentElement.offsetHeight;
      if (document.documentElement.scrollHeight <= window.innerHeight + 300) {
        loadMore(true);
      }
    });
  }

  // Tag filtering
  function filterCards() {
    var cards = masonry.querySelectorAll('.painting-card');
    cards.forEach(function (card) {
      if (!activeFilter) {
        card.style.display = '';
        return;
      }
      var tags = (card.getAttribute('data-tags') || '').split(',');
      card.style.display = tags.indexOf(activeFilter) !== -1 ? '' : 'none';
    });
  }

  if (filterBar) {
    filterBar.addEventListener('click', function (e) {
      var btn = e.target.closest('.painting-filter-tag');
      if (!btn) return;

      var tag = btn.getAttribute('data-filter');

      if (tag && tag === activeFilter) {
        btn.classList.remove('active');
        var allBtn = filterBar.querySelector('[data-filter=""]');
        if (allBtn) allBtn.classList.add('active');
        activeFilter = '';
        filterCards();
        return;
      }

      filterBar.querySelectorAll('.painting-filter-tag').forEach(function (b) {
        b.classList.remove('active');
      });
      btn.classList.add('active');
      activeFilter = tag;
      filterCards();
    });
  }

  // Modal
  function openModal(index) {
    var item = paintingsData[index];
    if (!item || !modal) return;

    modal.querySelector('.painting-modal-image img').src = item.image || '';
    modal.querySelector('.painting-modal-image img').alt = item.title || '';
    modal.querySelector('.painting-modal-title').textContent = item.title || '';

    var metaHtml = '';
    if (item.date) metaHtml += '<time>' + item.date + '</time>';
    if (item.model) metaHtml += '<span class="meta-sep">·</span><span class="painting-model">' + item.model + '</span>';
    modal.querySelector('.painting-modal-meta').innerHTML = metaHtml;

    var descEl = modal.querySelector('.painting-description');
    descEl.textContent = item.description || '';
    descEl.style.display = item.description ? '' : 'none';

    var infoHtml = '';

    var infoHtml = '';
    if (item.prompt) {
      infoHtml += '<div class="painting-info-item"><h3>Prompt</h3><div class="painting-prompt">' + item.prompt + '</div></div>';
    }
    if (item.negative_prompt) {
      infoHtml += '<div class="painting-info-item"><h3>Negative Prompt</h3><div class="painting-prompt">' + item.negative_prompt + '</div></div>';
    }
    if (item.parameters && Object.keys(item.parameters).length) {
      infoHtml += '<table class="painting-params">';
      for (var key in item.parameters) {
        infoHtml += '<tr><td class="param-key">' + key + '</td><td class="param-val">' + item.parameters[key] + '</td></tr>';
      }
      infoHtml += '</table>';
    }
    var infoEl = modal.querySelector('.painting-modal-info');
    infoEl.innerHTML = infoHtml;
    infoEl.style.display = infoHtml ? '' : 'none';

    var tagsHtml = '';
    if (item.tags && item.tags.length) {
      item.tags.forEach(function (t) {
        tagsHtml += '<span class="painting-tag">' + t + '</span>';
      });
    }
    var tagsEl = modal.querySelector('.painting-modal-tags');
    tagsEl.innerHTML = tagsHtml;
    tagsEl.style.display = tagsHtml ? '' : 'none';

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (modal) {
    modal.querySelector('.painting-modal-overlay').addEventListener('click', closeModal);
    modal.querySelector('.painting-modal-close').addEventListener('click', closeModal);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeModal();
    });
  }

  masonry.addEventListener('click', function (e) {
    var card = e.target.closest('.painting-card');
    if (!card) return;
    var index = parseInt(card.getAttribute('data-index'), 10);
    if (!isNaN(index)) openModal(index);
  });

  function onScroll() {
    if (loading) return;
    if (currentIndex >= paintingsData.length) return;

    var scrollY = window.scrollY || window.pageYOffset;
    if (scrollY + window.innerHeight >= document.documentElement.scrollHeight - 300) {
      loadMore(false);
    }
  }

  paintingsData = window.paintingsData || [];
  if (paintingsData.length > 0) {
    window.addEventListener('scroll', onScroll, { passive: true });
    loadMore(true);
  }
})();
