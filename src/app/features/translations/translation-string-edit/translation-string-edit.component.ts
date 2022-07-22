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
import {interval} from 'rxjs';

@Component({
  selector: 'll-translation-string-edit',
  templateUrl: './translation-string-edit.component.html',
  styleUrls: ['./translation-string-edit.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TranslationStringEditComponent implements OnInit, OnChanges {
  @Input() value: string = '';
  @Output() valueChange: EventEmitter<string> = new EventEmitter<string>();

  form: FormGroup = this.fb.group({
    value: this.fb.control(null)
  });
  constructor(private readonly fb: FormBuilder) {}

  ngOnInit(): void {
    this.form.valueChanges
      .pipe(debounce(() => interval(200)))
      .subscribe(val => {
        this.valueChange.emit(val.value);
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.form.controls['value'].setValue(changes['value'].currentValue);
    if (changes['value'].isFirstChange()) {
      this.valueChange.emit(changes['value'].currentValue);
    }
  }
}
