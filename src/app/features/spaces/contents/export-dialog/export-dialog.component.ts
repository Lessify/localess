import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Content } from '@shared/models/content.model';
import { ContentService } from '@shared/services/content.service';
import { debounceTime, Observable, of, startWith, switchMap } from 'rxjs';
import { ExportDialogModel } from './export-dialog.model';

@Component({
  selector: 'll-content-export-dialog',
  templateUrl: './export-dialog.component.html',
  styleUrls: ['./export-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatAutocompleteModule,
    MatInputModule,
    CommonModule,
    MatButtonModule,
    MatIconModule,
  ],
})
export class ExportDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly contentService = inject(ContentService);
  data = inject<ExportDialogModel>(MAT_DIALOG_DATA);

  form: FormGroup = this.fb.group({
    path: this.fb.control(undefined),
  });

  //Search
  searchCtrl: FormControl = new FormControl();
  filteredContent: Observable<Content[]> = of([]);

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
