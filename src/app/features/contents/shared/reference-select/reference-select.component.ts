import {ChangeDetectionStrategy, Component, Input, OnInit} from '@angular/core';
import {FormBuilder, FormControl, FormGroup} from '@angular/forms';
import {FormErrorHandlerService} from '@core/error-handler/form-error-handler.service';
import {SchemaField, SchemaFieldKind} from '@shared/models/schema.model';
import {ContentDocument} from '@shared/models/content.model';
import {MatAutocompleteSelectedEvent} from '@angular/material/autocomplete';
import {debounceTime, Observable, of, startWith} from 'rxjs';
import {map} from 'rxjs/operators';
import {selectSettings} from '@core/state/settings/settings.selectors';
import {Store} from '@ngrx/store';
import {AppState} from '@core/state/core.state';

@Component({
  selector: 'll-reference-select',
  templateUrl: './reference-select.component.html',
  styleUrls: ['./reference-select.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReferenceSelectComponent implements OnInit {
  @Input({required: true}) form?: FormGroup;
  @Input({required: true}) component?: SchemaField;
  @Input({required: true}) documents: ContentDocument[] = []

  // Search
  searchCtrl: FormControl = new FormControl();
  filteredContent: Observable<ContentDocument[]> = of([]);

  // Subscriptions
  settings$ = this.store.select(selectSettings);

  constructor(
    private readonly fb: FormBuilder,
    readonly fe: FormErrorHandlerService,
    private readonly store: Store<AppState>,
  ) {
  }

  ngOnInit(): void {
    // Data init in case everything is null
    if (this.form?.value.kind === null) {
      this.form.patchValue({kind: SchemaFieldKind.REFERENCE})
    }
    if (this.form?.value.uri !== null) {
      this.searchCtrl.patchValue(this.documents.find(it => it.id === this.form?.value.uri))
    }

    this.filteredContent = this.searchCtrl.valueChanges
      .pipe(
        startWith(''),
        debounceTime(300),
        map((search) => this.documents?.filter(it => it.name.includes(search) || it.fullSlug.includes(search)) || [])
      )
  }

  displayContent(content?: ContentDocument): string {
    return content ? `${content.name} | ${content.fullSlug}` : '';
  }

  contentSelected(event: MatAutocompleteSelectedEvent): void {
    const content = event.option.value as ContentDocument;
    this.form?.controls['uri'].setValue(content.id);
  }

  contentReset(): void {
    this.searchCtrl.setValue('');
    this.form?.controls['uri'].setValue(null);
  }
}
