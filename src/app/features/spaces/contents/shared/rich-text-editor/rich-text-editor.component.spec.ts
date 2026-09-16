import { TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { SchemaFieldRichText } from '@shared/models/schema.model';
import { vi } from 'vitest';

import { TOOLBAR_REQUIRED_MARKS, TOOLBAR_REQUIRED_NODES } from '../editor-toolbar/editor-toolbar.component';
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

  /**
   * The counterpart of the same assertion in the shared toolbar's spec, against the same two
   * lists. `EditorToolbarComponent` renders one fixed set of buttons for both field editors, so
   * every type it acts on has to be registered here too - otherwise a button looks fine and
   * silently does nothing.
   */
  it('registers every mark and node the shared toolbar acts on', () => {
    const { component } = setup();

    expect(Object.keys(component.editor.schema.marks)).toEqual(expect.arrayContaining(TOOLBAR_REQUIRED_MARKS));
    expect(Object.keys(component.editor.schema.nodes)).toEqual(expect.arrayContaining(TOOLBAR_REQUIRED_NODES));
  });
});
