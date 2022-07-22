import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges
} from '@angular/core';
import {UntypedFormArray, UntypedFormBuilder, UntypedFormGroup} from '@angular/forms';
import {debounce} from 'rxjs/operators';
import {interval} from 'rxjs';
import {TranslationValidator} from '../../../shared/validators/translation.validator';

@Component({
  selector: 'll-translation-array-edit',
  templateUrl: './translation-array-edit.component.html',
  styleUrls: ['./translation-array-edit.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TranslationArrayEditComponent implements OnInit, OnChanges {
  @Input() value: string = '';
  @Output() valueChange: EventEmitter<string> = new EventEmitter<string>();
  form: UntypedFormGroup = this.fb.group({
    values: this.fb.array([])
  });

  constructor(private readonly fb: UntypedFormBuilder) {
  }

  ngOnInit(): void {
    this.form.valueChanges
    .pipe(debounce(() => interval(200)))
    .subscribe(val => {
      this.valueChange.emit(
        JSON.stringify(
          val.values.filter((item: string) => item != null && item.length > 0)
        )
      );
    });
  }

  values(): UntypedFormArray {
    return this.form.controls['values'] as UntypedFormArray;
  }

  addItem(): void {
    this.values().push(
      this.fb.control(null, TranslationValidator.ARRAY_VALUE)
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.values().clear();
    JSON.parse(changes['value'].currentValue || '[]')
    .forEach((it: any) =>
      this.values().push(this.fb.control(it, TranslationValidator.ARRAY_VALUE))
    );
    if (changes['value'].isFirstChange()) {
      this.valueChange.emit(changes['value'].currentValue);
    }
  }

  removeItem(i: number): void {
    this.values().removeAt(i);
  }
}
