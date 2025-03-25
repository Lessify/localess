import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSlideToggleChange, MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { ContentDocument, LinkContent } from '@shared/models/content.model';
import { SchemaFieldKind, SchemaFieldLink } from '@shared/models/schema.model';
import { LocalSettingsStore } from '@shared/stores/local-settings.store';
import { debounceTime, Observable, of, startWith } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector: 'll-link-select',
  templateUrl: './link-select.component.html',
  styleUrls: ['./link-select.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatInputModule,
    MatAutocompleteModule,
    CommonModule,
    MatSlideToggleModule,
    MatExpansionModule,
    MatTooltipModule,
  ],
})
export class LinkSelectComponent implements OnInit {
  // Input
  form = input.required<FormGroup>();
  component = input.required<SchemaFieldLink>();
  documents = input.required<ContentDocument[]>();
  default = input<LinkContent>();

  defaultDocument = computed(() => {
    const defaultUri = this.default()?.uri;
    if (defaultUri) {
      return this.documents().find(it => it.id === defaultUri);
    }
    return undefined;
  });

  // Search
  searchCtrl: FormControl = new FormControl();
  filteredContent: Observable<ContentDocument[]> = of([]);

  // Subscriptions
  settingsStore = inject(LocalSettingsStore);

  constructor(readonly fe: FormErrorHandlerService) {
    effect(() => {
      if (this.default() && !this.component().translatable) {
        this.searchCtrl.disable();
      } else {
        this.searchCtrl.enable();
      }
    });
  }

  ngOnInit(): void {
    // Data init in case everything is null
    if (this.form().value.kind === null || this.form().value.type === null) {
      this.form().patchValue({
        kind: SchemaFieldKind.LINK,
        type: this.default()?.type || 'url',
        target: this.default()?.target || '_self',
      });
    }
    if (this.form().value.type === 'content' && this.form().value.uri !== null) {
      this.searchCtrl.patchValue(this.documents().find(it => it.id === this.form().value.uri));
    }

    this.filteredContent = this.searchCtrl.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      map(search => this.documents().filter(it => it.name.includes(search) || it.fullSlug.includes(search)) || []),
    );
  }

  onTypeChange(type: string): void {
    this.form().patchValue({ uri: null, type });
    this.searchCtrl.reset();
  }

  displayContent(content?: ContentDocument): string {
    return content ? `${content.name} | ${content.fullSlug}` : '';
  }

  contentSelected(event: MatAutocompleteSelectedEvent): void {
    const content = event.option.value as ContentDocument;
    this.form().controls['uri'].setValue(content.id);
  }

  contentReset(): void {
    this.searchCtrl.setValue('');
    this.form().controls['uri'].setValue(null);
  }

  targetChange(event: MatSlideToggleChange): void {
    if (event.checked) {
      this.form().controls['target'].setValue('_blank');
    } else {
      this.form().controls['target'].setValue('_self');
    }
  }
}
