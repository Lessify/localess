import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { Locale } from '@shared/models/locale.model';
import { LocaleService } from '@shared/services/locale.service';
import { LocaleValidator } from '@shared/validators/locale.validator';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmComboboxImports } from '@spartan-ng/helm/combobox';
import { HlmFieldImports } from '@spartan-ng/helm/field';

@Component({
  selector: 'll-locale-dialog',
  templateUrl: './locale-dialog.component.html',
  styleUrls: ['./locale-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, ReactiveFormsModule, CommonModule, MatButtonModule, HlmComboboxImports, HlmFieldImports, HlmButtonImports],
})
export class LocaleDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly localeService = inject(LocaleService);
  readonly fe = inject(FormErrorHandlerService);
  data = inject<Locale[]>(MAT_DIALOG_DATA);

  locales: Locale[] = [];
  form: FormGroup = this.fb.group({
    locale: this.fb.control<Locale | undefined>(undefined, LocaleValidator.LOCALE),
  });
  search = signal('');
  filteredOptions = computed(() => {
    const search = this.search().trim().toLowerCase();
    if (search) {
      console.log('search', search);
      return this.locales.filter(option => option.name.toLowerCase().includes(search));
    }
    return this.locales;
  });

  ngOnInit(): void {
    this.localeService.findAllLocales().subscribe(response => {
      this.locales = response;
      if (this.data != null) {
        this.data.forEach(it => {
          const pos: number = this.locales.findIndex(row => row.id === it.id);
          this.locales.splice(pos, 1);
        });
      }
    });
  }

  displayLocale(locale?: Locale): string {
    return locale ? `${locale.name} (${locale.id})` : '';
  }
}
