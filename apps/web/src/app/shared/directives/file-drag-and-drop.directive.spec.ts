import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { FileDragAndDropDirective } from './file-drag-and-drop.directive';

@Component({
  template: `<div llFileDragDrop (filesChanges)="onFilesChanges($event)"></div>`,
  imports: [FileDragAndDropDirective],
})
class HostComponent {
  received?: File[];
  onFilesChanges(files: File[]): void {
    this.received = files;
  }
}

function dropEventWithFiles(files: File[]): DragEvent {
  const event = new DragEvent('drop');
  Object.defineProperty(event, 'dataTransfer', { value: { files }, configurable: true });
  return event;
}

describe('FileDragAndDropDirective', () => {
  function setup() {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const div: HTMLDivElement = fixture.nativeElement.querySelector('div');
    return { fixture, div };
  }

  it('adds the wrapper class while dragging over, and prevents the default browser behavior', () => {
    const { fixture, div } = setup();
    const event = new DragEvent('dragover', { cancelable: true });

    div.dispatchEvent(event);
    fixture.detectChanges();

    expect(div.classList.contains('file-drag-and-drop-wrapper')).toBe(true);
    expect(event.defaultPrevented).toBe(true);
  });

  it('removes the wrapper class on dragleave', () => {
    const { fixture, div } = setup();
    div.dispatchEvent(new DragEvent('dragover'));
    fixture.detectChanges();

    div.dispatchEvent(new DragEvent('dragleave'));
    fixture.detectChanges();

    expect(div.classList.contains('file-drag-and-drop-wrapper')).toBe(false);
  });

  it('emits the dropped files and removes the wrapper class on drop', () => {
    const { fixture, div } = setup();
    div.dispatchEvent(new DragEvent('dragover'));
    fixture.detectChanges();
    const fileA = new File(['a'], 'a.png');
    const fileB = new File(['b'], 'b.png');

    div.dispatchEvent(dropEventWithFiles([fileA, fileB]));
    fixture.detectChanges();

    expect(fixture.componentInstance.received).toEqual([fileA, fileB]);
    expect(div.classList.contains('file-drag-and-drop-wrapper')).toBe(false);
  });

  it('emits an empty array when dropping without a dataTransfer', () => {
    const { fixture, div } = setup();

    div.dispatchEvent(new DragEvent('drop'));
    fixture.detectChanges();

    expect(fixture.componentInstance.received).toEqual([]);
  });
});
