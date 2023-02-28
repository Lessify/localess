import {ChangeDetectionStrategy, Component, Input, OnInit} from '@angular/core';
import {FormBuilder, FormGroup} from '@angular/forms';
import {FormErrorHandlerService} from '@core/error-handler/form-error-handler.service';
import {SchematicComponent, SchematicComponentKind} from '@shared/models/schematic.model';
import {environment} from '../../../../environments/environment';

@Component({
  selector: 'll-asset-select',
  templateUrl: './asset-select.component.html',
  styleUrls: ['./asset-select.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AssetSelectComponent implements OnInit {
  isTest = environment.test
  @Input() form?: FormGroup;
  @Input() component?: SchematicComponent;


  constructor(
    private readonly fb: FormBuilder,
    readonly fe: FormErrorHandlerService,
  ) {
  }

  ngOnInit(): void {
    // Data init in case everything is null
    if (this.form?.value.kind === null || this.form?.value.type === null) {
      this.form.patchValue({kind: SchematicComponentKind.LINK, type: 'url'})
    }

  }
}
