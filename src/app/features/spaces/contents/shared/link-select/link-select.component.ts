import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, OnInit, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { provideIcons } from '@ng-icons/core';
import { lucideFileSymlink, lucideInfo, lucideLanguages, lucideLink } from '@ng-icons/lucide';
import { ContentDocument, LinkContent, LinkContentType } from '@shared/models/content.model';
import { SchemaFieldKind, SchemaFieldLink } from '@shared/models/schema.model';
import { LocalSettingsStore } from '@shared/stores/local-settings.store';
import { HlmAccordionImports } from '@spartan-ng/helm/accordion';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmComboboxImports } from '@spartan-ng/helm/combobox';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmSwitchImports } from '@spartan-ng/helm/switch';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { map, startWith, switchMap } from 'rxjs';

@Component({
  selector: 'll-link-select',
  templateUrl: './link-select.component.html',
  styleUrls: ['./link-select.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    CommonModule,
    HlmFieldImports,
    HlmTooltipImports,
    HlmIconImports,
    HlmSwitchImports,
    HlmDropdownMenuImports,
    HlmButtonImports,
    HlmInputImports,
    HlmComboboxImports,
    HlmAccordionImports,
  ],
  providers: [
    provideIcons({
      lucideInfo,
      lucideLanguages,
      lucideLink,
      lucideFileSymlink,
    }),
  ],
})
export class LinkSelectComponent implements OnInit {
  readonly fe = inject(FormErrorHandlerService);

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

  // Reactive link type - tracks form value changes including patchValue/reset
  linkType = toSignal(
    toObservable(this.form).pipe(
      switchMap(form =>
        form.valueChanges.pipe(
          map(v => v.type as string),
          startWith(form.value.type as string),
        ),
      ),
    ),
    { initialValue: 'url' },
  );

  // Search
  search = signal('');
  filteredOptions = computed(() => {
    const search = this.search().toLowerCase();
    if (search) {
      return this.documents().filter(it => it.name.toLowerCase().includes(search) || it.fullSlug.toLowerCase().includes(search));
    }
    return this.documents();
  });

  // Combobox selected value
  selectedDocument = signal<ContentDocument | null>(null);

  // Stores
  settingsStore = inject(LocalSettingsStore);

  constructor() {
    // Sync combobox selection with form control (only for content type)
    effect(() => {
      if (this.linkType() !== 'content') return;
      const selected = this.selectedDocument();
      const control = this.form().get('uri');
      if (!control) return;

      const newValue = selected?.id ?? null;
      if (control.value !== newValue) {
        control.setValue(newValue);
      }
    });

    // Initialize combobox when form or documents change (only for content type)
    effect(() => {
      if (this.linkType() !== 'content') return;
      const uriValue = this.form().get('uri')?.value;
      const doc = uriValue ? this.documents().find(it => it.id === uriValue) : null;
      this.selectedDocument.set(doc ?? null);
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
  }

  onTypeChange(type: LinkContentType): void {
    this.form().patchValue({ uri: null, type });
    this.selectedDocument.set(null);
  }

  itemToString = (item: ContentDocument): string => {
    return item ? `${item.name} | ${item.fullSlug}` : '';
  };

  displayContent(content?: ContentDocument): string {
    return content ? `${content.name} | ${content.fullSlug}` : '';
  }

  targetChange(checked: boolean): void {
    if (checked) {
      this.form().controls['target'].setValue('_blank');
    } else {
      this.form().controls['target'].setValue('_self');
    }
  }
}
