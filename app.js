/**
 * Seamless SPA Router with Native Android View Transitions
 * Handles async navigation, state management, and persistent UI elements
 */

const state = {
  notes: [],
  prompts: [],
  settings: {
    theme: 'light'
  }
};

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const ROUTES = {
  '/': { page: 'index.html', id: 'dashboard' },
  '/notes': { page: 'notes.html', id: 'notes' },
  '/prompts': { page: 'prompts.html', id: 'prompts' },
  '/gemini': { page: 'gemini.html', id: 'gemini' },
  '/vault': { page: 'nexus-vault.html', id: 'vault' }
};

let currentRoute = window.location.pathname || '/';
let isNavigating = false;
let pageTimers = [];

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  loadData();
  setupThemeToggle();
  setupDelegation();
  setupPromptSearch();
  initRouter();
  renderNotes();
  renderPrompts();
  renderGeminiPreview();
  renderLibraryPreview();
  updateHomeStats();
});

document.addEventListener('click', (e) => {
  const target = e.target.closest('a[href]');
  if (!target) return;

  const href = target.getAttribute('href');
  if (!href || href.startsWith('http') || href.startsWith('mailto:') || href === '#') return;

  e.preventDefault();
  navigateTo(href);
});

function initRouter() {
  window.addEventListener('popstate', () => {
    const route = window.location.pathname || '/';
    clearPageTimers();
    loadRoute(route, false);
  });
}

function navigateTo(route) {
  if (isNavigating || route === currentRoute) return;

  isNavigating = true;
  currentRoute = route;
  history.pushState(null, '', route);
  clearPageTimers();
  loadRoute(route, true);
}

async function loadRoute(route, animate = true) {
  const routeConfig = ROUTES[route] || ROUTES['/'];
  const mainContainer = document.querySelector('#main-content');
  
  if (!mainContainer) {
    console.error('No main container found');
    isNavigating = false;
    return;
  }

  try {
    const response = await fetch(routeConfig.page);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    const newContent = doc.querySelector('main, #main-content');
    if (!newContent) throw new Error('No main content found');

    if (document.startViewTransition && animate) {
      document.startViewTransition(() => {
        mainContainer.innerHTML = newContent.innerHTML;
      });
    } else {
      mainContainer.innerHTML = newContent.innerHTML;
    }
    
    syncNavigation();
    
    setTimeout(() => {
      renderNotes();
      renderPrompts();
      renderGeminiPreview();
      renderLibraryPreview();
      updateHomeStats();
    }, 50);
    
  } catch (error) {
    console.error('Navigation error:', error);
    mainContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">Error loading page</div>';
  } finally {
    isNavigating = false;
  }
}

function syncNavigation() {
  const navItems = document.querySelectorAll('[data-nav-item]');
  navItems.forEach((item) => {
    const route = item.getAttribute('data-nav-item');
    const isActive = route === currentRoute || (route === '/' && (currentRoute === '/' || currentRoute === ''));
    item.classList.toggle('active', isActive);
    item.setAttribute('aria-current', isActive ? 'page' : 'false');
  });
}

function clearPageTimers() {
  pageTimers.forEach(id => clearTimeout(id));
  pageTimers = [];
}

function registerTimer(id) {
  pageTimers.push(id);
}

function initTheme() {
  const saved = localStorage.getItem('app-theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  state.settings.theme = saved;
  updateThemeToggle();
}

function updateThemeToggle() {
  $$('#themeToggle').forEach(toggle => {
    toggle.textContent = state.settings.theme === 'dark' ? 'Light theme' : 'Dark theme';
  });
}

function setupThemeToggle() {
  document.addEventListener('click', (e) => {
    if (e.target.closest('#themeToggle')) {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('app-theme', next);
      state.settings.theme = next;
      updateThemeToggle();
    }
  });
}

function loadData() {
  try {
    const saved = localStorage.getItem('app-data');
    if (saved) {
      const data = JSON.parse(saved);
      state.notes = data.notes || [];
      state.prompts = data.prompts || [];
    }
  } catch (e) {
    console.error('Failed to load data:', e);
  }
}

function saveData() {
  try {
    localStorage.setItem('app-data', JSON.stringify({
      notes: state.notes,
      prompts: state.prompts
    }));
  } catch (e) {
    console.error('Failed to save data:', e);
  }
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    bottom: max(20px, env(safe-area-inset-bottom, 20px));
    left: 50%;
    transform: translateX(-50%);
    background: var(--surface-raised);
    color: var(--text-primary);
    padding: 12px 18px;
    border-radius: var(--radius-pill);
    box-shadow: var(--shadow-raised-md);
    font-size: 12px;
    font-weight: 600;
    z-index: 1000;
    animation: slideIn var(--dur-fast) var(--ease-smooth);
    pointer-events: none;
    max-width: calc(100vw - 40px);
    word-wrap: break-word;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  const hideTimer = setTimeout(() => {
    toast.style.animation = 'slideOut var(--dur-fast) var(--ease-smooth)';
    const removeTimer = setTimeout(() => toast.remove(), 120);
    registerTimer(removeTimer);
  }, 2000);
  registerTimer(hideTimer);
}

function copyToClipboard(text) {
  return navigator.clipboard.writeText(text)
    .then(() => {
      showToast('✓ Copied to clipboard');
      return true;
    })
    .catch(() => {
      showToast('✗ Failed to copy');
      return false;
    });
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '\"': '&quot;',
    "'": '&#39;'
  };
  return text.replace(/[&<>\"']/g, c => map[c]);
}

function saveNote() {
  const titleInput = $('#noteTitle');
  const bodyInput = $('#noteBody');
  
  if (!titleInput || !bodyInput) return;
  
  const title = titleInput.value.trim();
  const body = bodyInput.value.trim();
  
  if (!title && !body) {
    showToast('Note is empty');
    return;
  }
  
  const note = {
    id: Date.now().toString(),
    title: title || 'Untitled',
    body: body,
    timestamp: new Date().toISOString()
  };
  
  state.notes.unshift(note);
  saveData();
  titleInput.value = '';
  bodyInput.value = '';
  renderNotes();
  showToast('✓ Note saved');
  
  const btn = $('#saveNoteBtn');
  if (btn) {
    btn.classList.add('active');
    const timer = setTimeout(() => btn.classList.remove('active'), 1500);
    registerTimer(timer);
  }
}

function clearNoteForm() {
  const titleInput = $('#noteTitle');
  const bodyInput = $('#noteBody');
  if (titleInput) titleInput.value = '';
  if (bodyInput) bodyInput.value = '';
  showToast('Form cleared');
}

function renderNotes() {
  const list = $('#notesList');
  if (!list) return;
  
  if (state.notes.length === 0) {
    list.innerHTML = '<div style="color: var(--text-muted); text-align: center; padding: 20px; font-size: 13px;">No notes yet. Create one to get started!</div>';
    return;
  }
  
  list.innerHTML = state.notes.map(note => `
    <div class="stack-list-item" data-action="note-item" data-id="${note.id}">
      <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 6px;">${escapeHtml(note.title)}</div>
      <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.5; margin-bottom: 8px; white-space: pre-wrap; word-wrap: break-word;">${escapeHtml(note.body.substring(0, 100))}${note.body.length > 100 ? '...' : ''}</div>
      <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 10px;">${new Date(note.timestamp).toLocaleDateString()}</div>
      <div style="display: flex; gap: 8px;">
        <button class="ghost-btn" data-action="edit-note" data-id="${note.id}" style="flex: 1; font-size: 11px; padding: 8px 10px;">✎ Edit</button>
        <button class="ghost-btn" data-action="delete-note" data-id="${note.id}" style="flex: 1; font-size: 11px; padding: 8px 10px; color: #ef4444;">✕ Delete</button>
      </div>
    </div>
  `).join('');
}

function deleteNote(id) {
  state.notes = state.notes.filter(n => n.id !== id);
  saveData();
  renderNotes();
  showToast('✓ Note deleted');
}

function editNote(id) {
  const note = state.notes.find(n => n.id === id);
  if (note) {
    const titleInput = $('#noteTitle');
    const bodyInput = $('#noteBody');
    if (titleInput) titleInput.value = note.title;
    if (bodyInput) bodyInput.value = note.body;
    deleteNote(id);
    window.scrollTo(0, 0);
  }
}

function savePrompt() {
  const titleInput = $('#promptTitle');
  const bodyInput = $('#promptBody');
  
  if (!titleInput || !bodyInput) return;
  
  const title = titleInput.value.trim();
  const body = bodyInput.value.trim();
  
  if (!title && !body) {
    showToast('Prompt is empty');
    return;
  }
  
  const prompt = {
    id: Date.now().toString(),
    title: title || 'Untitled Prompt',
    body: body,
    timestamp: new Date().toISOString()
  };
  
  state.prompts.unshift(prompt);
  saveData();
  titleInput.value = '';
  bodyInput.value = '';
  const searchInput = $('#promptSearch');
  if (searchInput) searchInput.value = '';
  renderPrompts();
  showToast('✓ Prompt saved');
  
  const btn = $('#savePromptBtn');
  if (btn) {
    btn.classList.add('active');
    const timer = setTimeout(() => btn.classList.remove('active'), 1500);
    registerTimer(timer);
  }
}

function clearPromptForm() {
  const titleInput = $('#promptTitle');
  const bodyInput = $('#promptBody');
  const searchInput = $('#promptSearch');
  if (titleInput) titleInput.value = '';
  if (bodyInput) bodyInput.value = '';
  if (searchInput) searchInput.value = '';
  showToast('Form cleared');
}

function renderPrompts() {
  const list = $('#promptsList');
  if (!list) return;
  
  const searchTerm = ($('#promptSearch')?.value || '').toLowerCase();
  const filtered = state.prompts.filter(p => 
    p.title.toLowerCase().includes(searchTerm) ||
    p.body.toLowerCase().includes(searchTerm)
  );
  
  if (filtered.length === 0) {
    list.innerHTML = '<div style="color: var(--text-muted); text-align: center; padding: 20px; font-size: 13px;">No prompts found.</div>';
    return;
  }
  
  list.innerHTML = filtered.map(prompt => `
    <div class="stack-list-item" data-action="prompt-item" data-id="${prompt.id}">
      <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 6px;">${escapeHtml(prompt.title)}</div>
      <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.4; margin-bottom: 8px; font-family: 'JetBrains Mono', monospace; white-space: pre-wrap; word-wrap: break-word;">${escapeHtml(prompt.body.substring(0, 100))}${prompt.body.length > 100 ? '...' : ''}</div>
      <div style="display: flex; gap: 8px;">
        <button class="ghost-btn" data-action="copy-prompt" data-id="${prompt.id}" style="flex: 1; font-size: 11px; padding: 8px 10px;">📋 Copy</button>
        <button class="ghost-btn" data-action="edit-prompt" data-id="${prompt.id}" style="flex: 1; font-size: 11px; padding: 8px 10px;">✎ Edit</button>
        <button class="ghost-btn" data-action="delete-prompt" data-id="${prompt.id}" style="flex: 1; font-size: 11px; padding: 8px 10px; color: #ef4444;">✕ Delete</button>
      </div>
    </div>
  `).join('');
  updateLibraryStat();
}

function updateLibraryStat() {
  const stat = $('#libraryStat');
  if (stat) {
    stat.textContent = `Library items: ${state.prompts.length}`;
  }
}

function deletePrompt(id) {
  state.prompts = state.prompts.filter(p => p.id !== id);
  saveData();
  renderPrompts();
  showToast('✓ Prompt deleted');
}

function editPrompt(id) {
  const prompt = state.prompts.find(p => p.id === id);
  if (prompt) {
    const titleInput = $('#promptTitle');
    const bodyInput = $('#promptBody');
    if (titleInput) titleInput.value = prompt.title;
    if (bodyInput) bodyInput.value = prompt.body;
    deletePrompt(id);
    window.scrollTo(0, 0);
  }
}

function copyPrompt(id) {
  const prompt = state.prompts.find(p => p.id === id);
  if (prompt) {
    copyToClipboard(prompt.body);
  }
}

function setupDelegation() {
  document.addEventListener('click', (e) => {
    const action = e.target.closest('[data-action]')?.dataset.action;
    const id = e.target.closest('[data-id]')?.dataset.id;
    
    if (!action) return;
    
    if (action === 'save-note') {
      e.preventDefault();
      saveNote();
    }
    if (action === 'clear-note') {
      e.preventDefault();
      clearNoteForm();
    }
    if (action === 'edit-note' && id) {
      e.preventDefault();
      editNote(id);
    }
    if (action === 'delete-note' && id) {
      e.preventDefault();
      deleteNote(id);
    }
    if (action === 'save-prompt') {
      e.preventDefault();
      savePrompt();
    }
    if (action === 'clear-prompt') {
      e.preventDefault();
      clearPromptForm();
    }
    if (action === 'edit-prompt' && id) {
      e.preventDefault();
      editPrompt(id);
    }
    if (action === 'delete-prompt' && id) {
      e.preventDefault();
      deletePrompt(id);
    }
    if (action === 'copy-prompt' && id) {
      e.preventDefault();
      copyPrompt(id);
      e.target.closest('[data-action]').classList.add('active');
      const timer = setTimeout(() => e.target.closest('[data-action]').classList.remove('active'), 1500);
      registerTimer(timer);
    }
    if (action === 'copy-gemini') {
      e.preventDefault();
      const textarea = $('#geminiPrompt');
      if (textarea && textarea.value.trim()) {
        copyToClipboard(textarea.value);
        e.target.closest('[data-action]').classList.add('active');
        const timer = setTimeout(() => e.target.closest('[data-action]').classList.remove('active'), 1500);
        registerTimer(timer);
      } else {
        showToast('Prompt is empty');
      }
    }
    if (action === 'open-gemini') {
      e.preventDefault();
      const textarea = $('#geminiPrompt');
      if (textarea && textarea.value.trim()) {
        window.open('https://gemini.google.com', '_blank');
      } else {
        showToast('Draft a prompt first');
      }
    }
  });
}

function setupPromptSearch() {
  document.addEventListener('input', (e) => {
    if (e.target.closest('#promptSearch')) {
      renderPrompts();
    }
  });
}

function updateHomeStats() {
  const noteCount = $('#noteCount');
  if (noteCount) noteCount.textContent = state.notes.length;
  const promptCount = $('#promptCount');
  if (promptCount) promptCount.textContent = state.prompts.length;
}

function renderGeminiPreview() {
  const preview = $('#geminiPromptPreview');
  if (!preview) return;
  if (state.prompts.length === 0) {
    preview.innerHTML = '<div style="color: var(--text-muted); text-align: center; padding: 20px; font-size: 13px;">No saved prompts to preview.</div>';
    return;
  }
  preview.innerHTML = state.prompts.slice(0, 3).map(prompt => `
    <div class="stack-list-item">
      <div style="font-weight: 600; color: var(--text-primary); font-size: 13px; margin-bottom: 4px;">${escapeHtml(prompt.title)}</div>
      <div style="font-size: 11px; color: var(--text-secondary);">${escapeHtml(prompt.body.substring(0, 60))}...</div>
    </div>
  `).join('');
}

function renderLibraryPreview() {
  const preview = $('#libraryPreview');
  if (!preview) return;
  if (state.prompts.length === 0) {
    preview.innerHTML = '<div style="color: var(--text-muted); text-align: center; padding: 20px; font-size: 13px;">No prompts saved yet. Create one in the Prompts section.</div>';
    return;
  }
  preview.innerHTML = state.prompts.slice(0, 2).map(prompt => `
    <div class="stack-list-item">
      <div style="font-weight: 600; color: var(--text-primary); font-size: 13px; margin-bottom: 4px;">${escapeHtml(prompt.title)}</div>
      <div style="font-size: 11px; color: var(--text-secondary);">${escapeHtml(prompt.body.substring(0, 60))}...</div>
    </div>
  `).join('');
}
