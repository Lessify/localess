import { ChangeDetectionStrategy, Component, effect, model, untracked, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { debounceTime } from 'rxjs';

@Component({
  selector: 'll-translation-string-edit',
  templateUrl: './translation-string-edit.component.html',
  styleUrls: ['./translation-string-edit.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule],
})
export class TranslationStringEditComponent {
  private readonly fb = inject(FormBuilder);

  value = model('');

  readonly form: FormGroup = this.fb.group({
    value: this.fb.control(null),
  });

  constructor() {
    effect(() => {
      const value = this.value() || '';
      untracked(() => this.form.controls['value'].setValue(value));
    });

    this.form.valueChanges.pipe(debounceTime(200), takeUntilDestroyed()).subscribe(val => this.value.set(val.value));
  }
}
