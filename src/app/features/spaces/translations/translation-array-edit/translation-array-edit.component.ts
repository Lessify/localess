import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, inject } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { TranslationValidator } from '@shared/validators/translation.validator';
import { debounceTime } from 'rxjs';

@Component({
  selector: 'll-translation-array-edit',
  templateUrl: './translation-array-edit.component.html',
  styleUrls: ['./translation-array-edit.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatIconModule, MatInputModule, MatButtonModule],
})
export class TranslationArrayEditComponent implements OnInit, OnChanges {
  private readonly fb = inject(FormBuilder);

  @Input() value = '';
  @Output() valueChange: EventEmitter<string> = new EventEmitter<string>();
  form: FormGroup = this.fb.group({
    values: this.fb.array([]),
  });

  ngOnInit(): void {
    this.form.valueChanges.pipe(debounceTime(200)).subscribe(val => {
      this.valueChange.emit(JSON.stringify(val.values.filter((item: string) => item != null && item.length > 0)));
    });
  }

  get values(): FormArray {
    return this.form.controls['values'] as FormArray;
  }

  addItem(): void {
    this.values.push(this.fb.control(null, TranslationValidator.ARRAY_VALUE));
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.values.clear();
    JSON.parse(changes['value'].currentValue || '[]').forEach((it: any) =>
      this.values.push(this.fb.control(it, TranslationValidator.ARRAY_VALUE)),
    );
    if (changes['value'].isFirstChange()) {
      this.valueChange.emit(changes['value'].currentValue);
    }
  }

  removeItem(i: number): void {
    this.values.removeAt(i);
  }
}
