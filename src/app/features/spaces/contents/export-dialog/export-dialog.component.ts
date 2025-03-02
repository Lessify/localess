import { ChangeDetectionStrategy, Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogContent, MatDialogModule } from '@angular/material/dialog';
import { ExportDialogModel } from './export-dialog.model';
import { ContentService } from '@shared/services/content.service';
import { debounceTime, Observable, of, startWith, switchMap } from 'rxjs';
import { Content } from '@shared/models/content.model';
import { MatAutocomplete, MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatFormField, MatFormFieldModule } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { AsyncPipe } from '@angular/common';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'll-content-export-dialog',
  standalone: true,
  templateUrl: './export-dialog.component.html',
  styleUrls: ['./export-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatAutocompleteModule,
    MatInput,
    AsyncPipe,
    MatIconButton,
    MatIcon,
    MatButton,
  ],
})
export class ExportDialogComponent implements OnInit {
  form: FormGroup = this.fb.group({
    path: this.fb.control(undefined),
  });

  //Search
  searchCtrl: FormControl = new FormControl();
  filteredContent: Observable<Content[]> = of([]);

  constructor(
    private readonly fb: FormBuilder,
    private readonly contentService: ContentService,
    @Inject(MAT_DIALOG_DATA) public data: ExportDialogModel,
  ) {}

  ngOnInit(): void {
    this.filteredContent = this.searchCtrl.valueChanges.pipe(
      startWith(''),
      debounceTime(500),
      switchMap(it => {
        return this.contentService.findAllByName(this.data.spaceId, it, 5);
      }),
    );
  }

  displayContent(content?: Content): string {
    return content ? `${content.name} | ${content.fullSlug}` : '';
  }

  contentSelected(event: MatAutocompleteSelectedEvent): void {
    const content = event.option.value as Content;
    this.form?.controls['path'].setValue(content.id);
  }

  contentReset(): void {
    this.searchCtrl.setValue('');
    this.form?.controls['path'].setValue(null);
  }
}
