import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { debounceTime } from 'rxjs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';

@Component({
  selector: 'll-translation-string-edit',
  standalone: true,
  templateUrl: './translation-string-edit.component.html',
  styleUrls: ['./translation-string-edit.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInput],
})
export class TranslationStringEditComponent implements OnInit, OnChanges {
  @Input() value = '';
  @Output() valueChange: EventEmitter<string> = new EventEmitter<string>();

  form: FormGroup = this.fb.group({
    value: this.fb.control(null),
  });
  constructor(private readonly fb: FormBuilder) {}

  ngOnInit(): void {
    this.form.valueChanges.pipe(debounceTime(200)).subscribe(val => {
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
