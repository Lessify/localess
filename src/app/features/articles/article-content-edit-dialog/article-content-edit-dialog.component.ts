import {ChangeDetectionStrategy, Component, Inject, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA} from '@angular/material/dialog';
import {FormBuilder, FormRecord, ValidatorFn, Validators} from '@angular/forms';
import {ArticleContentEditDialogModel} from './article-content-edit-dialog.model';
import {SchematicComponentKind} from '@shared/models/schematic.model';
import {FormErrorHandlerService} from '../../../core/error-handler/form-error-handler.service';

@Component({
  selector: 'll-article-content-edit-dialog',
  templateUrl: './article-content-edit-dialog.component.html',
  styleUrls: ['./article-content-edit-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ArticleContentEditDialogComponent implements OnInit {

  form: FormRecord = this.fb.record({});

  constructor(
    private readonly fb: FormBuilder,
    readonly fe: FormErrorHandlerService,
    @Inject(MAT_DIALOG_DATA)
    public data: ArticleContentEditDialogModel
  ) {
  }

  ngOnInit(): void {
    this.generateForm()
    if(this.data.article.content) {
      this.form.reset()
      this.form.patchValue(this.data.article.content);
    }
  }

  generateForm(): void {
    for (const component of this.data.schematic.components || []) {
      const validators: ValidatorFn[] = []
      if (component.required) {
        validators.push(Validators.required)
      }
      switch (component.kind) {
        case SchematicComponentKind.TEXT:
        case SchematicComponentKind.TEXTAREA: {
          if (component.minLength) {
            validators.push(Validators.minLength(component.minLength))
          }
          if (component.maxLength) {
            validators.push(Validators.maxLength(component.maxLength))
          }
          this.form.addControl(component.name, this.fb.control<string | undefined>(component.defaultValue, validators))
          break;
        }
        case SchematicComponentKind.NUMBER: {
          if (component.minValue) {
            validators.push(Validators.min(component.minValue))
          }
          if (component.maxValue) {
            validators.push(Validators.max(component.maxValue))
          }
          this.form.addControl(component.name, this.fb.control<number | undefined>(component.defaultValue ? Number.parseInt(component.defaultValue) : undefined, validators))
          break;
        }
        case SchematicComponentKind.BOOLEAN: {
          this.form.addControl(component.name, this.fb.control<boolean | undefined>(component.defaultValue === 'true' , validators))
          break;
        }
        case SchematicComponentKind.DATE: {
          this.form.addControl(component.name, this.fb.control<string | undefined>(component.defaultValue, validators))
          break;
        }
      }
    }
  }

}
