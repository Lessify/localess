import { ChangeDetectionStrategy, Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MoveDialogModel } from './move-dialog.model';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { debounceTime, Observable, of, startWith, switchMap } from 'rxjs';
import { Content } from '@shared/models/content.model';
import { ContentService } from '@shared/services/content.service';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';

@Component({
  selector: 'll-content-move-dialog',
  templateUrl: './move-dialog.component.html',
  styleUrls: ['./move-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MoveDialogComponent implements OnInit {
  form: FormGroup = this.fb.group({
    path: this.fb.control(null, Validators.required),
  });

  //Search
  searchCtrl: FormControl = new FormControl();
  filteredContent: Observable<Content[]> = of([]);

  constructor(
    private readonly fb: FormBuilder,
    private readonly contentService: ContentService,
    readonly fe: FormErrorHandlerService,
    @Inject(MAT_DIALOG_DATA)
    public data: MoveDialogModel
  ) {}

  ngOnInit(): void {
    this.filteredContent = this.searchCtrl.valueChanges.pipe(
      startWith(''),
      debounceTime(500),
      switchMap(it => this.contentService.findAllFoldersByName(this.data.spaceId, it, 5))
    );
  }

  displayContent(content?: Content): string {
    return content ? `${content.name} | ${content.fullSlug}` : '';
  }

  contentSelected(event: MatAutocompleteSelectedEvent): void {
    const content = event.option.value as Content;
    this.form?.controls['path'].setValue(content.fullSlug);
  }

  contentReset() {
    this.searchCtrl.setValue('');
    this.form?.controls['path'].setValue(null);
  }
}
