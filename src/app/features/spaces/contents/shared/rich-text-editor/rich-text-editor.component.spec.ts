import { TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { SchemaFieldRichText } from '@shared/models/schema.model';
import { vi } from 'vitest';

import { RichTextEditorComponent } from './rich-text-editor.component';

describe('RichTextEditorComponent', () => {
  function setup() {
    const control = new FormControl('');
    const fixture = TestBed.createComponent(RichTextEditorComponent);
    fixture.componentRef.setInput('form', control);
    fixture.componentRef.setInput('component', {} as unknown as SchemaFieldRichText);
    fixture.detectChanges();
    return { component: fixture.componentInstance, fixture };
  }

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('setLink() clears an empty url', () => {
    const { component } = setup();
    vi.stubGlobal('prompt', vi.fn().mockReturnValue(''));
    component.editor.chain().focus().setLink({ href: 'https://example.com' }).run();

    component.setLink();

    expect(component.editor.getAttributes('link')['href']).toBeUndefined();
  });

  it('setLink() does nothing when the prompt is cancelled', () => {
    const { component } = setup();
    component.editor.chain().focus().setLink({ href: 'https://example.com' }).run();
    vi.stubGlobal('prompt', vi.fn().mockReturnValue(null));

    component.setLink();

    expect(component.editor.getAttributes('link')['href']).toBe('https://example.com');
  });

  it('setLink() sets the link to the entered url', () => {
    const { component } = setup();
    vi.stubGlobal('prompt', vi.fn().mockReturnValue('https://example.com'));

    component.setLink();

    expect(component.editor.getAttributes('link')['href']).toBe('https://example.com');
  });

  it('destroys the editor on component destroy', () => {
    const { component, fixture } = setup();
    const destroySpy = vi.spyOn(component.editor, 'destroy');

    fixture.destroy();

    expect(destroySpy).toHaveBeenCalled();
  });
  it('highlights a code block through the TipTap integration', () => {
    const { component } = setup();

    component.editor.commands.setContent('<pre><code class="language-typescript">const answer: number = 42;</code></pre>');

    expect(component.editor.view.dom.innerHTML).toContain('hljs-');
  });
});
