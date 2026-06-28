/**
 * Modern vanilla JavaScript for theme switching, gallery, and mobile nav.
 * Theme classes live on <html> only; head.html's inline script sets the
 * initial class to prevent FOUC.
 */

(function() {
  'use strict';

  function detectSystemTheme() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }

  /**
   * Apply a theme ('dark' | 'light') to <html> and persist it.
   */
  function applyTheme(theme) {
    document.documentElement.classList.remove('theme-dark', 'theme-light');
    if (theme === 'dark' || theme === 'light') {
      document.documentElement.classList.add('theme-' + theme);
    }
    try {
      localStorage.setItem('theme', theme);
    } catch (e) {}
  }

  function themeIconClass(theme) {
    return theme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
  }

  // Update the toggle button's icon + aria to reflect `theme`. The button is
  // styled identically to the search trigger (see theme-toggle.scss) so the
  // two corner tools look like a matched pair.
  function updateThemeSwitch(button, theme) {
    if (!button) return;
    button.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
    var icon = button.querySelector('i');
    if (icon) icon.className = themeIconClass(theme);
  }

  function createThemeToggleBtn(currentTheme, systemTheme) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'theme-toggle';
    button.setAttribute('aria-label', 'Toggle dark/light theme');

    var icon = document.createElement('i');
    icon.className = 'fas fa-sun';
    icon.setAttribute('aria-hidden', 'true');
    button.appendChild(icon);

    button.addEventListener('click', function () {
      var goingDark = !document.documentElement.classList.contains('theme-dark');
      applyTheme(goingDark ? 'dark' : 'light');
      try { localStorage.setItem('manual-theme-selection', 'true'); } catch (e) {}
      updateThemeSwitch(button, goingDark ? 'dark' : 'light');
    });

    updateThemeSwitch(button, currentTheme || systemTheme);
    return button;
  }

  function handleSystemThemeChange(e) {
    // Only auto-switch if the user hasn't manually chosen a theme.
    let manual = false;
    try { manual = !!localStorage.getItem('manual-theme-selection'); } catch (e) {}
    if (manual) return;

    const newTheme = e.matches ? 'dark' : 'light';
    applyTheme(newTheme);
    const button = document.querySelector('.theme-toggle');
    if (button) updateThemeSwitch(button, newTheme);
  }

  function initThemeSwitcher() {
    const systemTheme = detectSystemTheme();
    let savedTheme = null;
    try { savedTheme = localStorage.getItem('theme'); } catch (e) {}

    if (!savedTheme) {
      savedTheme = systemTheme;
      applyTheme(savedTheme);
    }

    const themeSwitcher = document.querySelector('.theme-switcher');
    if (themeSwitcher) {
      const toggleBtn = createThemeToggleBtn(savedTheme, systemTheme);
      themeSwitcher.appendChild(toggleBtn);
    }

    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)')
        .addEventListener('change', handleSystemThemeChange);
    }
  }

  function initGallery() {
    const gallery = document.querySelector('.article-gallery');
    if (!gallery) return;
    gallery.classList.add('native-gallery');
    const items = gallery.querySelectorAll('.gallery-item');
    items.forEach(item => {
      item.addEventListener('click', function(e) {
        const img = this.querySelector('img');
        if (img) {
          e.preventDefault();
          openLightbox(img.src, img.alt);
        }
      });
    });
  }

  function openLightbox(src, alt) {
    const existing = document.querySelector('.lightbox');
    if (existing) existing.remove();

    const lightbox = document.createElement('div');
    lightbox.className = 'lightbox';
    const overlay = document.createElement('div');
    overlay.className = 'lightbox-overlay';
    overlay.addEventListener('click', () => lightbox.remove());
    const content = document.createElement('div');
    content.className = 'lightbox-content';
    const img = document.createElement('img');
    img.src = src;
    img.alt = alt || '';
    const close = document.createElement('button');
    close.className = 'lightbox-close';
    close.textContent = '×';
    close.addEventListener('click', () => lightbox.remove());
    content.appendChild(img);
    content.appendChild(close);
    lightbox.appendChild(overlay);
    lightbox.appendChild(content);
    document.body.appendChild(lightbox);
    document.body.style.overflow = 'hidden';
  }

  function initMobileNav() {
    const navIcon = document.querySelector('#header > #nav > ul > .icon');
    if (navIcon) {
      navIcon.addEventListener('click', function() {
        const nav = document.querySelector('#header > #nav > ul');
        if (nav) {
          nav.classList.toggle('responsive');
        }
      });
    }
  }

  // Click-to-zoom for inline content images (those rendered by the
  // render-image hook as <figure class="content-figure">). Reuses openLightbox.
  function initContentImages() {
    document.querySelectorAll('.content-figure img').forEach(function(img) {
      if (img.dataset.lightboxBound) return;
      img.dataset.lightboxBound = '1';
      img.addEventListener('click', function(e) {
        e.preventDefault();
        openLightbox(img.currentSrc || img.src, img.alt);
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function() {
    initThemeSwitcher();
    initGallery();
    initMobileNav();
    initContentImages();
  });

  // Reinitialize gallery + content images after SPA navigation
  window.addEventListener('spa-content-loaded', function() {
    initGallery();
    initContentImages();
  });

})();
