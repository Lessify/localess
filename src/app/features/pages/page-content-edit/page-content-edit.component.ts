import {ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit} from '@angular/core';
import {FormBuilder, FormRecord, ValidatorFn, Validators} from '@angular/forms';
import {Schematic, SchematicComponentKind} from '@shared/models/schematic.model';
import {FormErrorHandlerService} from '../../../core/error-handler/form-error-handler.service';
import {ActivatedRoute, Router} from '@angular/router';
import {SchematicService} from '@shared/services/schematic.service';
import {PageService} from '@shared/services/page.service';
import {Page} from '@shared/models/page.model';
import {Store} from '@ngrx/store';
import {AppState} from '../../../core/state/core.state';
import {selectSpace} from '../../../core/state/space/space.selector';
import {filter, switchMap} from 'rxjs/operators';
import {combineLatest} from 'rxjs';
import {SpaceService} from '@shared/services/space.service';
import {Space} from '@shared/models/space.model';
import {NotificationService} from '@shared/services/notification.service';

@Component({
  selector: 'll-page-content-edit',
  templateUrl: './page-content-edit.component.html',
  styleUrls: ['./page-content-edit.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PageContentEditComponent implements OnInit {

  selectedSpace?: Space;
  pageId: string;
  page?: Page;
  schematic?: Schematic;
  schematics: Schematic[] = []

  //Loadings
  isLoading: boolean = true;
  isPublishLoading: boolean = false;
  isSaveLoading: boolean = false;

  form: FormRecord = this.fb.record({});

  constructor(
    private readonly fb: FormBuilder,
    private readonly router: Router,
    private readonly activatedRoute: ActivatedRoute,
    private readonly cd: ChangeDetectorRef,
    private readonly spaceService: SpaceService,
    private readonly schematicService: SchematicService,
    private readonly pageService: PageService,
    private readonly store: Store<AppState>,
    private readonly notificationService: NotificationService,
    readonly fe: FormErrorHandlerService,
  ) {
    this.pageId = this.activatedRoute.snapshot.paramMap.get('id') || "";
  }

  ngOnInit(): void {
    this.loadData(this.pageId)
  }

  loadData(pageId: string): void {
    this.store.select(selectSpace)
      .pipe(
        filter(it => it.id !== ''), // Skip initial data
        switchMap(it =>
          combineLatest([
            this.spaceService.findById(it.id),
            this.pageService.findById(it.id, pageId),
            this.schematicService.findAll(it.id)
          ])
        )
      )
      .subscribe({
        next: ([space, page, schematics]) => {
          this.selectedSpace = space;
          this.page = page;
          this.schematic = schematics.find(it => it.id === page.schematic)
          this.schematics = schematics;
          this.generateForm();
          if (page.content) {
            this.form.reset()
            this.form.patchValue(page.content);
          }
          this.isLoading = false;
          this.cd.markForCheck();
        }
      })
  }

  generateForm(): void {
    for (const component of this.schematic?.components || []) {
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
        case SchematicComponentKind.COLOR: {
          this.form.addControl(component.name, this.fb.control<string | undefined>(component.defaultValue, validators))
          break;
        }
        case SchematicComponentKind.BOOLEAN: {
          this.form.addControl(component.name, this.fb.control<boolean | undefined>(component.defaultValue === 'true', validators))
          break;
        }
        case SchematicComponentKind.DATE: {
          this.form.addControl(component.name, this.fb.control<string | undefined>(component.defaultValue, validators))
          break;
        }
        case SchematicComponentKind.DATETIME: {
          this.form.addControl(component.name, this.fb.control<string | undefined>(component.defaultValue, validators))
          break;
        }
      }
    }
  }

  publish(): void {
    this.isPublishLoading = true;

  }

  save(): void {
    this.isSaveLoading = true;
    this.pageService.updateContent(this.selectedSpace!.id, this.pageId, this.form.value)
      .subscribe({
        next: () => {
          this.notificationService.success('Article has been updated.');
        },
        error: () => {
          this.notificationService.error('Article can not be updated.');
        },
        complete: () => {
          setTimeout(() => {
            this.isSaveLoading = false
            this.cd.markForCheck()
          }, 1000)
        }
      })
  }

  back(): void {
    this.router.navigate(['features', 'pages']);
  }
}
