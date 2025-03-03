import { ChangeDetectionStrategy, Component, effect, model, untracked } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { debounceTime } from 'rxjs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'll-translation-string-edit',
  standalone: true,
  templateUrl: './translation-string-edit.component.html',
  styleUrls: ['./translation-string-edit.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInput],
})
export class TranslationStringEditComponent {
  value = model('');

  readonly form: FormGroup = this.fb.group({
    value: this.fb.control(null),
  });

  constructor(private readonly fb: FormBuilder) {
    effect(() => {
      const value = this.value() || '';
      untracked(() => this.form.controls['value'].setValue(value));
    });

    this.form.valueChanges.pipe(debounceTime(200), takeUntilDestroyed()).subscribe(val => this.value.set(val.value));
  }
}
