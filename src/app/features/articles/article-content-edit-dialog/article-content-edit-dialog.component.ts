import {ChangeDetectionStrategy, Component, Inject, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA} from '@angular/material/dialog';
import {FormBuilder, FormGroup} from '@angular/forms';
import {ArticleContentEditDialogModel} from './article-content-edit-dialog.model';
import {ArticleValidator} from '@shared/validators/article.validator';

@Component({
  selector: 'll-article-content-edit-dialog',
  templateUrl: './article-content-edit-dialog.component.html',
  styleUrls: ['./article-content-edit-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ArticleContentEditDialogComponent implements OnInit {

  form: FormGroup = this.fb.group({
    name: this.fb.control('', ArticleValidator.NAME),
    slug: this.fb.control('', ArticleValidator.SLUG)
  });

  constructor(
    private readonly fb: FormBuilder,
    @Inject(MAT_DIALOG_DATA)
    public data: ArticleContentEditDialogModel
  ) {
  }

  ngOnInit(): void {
    if (this.data != null) {
      this.form.patchValue(this.data.article);
    }

    this.data.schematic.components
  }

}
