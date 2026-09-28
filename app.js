/**
 * NeuroStack Mobile Application Controller
 * Handles tactile theme switching, state persistence, and mock counters
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'neurostack_active_theme';
  const DEFAULT_THEME = 'stealth';
  const VALID_THEMES = ['stealth', 'ceramic', 'silicone'];

  function initThemeController() {
    const savedTheme = localStorage.getItem(STORAGE_KEY);
    const activeTheme = VALID_THEMES.includes(savedTheme) ? savedTheme : DEFAULT_THEME;

    applyTheme(activeTheme);
    bindThemeSwitchers();
  }

  function applyTheme(themeName) {
    if (!VALID_THEMES.includes(themeName)) return;

    // Apply attribute to body
    document.body.setAttribute('data-theme', themeName);
    localStorage.setItem(STORAGE_KEY, themeName);

    // Synchronize topbar theme switcher
    const topbarButtons = document.querySelectorAll('.theme-switcher .theme-option');
    topbarButtons.forEach((btn) => {
      const isMatch = btn.getAttribute('data-theme-option') === themeName;
      btn.classList.toggle('active', isMatch);
      btn.setAttribute('aria-selected', isMatch ? 'true' : 'false');
    });

    // Synchronize demo panel segmented switch
    const demoButtons = document.querySelectorAll('.demo-switch .demo-switch-option');
    demoButtons.forEach((btn) => {
      const isMatch = btn.textContent.trim().toLowerCase() === themeName;
      btn.classList.toggle('active', isMatch);
    });
  }

  function bindThemeSwitchers() {
    // 1. Topbar switcher buttons
    const topbarButtons = document.querySelectorAll('.theme-switcher .theme-option');
    topbarButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const selected = btn.getAttribute('data-theme-option');
        if (selected) {
          applyTheme(selected);
        }
      });
    });

    // 2. Demo panel switcher buttons
    const demoButtons = document.querySelectorAll('.demo-switch .demo-switch-option');
    demoButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const themeLabel = btn.textContent.trim().toLowerCase();
        applyTheme(themeLabel);
      });
    });
  }

  function renderLibraryPreview() {
    const previewContainer = document.getElementById('libraryPreview');
    const noteCountEl = document.getElementById('noteCount');
    const promptCountEl = document.getElementById('promptCount');

    if (noteCountEl) noteCountEl.textContent = '14';
    if (promptCountEl) promptCountEl.textContent = '48';

    if (!previewContainer) return;

    const sampleItems = [
      {
        title: 'Android Architect â€” S24+ Build Pipeline',
        desc: 'Extracting ARM64 split APK manifests and optimizing Jetpack Compose tree traversals.'
      },
      {
        title: 'Chief Artificer â€” Volumetric Style Kit',
        desc: 'Cinematic 8K prompt reversing with high-specular reflective porcelain tokens.'
      },
      {
        title: 'Archivist of Dread â€” Found-Footage Lore Map',
        desc: 'Narrative tension nodes and analog camcorder glitch artifact filters.'
      }
    ];

    previewContainer.innerHTML = sampleItems
      .map(
        (item) => `
        <article class="stack-item">
          <h4>${item.title}</h4>
          <p>${item.desc}</p>
        </article>
      `
      )
      .join('');
  }

  document.addEventListener('DOMContentLoaded', () => {
    initThemeController();
    renderLibraryPreview();
  });
})();