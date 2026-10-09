import { TestBed } from '@angular/core/testing';
import { Editor } from '@tiptap/core';
import { vi } from 'vitest';

import { createMarkdownExtensions } from '../markdown-editor/markdown-extensions';
import { EditorToolbarComponent, readActiveState, TOOLBAR_REQUIRED_MARKS, TOOLBAR_REQUIRED_NODES } from './editor-toolbar.component';

describe('EditorToolbarComponent', () => {
  function setup(content = 'plain text') {
    const editor = new Editor({ extensions: createMarkdownExtensions() });
    editor.commands.setContent(content);
    const fixture = TestBed.createComponent(EditorToolbarComponent);
    fixture.componentRef.setInput('editor', editor);
    fixture.detectChanges();
    return { component: fixture.componentInstance, fixture, editor };
  }

  /** The toolbar as the markdown editor renders it in source mode: visible, but nothing behind it. */
  function setupWithoutEditor(disabled = true) {
    const fixture = TestBed.createComponent(EditorToolbarComponent);
    fixture.componentRef.setInput('editor', null);
    fixture.componentRef.setInput('disabled', disabled);
    fixture.detectChanges();
    return { component: fixture.componentInstance, fixture };
  }

  function buttons(fixture: { nativeElement: HTMLElement }) {
    return Array.from(fixture.nativeElement.querySelectorAll('button'));
  }

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('active state', () => {
    it('reports the marks and nodes at the cursor', () => {
      const { component, editor } = setup();

      editor.commands.selectAll();
      editor.commands.toggleBold();

      expect(component.active()['bold']).toBe(true);
      expect(component.active()['italic']).toBe(false);
      editor.destroy();
    });

    /**
     * The reason active state is a signal at all: ngx-tiptap marks its own host view for check on
     * each transaction, which never reaches this child component, and the `editor` input keeps the
     * same reference. Without the `transaction` subscription the buttons would freeze on whatever
     * they showed at first render.
     */
    it('refreshes when the editor changes after first render', () => {
      const { component, editor } = setup();
      expect(component.active()['heading1']).toBe(false);

      editor.commands.setContent('## a heading', { contentType: 'markdown' });
      editor.commands.selectAll();

      expect(component.active()['heading1']).toBe(false);
      expect(component.active()['heading2']).toBe(true);
      editor.destroy();
    });

    it('stops listening once the component is destroyed', () => {
      const { fixture, editor } = setup();
      const offSpy = vi.spyOn(editor, 'off');

      fixture.destroy();

      expect(offSpy).toHaveBeenCalledWith('transaction', expect.any(Function));
      // The editor itself belongs to the host component, so the toolbar must not destroy it.
      expect(editor.isDestroyed).toBe(false);
      editor.destroy();
    });
  });

  /**
   * The markdown editor renders the toolbar in source mode as well, so the input group's addon row
   * keeps its height instead of ~18 wrapping buttons appearing and disappearing on every switch.
   * That means the toolbar has to survive having no editor, since one is only built for WYSIWYG.
   */
  describe('inert state', () => {
    it('renders its full set of buttons even with no editor', () => {
      const { fixture } = setupWithoutEditor();

      expect(buttons(fixture).length).toBe(18);
    });

    it('disables every button when there is no editor', () => {
      const { component, fixture } = setupWithoutEditor();

      expect(component.inert()).toBe(true);
      expect(buttons(fixture).every(button => button.disabled)).toBe(true);
    });

    it('is inert even when the host has not asked for it, if the editor is missing', () => {
      const { component } = setupWithoutEditor(false);

      expect(component.inert()).toBe(true);
    });

    it('reports no active marks without an editor', () => {
      const { component } = setupWithoutEditor();

      expect(component.active()).toEqual({});
    });

    it('does not throw when a command is issued with no editor behind it', () => {
      const { component, fixture } = setupWithoutEditor();
      vi.stubGlobal('prompt', vi.fn().mockReturnValue('https://example.com'));

      expect(() => buttons(fixture).forEach(button => button.click())).not.toThrow();
      expect(() => component.setLink()).not.toThrow();
    });

    it('disables the buttons for a read-only field even with an editor present', () => {
      const { fixture, editor } = setup();
      fixture.componentRef.setInput('disabled', true);
      fixture.detectChanges();

      expect(fixture.componentInstance.inert()).toBe(true);
      expect(buttons(fixture).every(button => button.disabled)).toBe(true);
      editor.destroy();
    });

    it('enables the buttons for an editable field', () => {
      const { component, fixture, editor } = setup();

      expect(component.inert()).toBe(false);
      expect(buttons(fixture).some(button => button.disabled)).toBe(false);
      editor.destroy();
    });
  });

  describe('readActiveState', () => {
    it('covers every button the toolbar renders', () => {
      const editor = new Editor({ extensions: createMarkdownExtensions() });

      expect(Object.keys(readActiveState(editor)).sort()).toEqual(
        [
          'blockquote',
          'bold',
          'bulletList',
          'code',
          'codeBlock',
          'heading1',
          'heading2',
          'heading3',
          'heading4',
          'heading5',
          'heading6',
          'italic',
          'link',
          'orderedList',
          'paragraph',
          'strike',
          'underline',
        ].sort(),
      );
      editor.destroy();
    });
  });

  describe('setLink', () => {
    it('sets the link to the entered url', () => {
      const { component, editor } = setup();
      vi.stubGlobal('prompt', vi.fn().mockReturnValue('https://example.com'));

      component.setLink();

      expect(editor.getAttributes('link')['href']).toBe('https://example.com');
      editor.destroy();
    });

    it('does nothing when the prompt is cancelled', () => {
      const { component, editor } = setup();
      editor.chain().focus().selectAll().setLink({ href: 'https://example.com' }).run();
      vi.stubGlobal('prompt', vi.fn().mockReturnValue(null));

      component.setLink();

      expect(editor.getAttributes('link')['href']).toBe('https://example.com');
      editor.destroy();
    });

    it('clears the link for an empty url', () => {
      const { component, editor } = setup();
      editor.chain().focus().selectAll().setLink({ href: 'https://example.com' }).run();
      vi.stubGlobal('prompt', vi.fn().mockReturnValue(''));

      component.setLink();

      expect(editor.getAttributes('link')['href']).toBeUndefined();
      editor.destroy();
    });
  });

  /**
   * The toolbar exists to keep the RICH_TEXT and MARKDOWN editors in sync, so every type its
   * buttons act on has to be in both schemas. This asserts it for the markdown set; the rich text
   * set is asserted against the same two lists in its own spec.
   */
  it('has every mark and node its buttons act on in the markdown schema', () => {
    const editor = new Editor({ extensions: createMarkdownExtensions() });

    expect(Object.keys(editor.schema.marks)).toEqual(expect.arrayContaining(TOOLBAR_REQUIRED_MARKS));
    expect(Object.keys(editor.schema.nodes)).toEqual(expect.arrayContaining(TOOLBAR_REQUIRED_NODES));
    editor.destroy();
  });
});
