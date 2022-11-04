import {ChangeDetectionStrategy, Component, Inject, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA} from '@angular/material/dialog';
import {FormBuilder, FormGroup} from '@angular/forms';
import {ArticleAddDialogModel} from './article-add-dialog.model';
import {ArticleValidator} from '@shared/validators/article.validator';
import {FormErrorHandlerService} from '../../../core/error-handler/form-error-handler.service';

@Component({
  selector: 'll-article-add-dialog',
  templateUrl: './article-add-dialog.component.html',
  styleUrls: ['./article-add-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ArticleAddDialogComponent implements OnInit {

  form: FormGroup = this.fb.group({
    name: this.fb.control('', ArticleValidator.NAME),
    slug: this.fb.control('', ArticleValidator.SLUG),
    schematicId: this.fb.control(undefined, ArticleValidator.SCHEMA)
  });

  constructor(
    private readonly fb: FormBuilder,
    readonly fe: FormErrorHandlerService,
    @Inject(MAT_DIALOG_DATA) public data: ArticleAddDialogModel
  ) {
  }

  ngOnInit(): void {
    if (this.data != null) {
      this.form.patchValue(this.data);
    }
  }
}
