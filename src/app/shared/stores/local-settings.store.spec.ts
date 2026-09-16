import { TestBed } from '@angular/core/testing';

import { LocalSettingsStore } from './local-settings.store';

describe('LocalSettingsStore', () => {
  const LS_KEY = 'LL-SETTINGS-STATE';
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.removeAttribute('data-theme');
    originalMatchMedia = window.matchMedia;
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  function mockPrefersDark(matches: boolean) {
    window.matchMedia = ((query: string) => ({ matches, media: query }) as MediaQueryList) as typeof window.matchMedia;
  }

  function createStore() {
    TestBed.configureTestingModule({});
    return TestBed.inject(LocalSettingsStore);
  }

  it('defaults to the "auto" theme and resolves it to "dark" when the OS prefers dark', () => {
    mockPrefersDark(true);
    const store = createStore();
    expect(store.theme()).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('resolves the "auto" theme to "light" when the OS does not prefer dark', () => {
    mockPrefersDark(false);
    const store = createStore();
    expect(store.theme()).toBe('light');
    expect(document.documentElement.classList.contains('light')).toBe(true);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('hydrates initial state from localStorage', () => {
    localStorage.setItem(LS_KEY, JSON.stringify({ theme: 'dark', debugEnabled: true }));
    const store = createStore();
    expect(store.theme()).toBe('dark');
    expect(store.debugEnabled()).toBe(true);
  });

  it('setTheme updates the theme signal, the document, and persists to localStorage', () => {
    const store = createStore();
    store.setTheme('dark');
    expect(store.theme()).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(JSON.parse(localStorage.getItem(LS_KEY)!).theme).toBe('dark');
  });

  it('setDebug updates the debugEnabled signal and persists it', () => {
    const store = createStore();
    store.setDebug(true);
    expect(store.debugEnabled()).toBe(true);
    expect(JSON.parse(localStorage.getItem(LS_KEY)!).debugEnabled).toBe(true);
  });

  it('setEditorEnabled updates the editorEnabled signal and persists it', () => {
    const store = createStore();
    store.setEditorEnabled(true);
    expect(store.editorEnabled()).toBe(true);
    expect(JSON.parse(localStorage.getItem(LS_KEY)!).editorEnabled).toBe(true);
  });

  it('setEditorSize updates the editorSize signal and persists it', () => {
    const store = createStore();
    store.setEditorSize('lg');
    expect(store.editorSize()).toBe('lg');
    expect(JSON.parse(localStorage.getItem(LS_KEY)!).editorSize).toBe('lg');
  });

  it('setEditorFormWidth updates the editorFormWidth signal and persists it', () => {
    const store = createStore();
    store.setEditorFormWidth(50);
    expect(store.editorFormWidth()).toBe(50);
    expect(JSON.parse(localStorage.getItem(LS_KEY)!).editorFormWidth).toBe(50);
  });

  it('setAssetLayout updates the assetLayout signal and persists it', () => {
    const store = createStore();
    store.setAssetLayout('grid');
    expect(store.assetLayout()).toBe('grid');
    expect(JSON.parse(localStorage.getItem(LS_KEY)!).assetLayout).toBe('grid');
  });

  it('setAssetDialogLayout updates the assetDialogLayout signal and persists it', () => {
    const store = createStore();
    store.setAssetDialogLayout('grid');
    expect(store.assetDialogLayout()).toBe('grid');
    expect(JSON.parse(localStorage.getItem(LS_KEY)!).assetDialogLayout).toBe('grid');
  });

  it('setTranslationLayout updates the translationLayout signal and persists it', () => {
    const store = createStore();
    store.setTranslationLayout('tree');
    expect(store.translationLayout()).toBe('tree');
    expect(JSON.parse(localStorage.getItem(LS_KEY)!).translationLayout).toBe('tree');
  });

  it('defaults markdownMode to source', () => {
    const store = createStore();
    expect(store.markdownMode()).toBe('source');
  });

  it('setMarkdownMode updates the markdownMode signal and persists it', () => {
    const store = createStore();
    store.setMarkdownMode('wysiwyg');
    expect(store.markdownMode()).toBe('wysiwyg');
    expect(JSON.parse(localStorage.getItem(LS_KEY)!).markdownMode).toBe('wysiwyg');
  });

  // The point of persisting it: an author picks a way of working once and keeps it across reloads.
  it('restores a stored markdownMode into a freshly constructed store', () => {
    const store = createStore();
    store.setMarkdownMode('wysiwyg');

    TestBed.resetTestingModule();
    const reloaded = createStore();

    expect(reloaded.markdownMode()).toBe('wysiwyg');
  });

  it('setLastSeenVersion updates the lastSeenVersion signal and persists it', () => {
    const store = createStore();
    store.setLastSeenVersion('3.2.0');
    expect(store.lastSeenVersion()).toBe('3.2.0');
    expect(JSON.parse(localStorage.getItem(LS_KEY)!).lastSeenVersion).toBe('3.2.0');
  });
});
