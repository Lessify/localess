import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  model,
  OnInit,
  signal,
} from '@angular/core';
import { debounceTime, EMPTY, Observable } from 'rxjs';
import { filter, switchMap, tap } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent, MatOption } from '@angular/material/autocomplete';
import { TranslationService } from '@shared/services/translation.service';
import { SpaceService } from '@shared/services/space.service';
import { Locale } from '@shared/models/locale.model';
import { Translation, TranslationCreate, TranslationStatus, TranslationUpdate } from '@shared/models/translation.model';
import { Space } from '@shared/models/space.model';
import { ObjectUtils } from '@core/utils/object-utils.service';
import { ConfirmationDialogComponent } from '@shared/components/confirmation-dialog/confirmation-dialog.component';
import { ConfirmationDialogModel } from '@shared/components/confirmation-dialog/confirmation-dialog.model';
import { TranslateService } from '@shared/services/translate.service';
import { LocaleService } from '@shared/services/locale.service';
import { NotificationService } from '@shared/services/notification.service';
import { TaskService } from '@shared/services/task.service';
import { ExportDialogComponent } from './export-dialog/export-dialog.component';
import { ExportDialogModel, ExportDialogReturn } from './export-dialog/export-dialog.model';
import { ImportDialogComponent } from './import-dialog/import-dialog.component';
import { ImportDialogModel, ImportDialogReturn } from './import-dialog/import-dialog.model';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslationHistory } from '@shared/models/translation-history.model';
import { TranslationHistoryService } from '@shared/services/translation-history.service';
import { EditDialogComponent, EditDialogModel } from './edit-dialog';
import { AddDialogComponent, AddDialogModel, AddDialogReturnModel } from './add-dialog';
import { EditIdDialogComponent, EditIdDialogModel } from './edit-id-dialog';
import { COMMA, ENTER, SPACE } from '@angular/cdk/keycodes';
import { AsyncPipe, DatePipe } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { CanUserPerformPipe } from '@shared/pipes/can-user-perform.pipe';
import { MatButtonModule, MatIconAnchor } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { IconComponent } from '@shared/components/icon/icon.component';
import { MatMenuModule } from '@angular/material/menu';
import { MatDivider } from '@angular/material/divider';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatFormField } from '@angular/material/form-field';
import { MatSelect } from '@angular/material/select';
import { MatInput } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { TranslationFilterPipe } from '@shared/pipes/translation-filter.pipe';
import { StatusComponent } from '@shared/components/status';
import { TranslationStringViewComponent } from './translation-string-view/translation-string-view.component';
import { TranslationPluralViewComponent } from './translation-plural-view/translation-plural-view.component';
import { TranslationArrayViewComponent } from './translation-array-view/translation-array-view.component';
import { TranslationStringEditComponent } from './translation-string-edit/translation-string-edit.component';
import { TranslationPluralEditComponent } from './translation-plural-edit/translation-plural-edit.component';
import { TranslationArrayEditComponent } from './translation-array-edit/translation-array-edit.component';
import { CdkCopyToClipboard } from '@angular/cdk/clipboard';

@Component({
  selector: 'll-translations',
  standalone: true,
  templateUrl: './translations.component.html',
  styleUrls: ['./translations.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AsyncPipe,
    MatToolbarModule,
    MatIconModule,
    CanUserPerformPipe,
    MatIconAnchor,
    MatButtonModule,
    MatTooltip,
    IconComponent,
    MatMenuModule,
    MatDivider,
    MatProgressBar,
    MatSidenavModule,
    MatFormField,
    MatSelect,
    MatOption,
    MatInput,
    ReactiveFormsModule,
    MatChipsModule,
    FormsModule,
    MatAutocompleteModule,
    ScrollingModule,
    TranslationFilterPipe,
    StatusComponent,
    TranslationStringViewComponent,
    TranslationPluralViewComponent,
    TranslationArrayViewComponent,
    TranslationStringEditComponent,
    TranslationPluralEditComponent,
    TranslationArrayEditComponent,
    CdkCopyToClipboard,
    DatePipe,
  ],
})
export class TranslationsComponent implements OnInit {
  // Input
  spaceId = input.required<string>();

  selectedSpace?: Space;
  showHistory = false;

  DEFAULT_LOCALE = 'en';

  translations = signal<Translation[]>([]);
  translationIds = computed(() => this.translations().map(it => it.id));

  //Search
  searchCtrl: FormControl = new FormControl();
  searchValue = '';

  //Labels
  currentLabel = model('');
  readonly separatorKeysCodes = [ENTER, COMMA, SPACE] as const;
  allLabels = computed(() => {
    const tmp = this.translations()
      .map(it => it.labels)
      .flat()
      .filter(it => it != undefined)
      .map(it => it!);
    return [...new Set<string>(tmp)];
  });
  filterLabels = signal<string[]>([]);
  filteredLabels = computed(() => {
    const currentLabel = this.currentLabel()?.toLowerCase() || '';
    return currentLabel
      ? this.allLabels()
          .filter(label => !this.filterLabels().includes(label))
          .filter(label => label.toLowerCase().includes(currentLabel))
      : this.allLabels().filter(label => !this.filterLabels().includes(label));
  });

  selectedTranslation?: Translation;
  selectedTranslationLocaleValue?: string;
  translateValue = signal<undefined | string>(undefined);

  selectedSearchLocale = '';
  selectedSourceLocale = '';
  selectedTargetLocale = '';

  // Subscriptions
  history$?: Observable<TranslationHistory[]>;
  space$?: Observable<Space>;
  translations$?: Observable<Translation[]>;

  //Loadings
  isLoading = signal(true);
  isPublishLoading = signal(false);
  isLocaleUpdateLoading = signal(false);
  isTranslateLoading = signal(false);

  private destroyRef = inject(DestroyRef);

  constructor(
    private readonly translationService: TranslationService,
    private readonly translateHistoryService: TranslationHistoryService,
    private readonly localeService: LocaleService,
    private readonly spaceService: SpaceService,
    private readonly taskService: TaskService,
    private readonly notificationService: NotificationService,
    private readonly dialog: MatDialog,
    private readonly cd: ChangeDetectorRef,
    private readonly translateService: TranslateService,
  ) {}

  ngOnInit(): void {
    this.searchCtrl.valueChanges.pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: value => {
        this.searchValue = value;
        this.cd.markForCheck();
      },
    });
    this.space$ = this.spaceService.findById(this.spaceId()).pipe(
      tap(space => {
        this.selectedSpace = space;
        //this.locales = space.locales;
        if (this.selectedSearchLocale === '') {
          this.selectedSearchLocale = space.localeFallback.id;
        }
        if (this.selectedSourceLocale === '') {
          this.selectedSourceLocale = space.localeFallback.id;
        }
        if (this.selectedTargetLocale === '') {
          this.selectedTargetLocale = space.localeFallback.id;
        }
      }),
    );
    this.translations$ = this.translationService.findAll(this.spaceId()).pipe(
      tap(translations => {
        this.translations.set(translations);
        if (translations.length > 0) {
          if (this.selectedTranslation) {
            const tr = translations.find(it => it.id === this.selectedTranslation?.id);
            if (tr) {
              this.selectTranslation(tr);
            } else {
              this.selectTranslation(translations[0]);
            }
          } else {
            this.selectTranslation(translations[0]);
          }
        }
        this.isLoading.set(false);
      }),
    );
    this.history$ = this.translateHistoryService.findAll(this.spaceId());
  }

  publish(): void {
    this.isPublishLoading.set(true);
    this.translationService.publish(this.spaceId()).subscribe({
      next: () => {
        this.notificationService.success('Translations has been published.');
      },
      error: () => {
        this.notificationService.error('Translations can not be published.');
      },
      complete: () => {
        setTimeout(() => {
          this.isPublishLoading.set(false);
          this.cd.markForCheck();
        }, 1000);
      },
    });
  }

  openAddDialog(): void {
    this.dialog
      .open<AddDialogComponent, AddDialogModel, AddDialogReturnModel>(AddDialogComponent, {
        panelClass: 'sm',
        data: {
          reservedIds: this.translationIds(),
        },
      })
      .afterClosed()
      .pipe(
        filter(it => it !== undefined),
        switchMap(it => {
          const tc: TranslationCreate = {
            id: it!.id,
            type: it!.type,
            locale: this.selectedSpace!.localeFallback.id,
            value: it!.value,
            labels: it?.labels,
            description: it?.description,
            autoTranslate: it?.autoTranslate,
          };
          return this.translationService.create(this.spaceId(), tc);
        }),
      )
      .subscribe({
        next: () => {
          this.notificationService.success('Translation has been added.');
        },
        error: () => {
          this.notificationService.error('Translation can not be added.');
        },
      });
  }

  openEditIdDialog(translation: Translation): void {
    this.dialog
      .open<EditIdDialogComponent, EditIdDialogModel, string>(EditIdDialogComponent, {
        panelClass: 'sm',
        data: {
          id: translation.id,
          reservedIds: this.translationIds(),
        },
      })
      .afterClosed()
      .pipe(
        filter(it => it !== undefined),
        switchMap(it => {
          return this.translationService.updateId(this.spaceId(), translation, it!);
        }),
      )
      .subscribe({
        next: () => {
          this.notificationService.success('Translation ID has been updated.');
        },
        error: err => {
          console.error(err);
          this.notificationService.error('Translation ID can not be updated.');
        },
      });
  }

  openEditDialog(translation: Translation): void {
    this.dialog
      .open<EditDialogComponent, Translation, EditDialogModel>(EditDialogComponent, {
        panelClass: 'sm',
        data: ObjectUtils.clone(translation),
      })
      .afterClosed()
      .pipe(
        filter(it => it !== undefined),
        switchMap(it => {
          const tu: TranslationUpdate = {
            labels: it!.labels,
            description: it!.description,
          };
          return this.translationService.update(this.spaceId(), translation.id, tu);
        }),
      )
      .subscribe({
        next: () => {
          this.notificationService.success('Translation has been updated.');
        },
        error: () => {
          this.notificationService.error('Translation can not be updated.');
        },
      });
  }

  openDeleteDialog(element: Translation): void {
    this.dialog
      .open<ConfirmationDialogComponent, ConfirmationDialogModel>(ConfirmationDialogComponent, {
        data: {
          title: 'Delete Translation',
          content: `Are you sure about deleting Translation with ID '${element.id}'.`,
        },
      })
      .afterClosed()
      .pipe(
        filter(it => it),
        switchMap(() => this.translationService.delete(this.spaceId(), element.id)),
      )
      .subscribe({
        next: () => {
          this.notificationService.success('Translation has been deleted.');
        },
        error: () => {
          this.notificationService.error('Translation can not be deleted.');
        },
      });
  }

  openImportDialog(locales: Locale[]): void {
    this.dialog
      .open<ImportDialogComponent, ImportDialogModel, ImportDialogReturn>(ImportDialogComponent, {
        panelClass: 'sm',
        data: {
          locales: locales,
        },
      })
      .afterClosed()
      .pipe(
        filter(it => it !== undefined),
        switchMap(it => {
          if (it?.kind === 'FLAT') {
            return this.taskService.createTranslationImportTask(this.spaceId(), it.file, it.locale);
          } else if (it?.kind === 'FULL') {
            return this.taskService.createTranslationImportTask(this.spaceId(), it.file);
          }
          return EMPTY;
        }),
      )
      .subscribe({
        next: () => {
          this.notificationService.success('Translation Import Task has been created.', [
            {
              label: 'To Tasks',
              link: `/features/spaces/${this.spaceId()}/tasks`,
            },
          ]);
        },
        error: () => {
          this.notificationService.error('Translation Import Task can not be created.');
        },
      });
  }

  openExportDialog(locales: Locale[]): void {
    this.dialog
      .open<ExportDialogComponent, ExportDialogModel, ExportDialogReturn>(ExportDialogComponent, {
        panelClass: 'sm',
        data: {
          locales: locales,
        },
      })
      .afterClosed()
      .pipe(
        filter(it => it !== undefined),
        switchMap(it => {
          console.log(it);
          if (it?.kind === 'FLAT') {
            return this.taskService.createTranslationExportTask(this.spaceId(), it.fromDate, it.locale);
          } else if (it?.kind === 'FULL') {
            return this.taskService.createTranslationExportTask(this.spaceId(), it.fromDate);
          }
          return EMPTY;
        }),
      )
      .subscribe({
        next: () => {
          this.notificationService.success('Translation Export Task has been created.', [
            {
              label: 'To Tasks',
              link: `/features/spaces/${this.spaceId()}/tasks`,
            },
          ]);
        },
        error: (err: unknown) => {
          console.error(err);
          this.notificationService.error('Translation Export Task can not be created.');
        },
      });
  }

  selectTranslation(translation: Translation): void {
    this.selectedTranslation = translation;
    this.translateValue.set(undefined);
  }

  updateLocale(transaction: Translation, locale: string, value: string): void {
    this.isLocaleUpdateLoading.set(true);
    this.translationService.updateLocale(this.spaceId(), transaction.id, locale, value).subscribe({
      next: () => {
        this.notificationService.success('Translation has been updated.');
      },
      error: () => {
        this.notificationService.error('Translation can not be updated.');
      },
      complete: () => {
        setTimeout(() => {
          this.isLocaleUpdateLoading.set(false);
          this.cd.markForCheck();
        }, 1000);
      },
    });
  }

  // Labels
  selectLabel(event: MatAutocompleteSelectedEvent): void {
    const { option } = event;
    this.filterLabels.update(it => [...it, option.viewValue]);
    this.currentLabel.set('');
    option.deselect();
    this.selectedTranslation = undefined;
  }

  removeLabel(label: string): void {
    this.filterLabels.update(it => {
      const idx = it.indexOf(label);
      if (idx < 0) {
        return it;
      }
      it.splice(idx, 1);
      return [...it];
    });
    this.selectedTranslation = undefined;
  }

  openPublishedInNewTab(locale: string): void {
    const url = `${location.origin}/api/v1/spaces/${this.spaceId()}/translations/${locale}`;
    window.open(url, '_blank');
  }

  translate(): void {
    this.isTranslateLoading.set(true);
    this.translateService
      .translate({
        content: this.selectedTranslation?.locales[this.selectedSourceLocale] || '',
        sourceLocale: this.selectedSourceLocale,
        targetLocale: this.selectedTargetLocale,
      })
      .subscribe({
        next: value => {
          // make sure the component is updated
          this.translateValue.set(undefined);
          this.notificationService.info('Translated');
          this.translateValue.set(value);
        },
        error: (err: unknown) => {
          console.error(err);
          this.notificationService.error('Can not be translation.', [
            {
              label: 'Documentation',
              link: 'https://localess.org/docs/setup/firebase#errors-in-the-user-interface',
            },
          ]);
        },
        complete: () => {
          console.log('complete');
          setTimeout(() => {
            this.isTranslateLoading.set(false);
            this.cd.markForCheck();
          }, 1000);
        },
      });
  }

  isLocaleTranslatable(sourceLocale: string, targetLocale: string): boolean {
    if (sourceLocale === targetLocale) {
      return false;
    }
    return this.localeService.isLocaleTranslatable(sourceLocale) && this.localeService.isLocaleTranslatable(targetLocale);
  }

  identifyStatus(translate: Translation): TranslationStatus {
    const locales = this.selectedSpace?.locales || [];
    if (Object.getOwnPropertyNames(translate.locales).length === 0) return TranslationStatus.UNTRANSLATED;
    let translateCount = 0;
    for (const locale of locales) {
      if (locale.id in translate.locales && translate.locales[locale.id] !== '') {
        translateCount++;
      }
    }
    if (locales.length === translateCount) {
      return TranslationStatus.TRANSLATED;
    }
    if (translateCount === 0) {
      return TranslationStatus.UNTRANSLATED;
    }
    return TranslationStatus.PARTIALLY_TRANSLATED;
  }
}
