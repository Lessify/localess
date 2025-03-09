import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { ContentFolder } from '@shared/models/content.model';
import { ContentService } from '@shared/services/content.service';
import { debounceTime, Observable, of, startWith, switchMap } from 'rxjs';
import { MoveDialogModel } from './move-dialog.model';

@Component({
  selector: 'll-content-move-dialog',
  standalone: true,
  templateUrl: './move-dialog.component.html',
  styleUrls: ['./move-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    CommonModule,
    MatButtonModule,
    MatIconModule,
  ],
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
