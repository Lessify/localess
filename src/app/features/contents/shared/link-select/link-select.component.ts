import {ChangeDetectionStrategy, Component, Input, OnInit} from '@angular/core';
import {FormBuilder, FormControl, FormGroup} from '@angular/forms';
import {FormErrorHandlerService} from '@core/error-handler/form-error-handler.service';
import {SchemaField, SchemaFieldKind} from '@shared/models/schema.model';
import {ContentDocument} from '@shared/models/content.model';
import {MatAutocompleteSelectedEvent} from '@angular/material/autocomplete';
import {debounceTime, Observable, of, startWith} from 'rxjs';
import {map} from 'rxjs/operators';
import {MatSlideToggleChange} from '@angular/material/slide-toggle';
import {selectSettings} from "@core/state/settings/settings.selectors";
import {Store} from "@ngrx/store";
import {AppState} from "@core/state/core.state";

@Component({
  selector: 'll-link-select',
  templateUrl: './link-select.component.html',
  styleUrls: ['./link-select.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LinkSelectComponent implements OnInit {
  @Input() form?: FormGroup;
  @Input() component?: SchemaField;
  @Input() pages: ContentDocument[] = []

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
    if (this.form?.value.kind === null || this.form?.value.type === null) {
      this.form.patchValue({kind: SchemaFieldKind.LINK, type: 'url', target: '_self'})
    }
    if (this.form?.value.type === 'content' && this.form?.value.uri !== null) {
      this.searchCtrl.patchValue(this.pages.find(it => it.id === this.form?.value.uri))
    }

    this.filteredContent = this.searchCtrl.valueChanges
      .pipe(
        startWith(''),
        debounceTime(300),
        map((search) => this.pages?.filter(it => it.name.includes(search) || it.fullSlug.includes(search)) || [])
      )
  }

  onTypeChange(type: string): void {
    this.form?.patchValue({uri: null, type})
    this.searchCtrl.reset()
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

  targetChange(event: MatSlideToggleChange): void {
    if (event.checked) {
      this.form?.controls['target'].setValue('_blank')
    } else {
      this.form?.controls['target'].setValue('_self')
    }
  }
}
