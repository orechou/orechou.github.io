(() => {
  'use strict';

  /**
   * Copy text to clipboard with fallback for older browsers
   * @param {string} text - Text to copy
   * @returns {Promise<void>}
   */
  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }

    // Fallback for older browsers
    return new Promise((resolve, reject) => {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();

      try {
        const successful = document.execCommand('copy');
        document.body.removeChild(textarea);
        if (successful) {
          resolve();
        } else {
          reject(new Error('Copy command failed'));
        }
      } catch (err) {
        document.body.removeChild(textarea);
        reject(err);
      }
    });
  }

  /**
   * Create a copy button for code block
   * @param {HTMLElement} codeNode - The code element
   * @param {string} copyLabel - Label for copy button
   * @param {string} copiedLabel - Label after copying
   * @returns {HTMLButtonElement}
   */
  function createCopyButton(codeNode, copyLabel, copiedLabel) {
    const copyBtn = document.createElement('button');
    copyBtn.className = 'code-copy-btn';
    copyBtn.type = 'button';
    copyBtn.textContent = copyLabel;
    copyBtn.setAttribute('aria-label', copyLabel);
    copyBtn.setAttribute('title', copyLabel);

    let resetTimer;

    copyBtn.addEventListener('click', () => {
      // Use textContent instead of innerText for better performance and security
      const codeText = codeNode.textContent || '';

      copyToClipboard(codeText)
        .then(() => {
          copyBtn.textContent = copiedLabel;
          copyBtn.setAttribute('aria-label', copiedLabel);
          copyBtn.classList.add('copied');

          clearTimeout(resetTimer);
          resetTimer = setTimeout(() => {
            copyBtn.textContent = copyLabel;
            copyBtn.setAttribute('aria-label', copyLabel);
            copyBtn.classList.remove('copied');
          }, 2000);
        })
        .catch((err) => {
          console.error('Failed to copy code:', err);
          copyBtn.textContent = 'error';
          setTimeout(() => {
            copyBtn.textContent = copyLabel;
          }, 1500);
        });
    });

    return copyBtn;
  }

  /**
   * Initialize copy buttons for all code blocks
   */
  function initCopyButtons() {
    // Get i18n labels from data attributes or use defaults
    const copyLabel = document.documentElement.dataset.copyLabel || 'Copy';
    const copiedLabel = document.documentElement.dataset.copiedLabel || 'Copied!';

    // Find all code blocks (excluding line number columns)
    const codeBlocks = document.querySelectorAll('.highlight pre > code, pre > code');

    codeBlocks.forEach((codeNode) => {
      // Skip if button already exists
      if (codeNode.parentNode.querySelector('.code-copy-btn')) {
        return;
      }

      // Skip if inside line number column (first td)
      const parentTd = codeNode.closest('td');
      if (parentTd) {
        const parentRow = parentTd.parentElement;
        if (parentRow && parentRow.firstElementChild === parentTd) {
          return; // Skip first column (line numbers)
        }
      }

      const copyBtn = createCopyButton(codeNode, copyLabel, copiedLabel);
      const preNode = codeNode.parentNode;
      preNode.style.position = 'relative';
      preNode.insertBefore(copyBtn, codeNode);
    });
  }

  // Initialize on DOM content loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCopyButtons);
  } else {
    initCopyButtons();
  }

  // Re-initialize after SPA navigation.
  window.addEventListener('spa-content-loaded', initCopyButtons);

})();
