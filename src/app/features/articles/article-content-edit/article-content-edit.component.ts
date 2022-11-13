import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA} from '@angular/material/dialog';
import {FormBuilder, FormRecord, ValidatorFn, Validators} from '@angular/forms';
import {ArticleContentEditModel} from './article-content-edit.model';
import {Schematic, SchematicComponentKind, SchematicType} from '@shared/models/schematic.model';
import {FormErrorHandlerService} from '../../../core/error-handler/form-error-handler.service';
import {ActivatedRoute} from '@angular/router';
import {SchematicService} from '@shared/services/schematic.service';
import {ArticleService} from '@shared/services/article.service';
import {Article} from '@shared/models/article.model';
import {Store} from '@ngrx/store';
import {AppState} from '../../../core/state/core.state';
import {selectSpace} from '../../../core/state/space/space.selector';
import {filter, switchMap} from 'rxjs/operators';
import {combineLatest} from 'rxjs';

@Component({
  selector: 'll-article-content-edit',
  templateUrl: './article-content-edit.component.html',
  styleUrls: ['./article-content-edit.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ArticleContentEditComponent implements OnInit {

  articleId: string;
  article?: Article;
  schematics: Schematic[] = []

  //Loadings
  isLoading: boolean = true;
  isPublishLoading: boolean = false;
  isSaveLoading: boolean = false;

  form: FormRecord = this.fb.record({});

  constructor(
    private readonly fb: FormBuilder,
    private readonly activatedRoute: ActivatedRoute,
    readonly fe: FormErrorHandlerService,
    private readonly cd: ChangeDetectorRef,
    private readonly schematicService: SchematicService,
    private readonly articleService: ArticleService,
    private readonly store: Store<AppState>
  ) {
    this.articleId = this.activatedRoute.snapshot.paramMap.get('id') || "";
  }

  ngOnInit(): void {
    this.articleId = this.activatedRoute.snapshot.paramMap.get('id') || "";

    // this.generateForm()
    // if(this.data.article.content) {
    //   this.form.reset()
    //   this.form.patchValue(this.data.article.content);
    // }
  }

  // generateForm(): void {
  //   for (const component of this.data.schematic.components || []) {
  //     const validators: ValidatorFn[] = []
  //     if (component.required) {
  //       validators.push(Validators.required)
  //     }
  //     switch (component.kind) {
  //       case SchematicComponentKind.TEXT:
  //       case SchematicComponentKind.TEXTAREA: {
  //         if (component.minLength) {
  //           validators.push(Validators.minLength(component.minLength))
  //         }
  //         if (component.maxLength) {
  //           validators.push(Validators.maxLength(component.maxLength))
  //         }
  //         this.form.addControl(component.name, this.fb.control<string | undefined>(component.defaultValue, validators))
  //         break;
  //       }
  //       case SchematicComponentKind.NUMBER: {
  //         if (component.minValue) {
  //           validators.push(Validators.min(component.minValue))
  //         }
  //         if (component.maxValue) {
  //           validators.push(Validators.max(component.maxValue))
  //         }
  //         this.form.addControl(component.name, this.fb.control<number | undefined>(component.defaultValue ? Number.parseInt(component.defaultValue) : undefined, validators))
  //         break;
  //       }
  //       case SchematicComponentKind.COLOR: {
  //         this.form.addControl(component.name, this.fb.control<string | undefined>(component.defaultValue, validators))
  //         break;
  //       }
  //       case SchematicComponentKind.BOOLEAN: {
  //         this.form.addControl(component.name, this.fb.control<boolean | undefined>(component.defaultValue === 'true' , validators))
  //         break;
  //       }
  //       case SchematicComponentKind.DATE: {
  //         this.form.addControl(component.name, this.fb.control<string | undefined>(component.defaultValue, validators))
  //         break;
  //       }
  //       case SchematicComponentKind.DATETIME: {
  //         this.form.addControl(component.name, this.fb.control<string | undefined>(component.defaultValue, validators))
  //         break;
  //       }
  //     }
  //   }
  // }

  publish(): void {

  }

  save(): void {

  }
}
