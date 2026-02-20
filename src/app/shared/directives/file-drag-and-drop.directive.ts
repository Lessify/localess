import { Directive, output } from '@angular/core';

@Directive({
  selector: '[llFileDragDrop]',
  host: {
    '[class.file-drag-and-drop-wrapper]': 'classEnabled',
    '(dragover)': 'onDragOver($event)',
    '(dragleave)': 'onDragLeave($event)',
    '(drop)': 'onDrop($event)',
  },
})
export class FileDragAndDropDirective {
  filesChanges = output<File[]>();
  protected classEnabled = false;

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.classEnabled = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.classEnabled = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.classEnabled = false;

    const files = event.dataTransfer?.files;
    this.filesChanges.emit(Array.from(files || []));
  }
}
