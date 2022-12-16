import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit
} from '@angular/core';
import {FormBuilder, FormRecord, ValidatorFn, Validators} from '@angular/forms';
import {
  Schematic,
  SchematicComponent,
  SchematicComponentKind
} from '@shared/models/schematic.model';
import {FormErrorHandlerService} from '../../../core/error-handler/form-error-handler.service';
import {ActivatedRoute, Router} from '@angular/router';
import {SchematicService} from '@shared/services/schematic.service';
import {PageService} from '@shared/services/page.service';
import {Page, PageContentComponent} from '@shared/models/page.model';
import {Store} from '@ngrx/store';
import {AppState} from '../../../core/state/core.state';
import {selectSpace} from '../../../core/state/space/space.selector';
import {filter, switchMap, takeUntil} from 'rxjs/operators';
import {combineLatest, Subject} from 'rxjs';
import {SpaceService} from '@shared/services/space.service';
import {Space} from '@shared/models/space.model';
import {NotificationService} from '@shared/services/notification.service';
import {Locale} from '@shared/models/locale.model';
import {ObjectUtils} from '../../../core/utils/object-utils.service';
import {v4} from 'uuid';
import {environment} from '../../../../environments/environment';
import {
  SchematicSelectChange
} from '../page-content-schematic-edit/page-content-schematic-edit.component';

interface SchematicPathItem {
  contentId: string
  fieldName: string
  schematicName: string
}

@Component({
  selector: 'll-page-content-edit',
  templateUrl: './page-content-edit.component.html',
  styleUrls: ['./page-content-edit.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PageContentEditComponent implements OnInit, OnDestroy {

  isTest = environment.test
  selectedSpace?: Space;
  selectedLocale?: Locale;
  pageId: string;
  page?: Page;
  content: PageContentComponent = {_id: '', schematic: ''};
  selectedContent: PageContentComponent = {_id: '', schematic: ''};
  schematic?: Schematic;
  schematicMapById?: Map<string, Schematic>;
  schematicMapByName?: Map<string, Schematic>;
  schematicComponentsMap?: Map<string, SchematicComponent>;
  schematicPath: SchematicPathItem[] = [];
  schematics: Schematic[] = [];

  //Loadings
  isLoading: boolean = true;
  isPublishLoading: boolean = false;
  isSaveLoading: boolean = false;
  isFormLoading: boolean = false;

  // Subscriptions
  private destroy$ = new Subject();

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
    this.pageId = this.activatedRoute.snapshot.paramMap.get('pageId') || "";
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
        ),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: ([space, page, schematics]) => {
          this.selectedSpace = space;
          this.selectedLocale = space.localeFallback;
          this.page = page;
          this.schematic = schematics.find(it => it.id === page.schematic);
          this.content = page.content ? ObjectUtils.clone(page.content) : {
            _id: v4(),
            schematic: this.schematic?.name || ''
          };
          this.selectedContent = this.content
          if (this.schematic) {
            this.schematicPath = [{
              contentId: this.content._id,
              schematicName: this.content.schematic,
              fieldName: ''
            }];
          }

          this.schematics = schematics;
          this.schematicMapById = new Map<string, Schematic>(this.schematics?.map(it => [it.id, it]));
          this.schematicMapByName = new Map<string, Schematic>(this.schematics?.map(it => [it.name, it]));
          this.schematicComponentsMap = new Map<string, SchematicComponent>(this.schematic?.components?.map(it => [it.name, it]));
          this.isLoading = false;
          this.cd.markForCheck();
        }
      })
  }

  publish(): void {
    this.isPublishLoading = true;
    this.pageService.publish(this.selectedSpace!.id, this.pageId)
      .subscribe({
        next: () => {
          this.notificationService.success('Page has been published.');
        },
        error: () => {
          this.notificationService.error('Page can not be published.');
        },
        complete: () => {
          setTimeout(() => {
            this.isPublishLoading = false
            this.cd.markForCheck()
          }, 1000)
        }
      })


  }

  save(): void {
    this.isSaveLoading = true;

    this.pageService.updateContent(this.selectedSpace!.id, this.pageId, this.content)
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

  openPublishedInNewTab(locale: string): void {
    const url = `${location.origin}/api/v1/spaces/${this.selectedSpace?.id}/pages/${this.pageId}/${locale}.json`
    window.open(url, '_blank')
  }

  ngOnDestroy(): void {
    this.destroy$.next(undefined)
    this.destroy$.complete()
  }

  onContentChange(event: any): void {
    console.log(event)
  }

  onSchematicChange(event: SchematicSelectChange): void {
    this.schematicPath.push({
      contentId: event.contentId,
      schematicName: event.schematicName,
      fieldName: event.fieldName
    })
    this.selectedContent = this.selectedContent[event.fieldName].find((it: PageContentComponent) => it._id == event.contentId)
  }

  navigateToSchematic(pathItem: SchematicPathItem): void {
    console.log(pathItem)
    const idx = this.schematicPath.findIndex((it) => it.contentId == pathItem.contentId)
    if (idx == 0) {
      this.selectedContent = this.content
    }
    this.schematicPath.splice(idx + 1, this.schematicPath.length - 1);
  }
}
