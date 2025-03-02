import { ChangeDetectionStrategy, Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MoveDialogModel } from './move-dialog.model';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { debounceTime, Observable, of, startWith, switchMap } from 'rxjs';
import { ContentFolder } from '@shared/models/content.model';
import { ContentService } from '@shared/services/content.service';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { AsyncPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'll-content-move-dialog',
  standalone: true,
  templateUrl: './move-dialog.component.html',
  styleUrls: ['./move-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, ReactiveFormsModule, MatFormFieldModule, MatInput, MatAutocompleteModule, AsyncPipe, MatButtonModule, MatIcon],
})
export class MoveDialogComponent implements OnInit {
  form: FormGroup = this.fb.group({
    path: this.fb.control(null, Validators.required),
  });

  //Search
  searchCtrl: FormControl = new FormControl();
  filteredContent: Observable<ContentFolder[]> = of([]);

  constructor(
    private readonly fb: FormBuilder,
    private readonly contentService: ContentService,
    readonly fe: FormErrorHandlerService,
    @Inject(MAT_DIALOG_DATA)
    public data: MoveDialogModel,
  ) {}

  ngOnInit(): void {
    this.filteredContent = this.searchCtrl.valueChanges.pipe(
      startWith(''),
      debounceTime(500),
      switchMap(it => this.contentService.findAllFoldersByName(this.data.spaceId, it, 5)),
    );
  }

  displayContent(content?: ContentFolder): string {
    return content ? `${content.name} | ${content.fullSlug}` : '';
  }

  contentSelected(event: MatAutocompleteSelectedEvent): void {
    const content = event.option.value as ContentFolder;
    this.form?.controls['path'].setValue(content.fullSlug);
  }

  contentReset() {
    this.searchCtrl.setValue('');
    this.form?.controls['path'].setValue(null);
  }
}
