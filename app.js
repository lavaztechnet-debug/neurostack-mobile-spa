const state = {
  notes: [],
  prompts: [],
  settings: {
    theme: 'light'
  }
};

// Utility: Query selectors
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// Initialize theme
function initTheme() {
  const saved = localStorage.getItem('app-theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  state.settings.theme = saved;
  updateThemeToggle();
}

function updateThemeToggle() {
  const toggle = $('#themeToggle');
  if (toggle) {
    toggle.textContent = state.settings.theme === 'dark' ? 'Light theme' : 'Dark theme';
  }
}

// Theme toggle
function setupThemeToggle() {
  const toggle = $('#themeToggle');
  if (toggle) {
    toggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('app-theme', next);
      state.settings.theme = next;
      updateThemeToggle();
    });
  }
}

// Load from localStorage
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

// Save to localStorage
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

// Toast notification
function showToast(message) {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--surface-raised);
    color: var(--text-primary);
    padding: 12px 20px;
    border-radius: var(--radius-pill);
    box-shadow: var(--shadow-raised-md);
    font-size: 13px;
    font-weight: 600;
    z-index: 1000;
    animation: slideIn 0.2s ease-out;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.2s ease-out';
    setTimeout(() => toast.remove(), 200);
  }, 2000);
}

// Copy to clipboard
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

// Save note
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
}

// Clear note form
function clearNoteForm() {
  const titleInput = $('#noteTitle');
  const bodyInput = $('#noteBody');
  
  if (titleInput) titleInput.value = '';
  if (bodyInput) bodyInput.value = '';
}

// Render notes list
function renderNotes() {
  const list = $('#notesList');
  if (!list) return;
  
  if (state.notes.length === 0) {
    list.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px;">No notes yet. Create one to get started!</p>';
    return;
  }
  
  list.innerHTML = state.notes.map(note => `
    <div class="stack-list-item" data-note-id="${note.id}">
      <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 6px;">${escapeHtml(note.title)}</div>
      <div style="font-size: 13px; color: var(--text-secondary); line-height: 1.5; margin-bottom: 8px;">${escapeHtml(note.body)}</div>
      <div style="font-size: 11px; color: var(--text-muted);">${new Date(note.timestamp).toLocaleDateString()}</div>
      <div style="margin-top: 12px; display: flex; gap: 8px;">
        <button class="ghost-btn edit-note-btn" data-note-id="${note.id}" style="flex: 1; font-size: 12px; padding: 8px 12px;">Edit</button>
        <button class="ghost-btn delete-note-btn" data-note-id="${note.id}" style="flex: 1; font-size: 12px; padding: 8px 12px; color: #ef4444;">Delete</button>
      </div>
    </div>
  `).join('');
}

// Delete note
function deleteNote(id) {
  state.notes = state.notes.filter(n => n.id !== id);
  saveData();
  renderNotes();
  showToast('✓ Note deleted');
}

// Edit note
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

// Save prompt
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
  
  renderPrompts();
  showToast('✓ Prompt saved');
}

// Clear prompt form
function clearPromptForm() {
  const titleInput = $('#promptTitle');
  const bodyInput = $('#promptBody');
  const searchInput = $('#promptSearch');
  
  if (titleInput) titleInput.value = '';
  if (bodyInput) bodyInput.value = '';
  if (searchInput) searchInput.value = '';
}

// Render prompts list
function renderPrompts() {
  const list = $('#promptsList');
  if (!list) return;
  
  const searchTerm = ($('#promptSearch')?.value || '').toLowerCase();
  const filtered = state.prompts.filter(p => 
    p.title.toLowerCase().includes(searchTerm) ||
    p.body.toLowerCase().includes(searchTerm)
  );
  
  if (filtered.length === 0) {
    list.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px;">No prompts found.</p>';
    return;
  }
  
  list.innerHTML = filtered.map(prompt => `
    <div class="stack-list-item" data-prompt-id="${prompt.id}">
      <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 6px;">${escapeHtml(prompt.title)}</div>
      <div style="font-size: 13px; color: var(--text-secondary); line-height: 1.5; margin-bottom: 8px; font-family: 'JetBrains Mono', monospace;">${escapeHtml(prompt.body.substring(0, 120))}${prompt.body.length > 120 ? '...' : ''}</div>
      <div style="display: flex; gap: 8px;">
        <button class="ghost-btn copy-prompt-btn" data-prompt-id="${prompt.id}" style="flex: 1; font-size: 12px; padding: 8px 12px;">📋 Copy</button>
        <button class="ghost-btn edit-prompt-btn" data-prompt-id="${prompt.id}" style="flex: 1; font-size: 12px; padding: 8px 12px;">✎ Edit</button>
        <button class="ghost-btn delete-prompt-btn" data-prompt-id="${prompt.id}" style="flex: 1; font-size: 12px; padding: 8px 12px; color: #ef4444;">✕ Delete</button>
      </div>
    </div>
  `).join('');
}

// Delete prompt
function deletePrompt(id) {
  state.prompts = state.prompts.filter(p => p.id !== id);
  saveData();
  renderPrompts();
  showToast('✓ Prompt deleted');
}

// Edit prompt
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

// Copy prompt
function copyPrompt(id) {
  const prompt = state.prompts.find(p => p.id === id);
  if (prompt) {
    copyToClipboard(prompt.body);
    const btn = $(`[data-prompt-id="${id}"].copy-prompt-btn`);
    if (btn) {
      btn.classList.add('active');
      setTimeout(() => btn.classList.remove('active'), 1500);
    }
  }
}

// Search prompts
function setupPromptSearch() {
  const searchInput = $('#promptSearch');
  if (searchInput) {
    searchInput.addEventListener('input', renderPrompts);
  }
}

// Gemini copy button
function setupGeminiCopy() {
  const copyBtn = $('#copyGeminiBtn');
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      const textarea = $('#geminiPrompt');
      if (textarea && textarea.value.trim()) {
        const success = await copyToClipboard(textarea.value);
        if (success) {
          copyBtn.classList.add('active');
          setTimeout(() => copyBtn.classList.remove('active'), 1500);
        }
      } else {
        showToast('Prompt is empty');
      }
    });
  }
}

// Event delegation for notes
function setupNotesEvents() {
  const list = $('#notesList');
  if (list) {
    list.addEventListener('click', (e) => {
      if (e.target.classList.contains('delete-note-btn')) {
        deleteNote(e.target.dataset.noteId);
      }
      if (e.target.classList.contains('edit-note-btn')) {
        editNote(e.target.dataset.noteId);
      }
    });
  }
}

// Event delegation for prompts
function setupPromptsEvents() {
  const list = $('#promptsList');
  if (list) {
    list.addEventListener('click', (e) => {
      if (e.target.classList.contains('delete-prompt-btn')) {
        deletePrompt(e.target.dataset.promptId);
      }
      if (e.target.classList.contains('edit-prompt-btn')) {
        editPrompt(e.target.dataset.promptId);
      }
      if (e.target.classList.contains('copy-prompt-btn')) {
        copyPrompt(e.target.dataset.promptId);
      }
    });
  }
}

// HTML escape
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  return text.replace(/[&<>"']/g, c => map[c]);
}

// Save note button
function setupNoteSaveBtn() {
  const btn = $('#saveNoteBtn');
  if (btn) {
    btn.addEventListener('click', saveNote);
  }
}

// Clear note button
function setupNoteClearBtn() {
  const btn = $('#clearNoteBtn');
  if (btn) {
    btn.addEventListener('click', clearNoteForm);
  }
}

// Save prompt button
function setupPromptSaveBtn() {
  const btn = $('#savePromptBtn');
  if (btn) {
    btn.addEventListener('click', savePrompt);
  }
}

// Clear prompt button
function setupPromptClearBtn() {
  const btn = $('#clearPromptBtn');
  if (btn) {
    btn.addEventListener('click', clearPromptForm);
  }
}

// Initialize app
function initApp() {
  initTheme();
  loadData();
  
  setupThemeToggle();
  setupNoteSaveBtn();
  setupNoteClearBtn();
  setupPromptSaveBtn();
  setupPromptClearBtn();
  setupPromptSearch();
  setupNotesEvents();
  setupPromptsEvents();
  setupGeminiCopy();
  
  renderNotes();
  renderPrompts();
  
  // Update counts
  const notesCount = $('#noteCount');
  if (notesCount) notesCount.textContent = state.notes.length;
  
  const promptsCount = $('#promptCount');
  if (promptsCount) promptsCount.textContent = state.prompts.length;
  
  const libraryStat = $('#libraryStat');
  if (libraryStat) libraryStat.textContent = `Library items: ${state.prompts.length}`;
}

// Start on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
