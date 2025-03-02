import { ChangeDetectionStrategy, Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Observable, startWith } from 'rxjs';
import { LocaleService } from '@shared/services/locale.service';
import { map } from 'rxjs/operators';
import { Locale } from '@shared/models/locale.model';
import { LocaleValidator } from '@shared/validators/locale.validator';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatInput } from '@angular/material/input';
import { AsyncPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'll-locale-dialog',
  standalone: true,
  templateUrl: './locale-dialog.component.html',
  styleUrls: ['./locale-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, ReactiveFormsModule, MatFormFieldModule, MatAutocompleteModule, MatInput, AsyncPipe, MatButtonModule],
})
export class LocaleDialogComponent implements OnInit {
  locales: Locale[] = [];
  form: FormGroup = this.fb.group({
    locale: this.fb.control(null, LocaleValidator.LOCALE),
  });
  filteredLocales: Observable<Locale[]> = this.form.controls['locale'].valueChanges.pipe(
    startWith(''),
    map(value => (typeof value === 'string' ? value : value.name)),
    map(value => this._filter(value)),
  );

  constructor(
    private readonly fb: FormBuilder,
    private readonly localeService: LocaleService,
    readonly fe: FormErrorHandlerService,
    @Inject(MAT_DIALOG_DATA) public data: Locale[],
  ) {}

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
