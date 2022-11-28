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
import {FormBuilder, FormGroup} from '@angular/forms';
import {debounce} from 'rxjs/operators';
import {debounceTime, interval} from 'rxjs';
import {TranslationValidator} from '@shared/validators/translation.validator';
import {ObjectUtils} from '../../../core/utils/object-utils.service';

@Component({
  selector: 'll-translation-plural-edit',
  templateUrl: './translation-plural-edit.component.html',
  styleUrls: ['./translation-plural-edit.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TranslationPluralEditComponent implements OnInit, OnChanges {
  @Input() value: string = '';
  @Output() valueChange: EventEmitter<string> = new EventEmitter<string>();
  form: FormGroup = this.fb.group({
    0: this.fb.control(null, TranslationValidator.PLURAL_VALUE),
    1: this.fb.control(null, TranslationValidator.PLURAL_VALUE),
    2: this.fb.control(null, TranslationValidator.PLURAL_VALUE),
    3: this.fb.control(null, TranslationValidator.PLURAL_VALUE),
    4: this.fb.control(null, TranslationValidator.PLURAL_VALUE),
    5: this.fb.control(null, TranslationValidator.PLURAL_VALUE)
  });

  constructor(private readonly fb: FormBuilder) {
  }

  ngOnInit(): void {
    this.form.valueChanges
      .pipe(
        debounceTime(200)
      )
      .subscribe(val => {
        this.valueChange.emit(JSON.stringify(ObjectUtils.clone(val, true)));
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.form.reset();
    this.form.patchValue(JSON.parse(changes['value'].currentValue || '{}'));
    if (changes['value'].isFirstChange()) {
      this.valueChange.emit(changes['value'].currentValue);
    }
  }
}
