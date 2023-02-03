import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit
} from '@angular/core';
import {FormBuilder} from '@angular/forms';
import {Schematic,} from '@shared/models/schematic.model';
import {FormErrorHandlerService} from '@core/error-handler/form-error-handler.service';
import {ActivatedRoute, Router} from '@angular/router';
import {SchematicService} from '@shared/services/schematic.service';
import {ContentService} from '@shared/services/content.service';
import {
  ContentError,
  ContentKind,
  ContentPage,
  ContentPageData
} from '@shared/models/content.model';
import {Store} from '@ngrx/store';
import {AppState} from '@core/state/core.state';
import {selectSpace} from '@core/state/space/space.selector';
import {filter, switchMap, takeUntil} from 'rxjs/operators';
import {combineLatest, Observable, Subject} from 'rxjs';
import {SpaceService} from '@shared/services/space.service';
import {Space} from '@shared/models/space.model';
import {NotificationService} from '@shared/services/notification.service';
import {DEFAULT_LOCALE, Locale} from '@shared/models/locale.model';
import {v4} from 'uuid';
import {environment} from '../../../../environments/environment';
import {SchematicSelectChange} from '../page-data-schematic-edit/page-data-schematic-edit.model';
import {ContentHelperService} from '@shared/services/content-helper.service';
import {SchematicPathItem} from './page-data-edit.model';

@Component({
  selector: 'll-page-data-edit',
  templateUrl: './page-data-edit.component.html',
  styleUrls: ['./page-data-edit.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PageDataEditComponent implements OnInit, OnDestroy {

  isTest = environment.test
  selectedSpace?: Space;
  selectedLocale: Locale = DEFAULT_LOCALE;
  availableLocales: Locale[] = [];
  contentId: string;
  page?: ContentPage;
  pageData: ContentPageData = {_id: '', schematic: ''};
  selectedPageData: ContentPageData = {_id: '', schematic: ''};
  rootSchematic?: Schematic;
  schematicMapByName?: Map<string, Schematic>;
  schematicPath: SchematicPathItem[] = [];
  schematics: Schematic[] = [];
  contentErrors: ContentError[] | null = null;
  pages: ContentPage[] = [];

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
    private readonly contentService: ContentService,
    private readonly store: Store<AppState>,
    private readonly notificationService: NotificationService,
    private readonly contentHelperService: ContentHelperService,
    readonly fe: FormErrorHandlerService,
  ) {
    this.contentId = this.activatedRoute.snapshot.paramMap.get('contentId') || "";
  }

  ngOnInit(): void {
    this.loadData(this.contentId)
  }

  loadData(contentId: string): void {
    this.store.select(selectSpace)
      .pipe(
        filter(it => it.id !== ''), // Skip initial data
        switchMap(it =>
          combineLatest([
            this.spaceService.findById(it.id),
            this.contentService.findById(it.id, contentId),
            this.contentService.findAllPages(it.id),
            this.schematicService.findAll(it.id)
          ])
        ),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: ([space, page, pages, schematics]) => {
          this.selectedSpace = space;
          this.selectedLocale = space.localeFallback;
          this.availableLocales = space.locales;
          this.pages = pages;

          if (page.kind === ContentKind.PAGE) {
            this.page = page;
            this.rootSchematic = schematics.find(it => it.id === page.schematic);
            this.pageData = page.data || {
              _id: v4(),
              schematic: this.rootSchematic?.name || ''
            };
          }

          // Generate initial path only once
          if (this.rootSchematic && this.schematicPath.length == 0) {
            this.schematicPath = [{
              contentId: this.pageData._id,
              schematicName: this.pageData.schematic,
              fieldName: ''
            }];
          }

          // Select content base on path
          this.navigateToSchematic(this.schematicPath[this.schematicPath.length - 1])

          this.schematics = schematics;
          this.schematicMapByName = new Map<string, Schematic>(this.schematics?.map(it => [it.name, it]));
          this.isLoading = false;
          this.cd.markForCheck();
        }
      })
  }

  publish(): void {
    this.isPublishLoading = true;
    this.contentService.publish(this.selectedSpace!.id, this.contentId)
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

    this.contentErrors = this.contentHelperService.validateContent(this.pageData, this.schematics, this.selectedLocale.id)

    if (!this.contentErrors) {
      this.contentService.updatePageData(this.selectedSpace!.id, this.contentId, this.pageData)
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
    this.router.navigate(['features', 'contents']);
  }

  openPublishedInNewTab(locale: string): void {
    const url = `${location.origin}/api/v1/spaces/${this.selectedSpace?.id}/contents/${this.contentId}/${locale}`
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
    this.selectedPageData = this.selectedPageData[event.fieldName].find((it: ContentPageData) => it._id == event.contentId);
  }

  navigateToSchematic(pathItem: SchematicPathItem): void {
    const idx = this.schematicPath.findIndex((it) => it.contentId == pathItem.contentId);
    this.schematicPath.splice(idx + 1);
    // Select Root
    if (idx == 0) {
      this.selectedPageData = this.pageData;
    } else {
      let localSelectedContent = this.pageData;
      for (const path of this.schematicPath) {
        if (path.fieldName === '') continue;
        localSelectedContent = localSelectedContent[path.fieldName].find((it: ContentPageData) => it._id == path.contentId);
      }
      this.selectedPageData = localSelectedContent;
    }
  }
}
