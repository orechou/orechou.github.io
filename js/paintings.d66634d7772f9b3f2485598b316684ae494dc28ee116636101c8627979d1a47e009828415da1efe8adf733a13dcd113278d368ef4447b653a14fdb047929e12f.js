/**
 * Paintings masonry + modal. Exposed as window.initPaintings; the template
 * owns the call so that SPA re-init runs it after each navigation without
 * leaking event listeners.
 */
window.initPaintings = function () {
  var container = document.getElementById('paintings');
  if (!container) return;

  var masonry = container.querySelector('.paintings-masonry');
  var loader = container.querySelector('.paintings-loader');
  var filterBar = container.querySelector('.paintings-filter');
  var modal = document.getElementById('paintingModal');

  // If we've already bound listeners to these DOM nodes, skip re-init.
  if (masonry && masonry.dataset.paintingsBound === '1') return;
  if (masonry) masonry.dataset.paintingsBound = '1';

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

    var cardImage = document.createElement('div');
    cardImage.className = 'painting-card-image';
    if (item.image) {
      var img = document.createElement('img');
      img.src = item.image;
      img.alt = item.title || '';
      img.loading = 'lazy';
      img.decoding = 'async';
      cardImage.appendChild(img);
    } else {
      var placeholder = document.createElement('div');
      placeholder.className = 'painting-placeholder';
      placeholder.textContent = '🎨';
      cardImage.appendChild(placeholder);
    }
    card.appendChild(cardImage);

    var overlay = document.createElement('div');
    overlay.className = 'painting-card-overlay';
    var title = document.createElement('h3');
    title.className = 'painting-card-title';
    title.textContent = item.title || '';
    overlay.appendChild(title);
    if (item.tags && item.tags.length) {
      var tags = document.createElement('div');
      tags.className = 'painting-card-tags';
      item.tags.slice(0, 3).forEach(function (t) {
        var tag = document.createElement('span');
        tag.className = 'painting-tag';
        tag.textContent = t;
        tags.appendChild(tag);
      });
      overlay.appendChild(tags);
    }
    card.appendChild(overlay);

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

    waitForImages().then(function () {
      void document.documentElement.offsetHeight;
      if (document.documentElement.scrollHeight <= window.innerHeight + 300) {
        loadMore(true);
      }
    });
  }

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

  function openModal(index) {
    var item = paintingsData[index];
    if (!item || !modal) return;

    var modalImg = modal.querySelector('.painting-modal-image img');
    modalImg.src = item.image || '';
    modalImg.alt = item.title || '';
    modal.querySelector('.painting-modal-title').textContent = item.title || '';

    var metaEl = modal.querySelector('.painting-modal-meta');
    metaEl.textContent = '';
    if (item.date) {
      var t = document.createElement('time');
      t.textContent = item.date;
      metaEl.appendChild(t);
    }
    if (item.model) {
      var sep = document.createElement('span');
      sep.className = 'meta-sep';
      sep.textContent = '·';
      var model = document.createElement('span');
      model.className = 'painting-model';
      model.textContent = item.model;
      metaEl.appendChild(sep);
      metaEl.appendChild(model);
    }

    var descEl = modal.querySelector('.painting-description');
    descEl.textContent = item.description || '';
    descEl.style.display = item.description ? '' : 'none';

    var infoEl = modal.querySelector('.painting-modal-info');
    infoEl.textContent = '';

    var labels = window.paintingsConfig && window.paintingsConfig.labels ? window.paintingsConfig.labels : {};
    function appendInfo(heading, body) {
      var wrap = document.createElement('div');
      wrap.className = 'painting-info-item';
      var h = document.createElement('h3');
      h.textContent = heading;
      var d = document.createElement('div');
      d.className = 'painting-prompt';
      d.textContent = body;
      wrap.appendChild(h);
      wrap.appendChild(d);
      infoEl.appendChild(wrap);
    }

    if (item.prompt) appendInfo(labels.prompt || 'Prompt', item.prompt);
    if (item.negative_prompt) appendInfo(labels.negativePrompt || 'Negative Prompt', item.negative_prompt);
    if (item.parameters && Object.keys(item.parameters).length) {
      var table = document.createElement('table');
      table.className = 'painting-params';
      for (var key in item.parameters) {
        var tr = document.createElement('tr');
        var k = document.createElement('td');
        k.className = 'param-key';
        k.textContent = key;
        var v = document.createElement('td');
        v.className = 'param-val';
        v.textContent = item.parameters[key];
        tr.appendChild(k);
        tr.appendChild(v);
        table.appendChild(tr);
      }
      infoEl.appendChild(table);
    }
    infoEl.style.display = infoEl.children.length ? '' : 'none';

    var tagsEl = modal.querySelector('.painting-modal-tags');
    tagsEl.textContent = '';
    if (item.tags && item.tags.length) {
      item.tags.forEach(function (t) {
        var tag = document.createElement('span');
        tag.className = 'painting-tag';
        tag.textContent = t;
        tagsEl.appendChild(tag);
      });
    }
    tagsEl.style.display = tagsEl.children.length ? '' : 'none';

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    var active = document.getElementById('paintingModal');
    if (!active) return;
    active.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (modal) {
    modal.querySelector('.painting-modal-overlay').addEventListener('click', closeModal);
    modal.querySelector('.painting-modal-close').addEventListener('click', closeModal);
  }

  // Single global Escape handler, only bound once. closeModal re-queries the
  // live modal so it still works after SPA swaps replace the node.
  if (!window._paintingsEscBound) {
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeModal();
    });
    window._paintingsEscBound = true;
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
  } else {
    hideLoader();
  }
};

// Auto-init on first load. SPA re-init is handled by the template's inline
// script which injects this file on navigation to /paintings and calls
// window.initPaintings() after paintingsData is set.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', window.initPaintings);
} else {
  window.initPaintings();
}
