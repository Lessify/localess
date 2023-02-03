import {ChangeDetectionStrategy, Component, Input, OnInit} from '@angular/core';
import {FormBuilder, FormControl, FormGroup} from '@angular/forms';
import {FormErrorHandlerService} from '@core/error-handler/form-error-handler.service';
import {SchematicComponent, SchematicComponentKind} from '@shared/models/schematic.model';
import {ContentService} from '@shared/services/content.service';
import {ContentPage} from '@shared/models/content.model';
import {MatAutocompleteSelectedEvent} from '@angular/material/autocomplete';
import {combineLatest, debounceTime, Observable, of, startWith, switchMap} from 'rxjs';
import {Store} from '@ngrx/store';
import {AppState} from '@core/state/core.state';
import {selectSpace} from '@core/state/space/space.selector';
import {filter, map} from 'rxjs/operators';
import {environment} from '../../../../environments/environment';

@Component({
  selector: 'll-link-select',
  templateUrl: './link-select.component.html',
  styleUrls: ['./link-select.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LinkSelectComponent implements OnInit {
  isTest = environment.test
  @Input() form?: FormGroup;
  @Input() component?: SchematicComponent;
  @Input() pages: ContentPage[] = []

  // Search
  searchCtrl: FormControl = new FormControl();
  filteredContent: Observable<ContentPage[]> = of([]);

  constructor(
    private readonly fb: FormBuilder,
    readonly fe: FormErrorHandlerService,
  ) {
  }

  ngOnInit(): void {
    // Data init in case everything is null
    if (this.form?.value.kind === null || this.form?.value.type === null) {
      this.form.patchValue({kind: SchematicComponentKind.LINK, type: 'url'})
    }
    if (this.form?.value.type === 'content' && this.form?.value.uri !== null) {
      this.searchCtrl.patchValue(this.pages.find(it => it.id === this.form?.value.uri))
    }

    this.filteredContent = this.searchCtrl.valueChanges
        .pipe(
          startWith(''),
          debounceTime(300),
          map(( search) => this.pages?.filter(it => it.name.includes(search) || it.fullSlug.includes(search)) || [])
        )
  }

  onTypeChange(type: string): void {
    this.form?.patchValue({uri: null, type})
    this.searchCtrl.reset()
  }

  displayContent(content?: ContentPage): string {
    return content ? `${content.name} | ${content.fullSlug}` : '';
  }

  contentSelected(event: MatAutocompleteSelectedEvent): void {
    const content = event.option.value as ContentPage;
    this.form?.controls['uri'].setValue(content.id);
  }

  contentReset(): void {
    this.searchCtrl.setValue('');
    this.form?.controls['uri'].setValue(null);
  }
}
