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

  function updateThemeSwitch(checkbox, theme) {
    const thumb = checkbox.parentElement.querySelector('.switch-thumb');
    checkbox.checked = (theme === 'dark');
    if (thumb) {
      thumb.textContent = theme === 'dark' ? '🌙' : '☀️';
    }
  }

  function createThemeToggleBtn(currentTheme, systemTheme) {
    const label = document.createElement('label');
    label.className = 'theme-toggle-switch';
    label.setAttribute('aria-label', 'Toggle dark/light theme');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.setAttribute('aria-label', 'Dark mode');

    const track = document.createElement('span');
    track.className = 'switch-track';

    const thumb = document.createElement('span');
    thumb.className = 'switch-thumb';

    track.appendChild(thumb);
    label.appendChild(checkbox);
    label.appendChild(track);

    checkbox.addEventListener('change', function() {
      applyTheme(this.checked ? 'dark' : 'light');
      try { localStorage.setItem('manual-theme-selection', 'true'); } catch (e) {}
    });

    const theme = currentTheme || systemTheme;
    updateThemeSwitch(checkbox, theme);

    return label;
  }

  function handleSystemThemeChange(e) {
    // Only auto-switch if the user hasn't manually chosen a theme.
    let manual = false;
    try { manual = !!localStorage.getItem('manual-theme-selection'); } catch (e) {}
    if (manual) return;

    const newTheme = e.matches ? 'dark' : 'light';
    applyTheme(newTheme);
    const checkbox = document.querySelector('.theme-toggle-switch input');
    if (checkbox) updateThemeSwitch(checkbox, newTheme);
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

  document.addEventListener('DOMContentLoaded', function() {
    initThemeSwitcher();
    initGallery();
    initMobileNav();
  });

  // Reinitialize gallery after SPA navigation
  window.addEventListener('spa-content-loaded', function() {
    initGallery();
  });

})();
