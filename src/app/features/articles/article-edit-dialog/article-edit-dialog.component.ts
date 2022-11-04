import {ChangeDetectionStrategy, Component, Inject, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA} from '@angular/material/dialog';
import {FormBuilder, FormGroup} from '@angular/forms';
import {ArticleEditDialogModel} from './article-edit-dialog.model';
import {ArticleValidator} from '@shared/validators/article.validator';
import {FormErrorHandlerService} from '../../../core/error-handler/form-error-handler.service';

@Component({
  selector: 'll-article-edit-dialog',
  templateUrl: './article-edit-dialog.component.html',
  styleUrls: ['./article-edit-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ArticleEditDialogComponent implements OnInit {

  form: FormGroup = this.fb.group({
    name: this.fb.control('', ArticleValidator.NAME),
    slug: this.fb.control('', ArticleValidator.SLUG)
  });

  constructor(
    private readonly fb: FormBuilder,
    readonly fe: FormErrorHandlerService,
    @Inject(MAT_DIALOG_DATA)
    public data: ArticleEditDialogModel
  ) {
  }

  ngOnInit(): void {
    if (this.data != null) {
      this.form.patchValue(this.data.article);
    }
  }

}
