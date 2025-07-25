import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { Locale } from '@shared/models/locale.model';
import { LocaleService } from '@shared/services/locale.service';
import { LocaleValidator } from '@shared/validators/locale.validator';
import { Observable, startWith } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector: 'll-locale-dialog',
  templateUrl: './locale-dialog.component.html',
  styleUrls: ['./locale-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, ReactiveFormsModule, MatFormFieldModule, MatAutocompleteModule, MatInputModule, CommonModule, MatButtonModule],
})
export class LocaleDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly localeService = inject(LocaleService);
  readonly fe = inject(FormErrorHandlerService);
  data = inject<Locale[]>(MAT_DIALOG_DATA);

  locales: Locale[] = [];
  form: FormGroup = this.fb.group({
    locale: this.fb.control(null, LocaleValidator.LOCALE),
  });
  filteredLocales: Observable<Locale[]> = this.form.controls['locale'].valueChanges.pipe(
    startWith(''),
    map(value => (typeof value === 'string' ? value : value.name)),
    map(value => this._filter(value)),
  );

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

  private _filter(value: string): Locale[] {
    const filterValue: string = value.toLowerCase();
    return this.locales.filter(option => option.name.toLowerCase().includes(filterValue));
  }

  displayLocale(locale?: Locale): string {
    return locale ? `${locale.name} (${locale.id})` : '';
  }
}
