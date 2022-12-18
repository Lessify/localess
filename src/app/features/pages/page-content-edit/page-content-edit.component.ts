import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit
} from '@angular/core';
import {FormBuilder} from '@angular/forms';
import {Schematic,} from '@shared/models/schematic.model';
import {FormErrorHandlerService} from '../../../core/error-handler/form-error-handler.service';
import {ActivatedRoute, Router} from '@angular/router';
import {SchematicService} from '@shared/services/schematic.service';
import {PageService} from '@shared/services/page.service';
import {ContentError, Page, PageContentComponent} from '@shared/models/page.model';
import {Store} from '@ngrx/store';
import {AppState} from '../../../core/state/core.state';
import {selectSpace} from '../../../core/state/space/space.selector';
import {filter, switchMap, takeUntil} from 'rxjs/operators';
import {combineLatest, Subject} from 'rxjs';
import {SpaceService} from '@shared/services/space.service';
import {Space} from '@shared/models/space.model';
import {NotificationService} from '@shared/services/notification.service';
import {DEFAULT_LOCALE, Locale} from '@shared/models/locale.model';
import {v4} from 'uuid';
import {environment} from '../../../../environments/environment';
import {
  SchematicSelectChange
} from '../page-content-schematic-edit/page-content-schematic-edit.model';
import {ContentService} from '@shared/services/content.service';
import {SchematicPathItem} from './page-content-edit.model';

@Component({
  selector: 'll-page-content-edit',
  templateUrl: './page-content-edit.component.html',
  styleUrls: ['./page-content-edit.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PageContentEditComponent implements OnInit, OnDestroy {

  isTest = environment.test
  selectedSpace?: Space;
  selectedLocale: Locale = DEFAULT_LOCALE;
  availableLocales: Locale[] = [];
  pageId: string;
  page?: Page;
  content: PageContentComponent = {_id: '', schematic: ''};
  selectedContent: PageContentComponent = {_id: '', schematic: ''};
  rootSchematic?: Schematic;
  schematicMapByName?: Map<string, Schematic>;
  schematicPath: SchematicPathItem[] = [];
  schematics: Schematic[] = [];
  contentErrors: ContentError[] | null = null;

  //Loadings
  isLoading: boolean = true;
  isPublishLoading: boolean = false;
  isSaveLoading: boolean = false;

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
    private readonly contentService: ContentService,
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
          console.log('load')
          this.selectedSpace = space;
          this.selectedLocale = space.localeFallback;
          this.availableLocales = space.locales;
          this.page = page;
          this.rootSchematic = schematics.find(it => it.id === page.schematic);
          this.content = page.content || {
            _id: v4(),
            schematic: this.rootSchematic?.name || ''
          };

          // Generate initial path only once
          if (this.rootSchematic && this.schematicPath.length == 0) {
            this.schematicPath = [{
              contentId: this.content._id,
              schematicName: this.content.schematic,
              fieldName: ''
            }];
          }
          // Select content base on path
          if (this.schematicPath.length == 1) {
            this.selectedContent = this.content;
          } else {
            for (const item of this.schematicPath) {
              if (item.fieldName === '') continue;
              this.selectedContent = this.content[item.fieldName].find((it: PageContentComponent) => it._id == item.contentId)
            }
          }

          this.schematics = schematics;
          this.schematicMapByName = new Map<string, Schematic>(this.schematics?.map(it => [it.name, it]));
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
          this.notificationService.success('Content has been published.');
        },
        error: () => {
          this.notificationService.error('Content can not be published.');
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
    console.group('save')
    this.isSaveLoading = true;

    this.contentErrors = this.contentService.validateContent(this.content, this.schematics, this.selectedLocale.id)

    if (!this.contentErrors) {
      this.pageService.updateContent(this.selectedSpace!.id, this.pageId, this.content)
        .subscribe({
          next: () => {
            this.notificationService.success('Content has been updated.');
          },
          error: () => {
            this.notificationService.error('Content can not be updated.');
          },
          complete: () => {
            setTimeout(() => {
              this.isSaveLoading = false
              this.cd.markForCheck()
            }, 1000)
          }
        })
    } else {
      this.notificationService.warn('Content is not valid. Please check all fields are filled correctly.')
      this.isSaveLoading = false;
    }
    console.groupEnd()
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

  onLocaleChanged(locale: Locale): void {
    this.selectedLocale = locale;
  }

  onSchematicChange(event: SchematicSelectChange): void {
    this.schematicPath.push({
      contentId: event.contentId,
      schematicName: event.schematicName,
      fieldName: event.fieldName
    });
    this.selectedContent = this.selectedContent[event.fieldName].find((it: PageContentComponent) => it._id == event.contentId);
  }

  navigateToSchematic(pathItem: SchematicPathItem): void {
    console.log(pathItem)
    const idx = this.schematicPath.findIndex((it) => it.contentId == pathItem.contentId);
    // Select Root
    if (idx == 0) {
      this.selectedContent = this.content;
    }
    // TODO select other deap
    // Delete remaining path
    // l=2, idx = 0, => (1, 1)
    // l=5, idx = 0, => (1, 4)
    this.schematicPath.splice(idx + 1, this.schematicPath.length - (idx + 1));
  }
}
