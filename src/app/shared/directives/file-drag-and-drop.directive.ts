import { Directive, EventEmitter, HostBinding, HostListener, Output } from '@angular/core';

@Directive({
  selector: '[llFileDragDrop]',
})
export class FileDragAndDropDirective {
  @Output() private filesChanges: EventEmitter<File[]> = new EventEmitter();
  @HostBinding('class.file-drag-and-drop-wrapper') private classEnabled = false;

  constructor() {}

  @HostListener('dragover', ['$event'])
  public onDragOver(event: DragEvent) {
    //console.log('dragover', e);
    event.preventDefault();
    event.stopPropagation();
    this.classEnabled = true;
  }

  @HostListener('dragleave', ['$event'])
  public onDragLeave(event: DragEvent) {
    //console.log('dragleave', e);
    event.preventDefault();
    event.stopPropagation();
    this.classEnabled = false;
  }

  @HostListener('drop', ['$event'])
  public onDrop(event: DragEvent) {
    //console.log('drop', e);
    event.preventDefault();
    event.stopPropagation();
    this.classEnabled = false;

    const files = event.dataTransfer?.files;
    this.filesChanges.emit(Array.from(files || []));
  }
}
