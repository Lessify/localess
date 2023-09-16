import {ChangeDetectionStrategy, Component, Inject, OnInit} from '@angular/core';
import {FormBuilder, FormControl, FormGroup} from '@angular/forms';
import {MAT_DIALOG_DATA} from '@angular/material/dialog';
import {ExportDialogModel} from './export-dialog.model';
import {MatDatepickerInputEvent} from '@angular/material/datepicker';
import {ContentService} from '@shared/services/content.service';
import {debounceTime, Observable, of, startWith, switchMap} from 'rxjs';
import {Content} from '@shared/models/content.model';
import {MatAutocompleteSelectedEvent} from '@angular/material/autocomplete';

@Component({
  selector: 'll-content-export-dialog',
  templateUrl: './export-dialog.component.html',
  styleUrls: ['./export-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExportDialogComponent implements OnInit {

  today = new Date

  form: FormGroup = this.fb.group({
    fromDate: this.fb.control(undefined),
    uri: this.fb.control(undefined)
  });

  //Search
  searchCtrl: FormControl = new FormControl();
  filteredContent: Observable<Content[]> = of([]);

  constructor(
    private readonly fb: FormBuilder,
    private readonly contentService: ContentService,
    @Inject(MAT_DIALOG_DATA) public data: ExportDialogModel
  ) {
  }

  ngOnInit(): void {
    this.filteredContent = this.searchCtrl.valueChanges
      .pipe(
        startWith(''),
        debounceTime(300),
        switchMap((it) => {
          console.log(it)
          return this.contentService.findAllByName(this.data.spaceId, it, 5)
        })
      )
  }

  dateChange(event: MatDatepickerInputEvent<unknown>): void {
    if (event.value instanceof Date) {
      this.form.controls['fromDate'].setValue(event.value.getTime());
    }
  }

  displayContent(content?: Content): string {
    return content ? `${content.name} | ${content.fullSlug}` : '';
  }

  contentSelected(event: MatAutocompleteSelectedEvent): void {
    const content = event.option.value as Content;
    this.form?.controls['uri'].setValue(content.id);
  }

  contentReset(): void {
    this.searchCtrl.setValue('');
    this.form?.controls['uri'].setValue(null);
  }
}
