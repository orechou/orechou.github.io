/**
 * Modern vanilla JavaScript replacement for main.js
 * Removes jQuery dependency while maintaining all functionality
 */

(function() {
  'use strict';

  /**
   * Throttle function for scroll performance
   */
  function throttle(func, wait) {
    let timeout;
    return function() {
      const context = this;
      const args = arguments;
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(context, args), wait);
    };
  }

  /**
   * Initialize native CSS Grid gallery
   */
  function initGallery() {
    const gallery = document.querySelector('.article-gallery');
    if (!gallery) return;

    // Add class for CSS Grid styling
    gallery.classList.add('native-gallery');

    // Optional: Add lightbox functionality
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

  /**
   * Simple lightbox for gallery images
   */
  function openLightbox(src, alt) {
    const existing = document.querySelector('.lightbox');
    if (existing) existing.remove();

    const lightbox = document.createElement('div');
    lightbox.className = 'lightbox';
    lightbox.innerHTML = `
      <div class="lightbox-overlay" onclick="this.parentElement.remove()"></div>
      <div class="lightbox-content">
        <img src="${src}" alt="${alt || ''}">
        <button class="lightbox-close" onclick="this.closest('.lightbox').remove()">&times;</button>
      </div>
    `;
    document.body.appendChild(lightbox);
    document.body.style.overflow = 'hidden';
  }

  /**
   * Mobile navigation toggle
   */
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

  /**
   * Detect system theme preference (prefers-color-scheme)
   * @returns {string} 'dark' | 'light'
   */
  function detectSystemTheme() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }

  /**
   * Update theme switch state
   * @param {HTMLInputElement} checkbox - The switch checkbox
   * @param {string} theme - The current theme ('dark' | 'light')
   */
  function updateThemeSwitch(checkbox, theme) {
    const thumb = checkbox.parentElement.querySelector('.switch-thumb');
    checkbox.checked = (theme === 'dark');

    if (thumb) {
      thumb.textContent = theme === 'dark' ? '🌙' : '☀️';
    }
  }

  /**
   * Toggle theme between dark and light
   * @param {HTMLInputElement} checkbox - The switch checkbox
   */
  function toggleTheme(checkbox) {
    const currentBodyClass = document.body.className;
    const isDark = currentBodyClass.includes('theme-dark');

    // Remove all theme classes from both html and body
    document.documentElement.classList.remove('theme-dark', 'theme-light');
    document.body.classList.remove('theme-dark', 'theme-light');

    // Apply new theme
    if (isDark) {
      // Switch to light
      document.documentElement.classList.add('theme-light');
      document.body.classList.add('theme-light');
      localStorage.setItem('theme', 'light');
      updateThemeSwitch(checkbox, 'light');
    } else {
      // Switch to dark
      document.documentElement.classList.add('theme-dark');
      document.body.classList.add('theme-dark');
      localStorage.setItem('theme', 'dark');
      updateThemeSwitch(checkbox, 'dark');
    }

    // Mark that user has manually selected a theme
    localStorage.setItem('manual-theme-selection', 'true');
  }

  /**
   * Create theme toggle switch (iOS-style)
   * @param {string|null} currentTheme - Current theme
   * @param {string} systemTheme - System theme ('dark' | 'light')
   * @returns {HTMLElement} The created switch element
   */
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

    // Change handler for theme toggle
    checkbox.addEventListener('change', function() {
      // Remove all theme classes first
      document.documentElement.classList.remove('theme-dark', 'theme-light');
      document.body.classList.remove('theme-dark', 'theme-light');

      if (this.checked) {
        // Switch to dark
        document.documentElement.classList.add('theme-dark');
        document.body.classList.add('theme-dark');
        localStorage.setItem('theme', 'dark');
        thumb.textContent = '🌙';
      } else {
        // Switch to light
        document.documentElement.classList.add('theme-light');
        document.body.classList.add('theme-light');
        localStorage.setItem('theme', 'light');
        thumb.textContent = '☀️';
      }

      // Mark that user has manually selected a theme
      localStorage.setItem('manual-theme-selection', 'true');
    });

    // Initialize switch state
    const theme = currentTheme || systemTheme;
    updateThemeSwitch(checkbox, theme);

    return label;
  }

  /**
   * Handle system theme change
   * @param {MediaQueryListEvent} e - The media query change event
   */
  function handleSystemThemeChange(e) {
    // Only auto-switch if user hasn't manually selected a theme
    if (!localStorage.getItem('manual-theme-selection')) {
      const newTheme = e.matches ? 'dark' : 'light';

      // Remove all theme classes
      document.documentElement.classList.remove('theme-dark', 'theme-light');
      document.body.classList.remove('theme-dark', 'theme-light');

      // Apply new theme
      if (newTheme === 'dark') {
        document.documentElement.classList.add('theme-dark');
        document.body.classList.add('theme-dark');
      } else {
        document.documentElement.classList.add('theme-light');
        document.body.classList.add('theme-light');
      }

      localStorage.setItem('theme', newTheme);

      // Update switch
      const checkbox = document.querySelector('.theme-toggle-switch input');
      if (checkbox) {
        updateThemeSwitch(checkbox, newTheme);
      }
    }
  }

  /**
   * Theme switcher with localStorage persistence and system theme detection
   */
  function initThemeSwitcher() {
    // 1. Get system theme
    const systemTheme = detectSystemTheme();

    // 2. Get saved theme, if exists use it; otherwise use system theme
    let savedTheme = localStorage.getItem('theme');

    if (!savedTheme) {
      // First visit, use system theme
      savedTheme = systemTheme;
      localStorage.setItem('theme', savedTheme);
    }

    // 3. Apply theme (only to body, since html was already handled in head)
    document.body.classList.remove('theme-dark', 'theme-light');
    if (savedTheme && savedTheme !== 'default') {
      document.body.classList.add(`theme-${savedTheme}`);
    }

    // 4. Create theme switcher UI
    const themeSwitcher = document.querySelector('.theme-switcher');
    if (themeSwitcher) {
      const toggleBtn = createThemeToggleBtn(savedTheme, systemTheme);
      themeSwitcher.appendChild(toggleBtn);
    }

    // 5. Listen for system theme changes
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)')
        .addEventListener('change', handleSystemThemeChange);
    }
  }

  /**
   * Initialize all functionality on DOM ready
   */
  document.addEventListener('DOMContentLoaded', function() {
    initThemeSwitcher();
    initGallery();
    initMobileNav();
  });

  // Reinitialize after SPA navigation
  window.addEventListener('spa-content-loaded', function() {
    initGallery();
  });

})();
