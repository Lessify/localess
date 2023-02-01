import {ChangeDetectionStrategy, Component, Input, OnInit} from '@angular/core';
import {FormBuilder, FormGroup} from '@angular/forms';
import {FormErrorHandlerService} from '@core/error-handler/form-error-handler.service';
import {SchematicComponent} from '@shared/models/schematic.model';

@Component({
  selector: 'll-link-select',
  templateUrl: './link-select.component.html',
  styleUrls: ['./link-select.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LinkSelectComponent implements OnInit {

  @Input() form?: FormGroup;
  @Input() component?: SchematicComponent;

  constructor(
    private readonly fb: FormBuilder,
    readonly fe: FormErrorHandlerService,
  ) {
  }

  ngOnInit(): void {
  }

  onTypeChange(type: string): void {
    this.form?.patchValue({type})
  }

}
