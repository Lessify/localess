import { ClipboardModule } from '@angular/cdk/clipboard';
import { COMMA, ENTER, SPACE } from '@angular/cdk/keycodes';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, computed, DestroyRef, inject, input, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTreeModule } from '@angular/material/tree';
import { ObjectUtils } from '@core/utils/object-utils.service';
import { ConfirmationDialogComponent } from '@shared/components/confirmation-dialog/confirmation-dialog.component';
import { ConfirmationDialogModel } from '@shared/components/confirmation-dialog/confirmation-dialog.model';
import { StatusComponent } from '@shared/components/status';
import { AnimateDirective } from '@shared/directives/animate.directive';
import { Locale } from '@shared/models/locale.model';
import { Space } from '@shared/models/space.model';
import { TranslationHistory } from '@shared/models/translation-history.model';
import { Translation, TranslationCreate, TranslationStatus, TranslationUpdate } from '@shared/models/translation.model';
import { CanUserPerformPipe } from '@shared/pipes/can-user-perform.pipe';
import { LocaleService } from '@shared/services/locale.service';
import { NotificationService } from '@shared/services/notification.service';
import { SpaceService } from '@shared/services/space.service';
import { TaskService } from '@shared/services/task.service';
import { TokenService } from '@shared/services/token.service';
import { TranslateService } from '@shared/services/translate.service';
import { TranslationHistoryService } from '@shared/services/translation-history.service';
import { TranslationService } from '@shared/services/translation.service';
import { LocalSettingsStore } from '@shared/stores/local-settings.store';
import { EMPTY, Observable } from 'rxjs';
import { filter, switchMap, tap } from 'rxjs/operators';
import { AddDialogComponent, AddDialogModel, AddDialogReturnModel } from './add-dialog';
import { EditDialogComponent, EditDialogModel } from './edit-dialog';
import { EditIdDialogComponent, EditIdDialogModel } from './edit-id-dialog';
import { ExportDialogComponent } from './export-dialog/export-dialog.component';
import { ExportDialogModel, ExportDialogReturn } from './export-dialog/export-dialog.model';
import { ImportDialogComponent } from './import-dialog/import-dialog.component';
import { ImportDialogModel, ImportDialogReturn } from './import-dialog/import-dialog.model';
import { TranslationNode } from './shared/models/translation.model';
import { TranslationArrayEditComponent } from './translation-array-edit/translation-array-edit.component';
import { TranslationArrayViewComponent } from './translation-array-view/translation-array-view.component';
import { TranslationPluralEditComponent } from './translation-plural-edit/translation-plural-edit.component';
import { TranslationPluralViewComponent } from './translation-plural-view/translation-plural-view.component';
import { TranslationStringEditComponent } from './translation-string-edit/translation-string-edit.component';
import { TranslationStringViewComponent } from './translation-string-view/translation-string-view.component';

@Component({
  selector: 'll-translations',
  templateUrl: './translations.component.html',
  styleUrls: ['./translations.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatIconModule,
    CanUserPerformPipe,
    MatButtonModule,
    MatTooltipModule,
    MatMenuModule,
    MatDividerModule,
    MatProgressBarModule,
    MatSidenavModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    ReactiveFormsModule,
    MatChipsModule,
    FormsModule,
    MatAutocompleteModule,
    ScrollingModule,
    StatusComponent,
    TranslationStringViewComponent,
    TranslationPluralViewComponent,
    TranslationArrayViewComponent,
    TranslationStringEditComponent,
    TranslationPluralEditComponent,
    TranslationArrayEditComponent,
    ClipboardModule,
    AnimateDirective,
    MatButtonToggleModule,
    MatTreeModule,
  ],
})
export class TranslationsComponent implements OnInit {
  private readonly translationService = inject(TranslationService);
  private readonly translateHistoryService = inject(TranslationHistoryService);
  private readonly localeService = inject(LocaleService);
  private readonly spaceService = inject(SpaceService);
  private readonly taskService = inject(TaskService);
  private readonly notificationService = inject(NotificationService);
  private readonly dialog = inject(MatDialog);
  private readonly cd = inject(ChangeDetectorRef);
  private readonly translateService = inject(TranslateService);
  private readonly tokenService = inject(TokenService);
  private readonly fb = inject(FormBuilder);

  // Input
  spaceId = input.required<string>();

  selectedSpace?: Space;
  showHistory = false;

  DEFAULT_LOCALE = 'en';

  translations = signal<Translation[]>([]);
  translationsFiltered = computed(() =>
    this.filterTranslations(this.translations(), this.searchValue(), this.selectedSearchLocale(), this.filterLabels()),
  );
  translationTreeFiltered = computed(() => this.buildTranslationTree(this.translationsFiltered()));
  translationIds = computed(() => this.translations().map(it => it.id));
  translationMap = computed(() => new Map<string, Translation>(this.translations().map(it => [it.id, it])));
  //Search
  searchValue = signal('');

  //Labels
  currentLabel = signal('');
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
    const currentLabel = this.currentLabel().toLowerCase();
    if (currentLabel) {
      return this.allLabels()
        .filter(label => !this.filterLabels().includes(label))
        .filter(label => label.toLowerCase().includes(currentLabel));
    }
    return this.allLabels().filter(label => !this.filterLabels().includes(label));
  });

  selectedTranslation?: Translation;
  selectedTranslationLocaleValue?: string;

  selectedSearchLocale = signal('');
  selectedSourceLocale = signal('');
  selectedTargetLocale = signal('');

  availableToken?: string = undefined;

  // Subscriptions
  history$?: Observable<TranslationHistory[]>;
  space$?: Observable<Space>;

  //Loadings
  isLoading = signal(true);
  isPublishLoading = signal(false);
  isLocaleUpdateLoading = signal(false);
  isTranslateLoading = signal(false);

  translationUpdateId = signal<string | undefined>(undefined);

  private destroyRef = inject(DestroyRef);
  // Local Settings
  settingsStore = inject(LocalSettingsStore);

  // Tree features
  childrenAccessor = (node: TranslationNode) => node.children ?? [];
  hasChild = (_: number, node: TranslationNode) => !!node.children && node.children.length > 0;
  trackBy = (_: number, node: TranslationNode) => this.expansionKey(node);
  expansionKey = (node: TranslationNode) => node.key;

  ngOnInit(): void {
    this.space$ = this.spaceService.findById(this.spaceId()).pipe(
      tap(space => {
        this.selectedSpace = space;
        //this.locales = space.locales;
        if (this.selectedSearchLocale() === '') {
          this.selectedSearchLocale.set(space.localeFallback.id);
        }
        if (this.selectedSourceLocale() === '') {
          this.selectedSourceLocale.set(space.localeFallback.id);
        }
        if (this.selectedTargetLocale() === '') {
          this.selectedTargetLocale.set(space.localeFallback.id);
        }
      }),
      takeUntilDestroyed(this.destroyRef),
    );
    this.translationService
      .findAll(this.spaceId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: translations => {
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
        },
      });
    this.history$ = this.translateHistoryService.findAll(this.spaceId()).pipe(takeUntilDestroyed(this.destroyRef));
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

  filterTranslations(items: Translation[], filter: string, locale: string, labels: string[]): Translation[] {
    const lcFilter = filter.toLowerCase();
    if (!items || (!filter && !labels.length)) {
      return items;
    }
    return items.filter(it => {
      const matchByLabel = !labels.length || (it.labels && it.labels.length > 0 && labels.every(label => it.labels?.includes(label)));
      if (it.id.toLowerCase().includes(lcFilter) && matchByLabel) {
        return true;
      } else {
        const localeValue = it.locales[locale];
        if (localeValue) {
          return localeValue.toLowerCase().includes(lcFilter) && matchByLabel;
        }
        return false;
      }
    });
  }

  buildTranslationTree(translations: Translation[]): TranslationNode[] {
    const tTree: Record<string, any> = {};
    for (const translation of translations) {
      const keys = translation.id.split('.');
      let currentNode = tTree;
      // construct shape
      for (const key of keys) {
        if (!currentNode[key]) {
          currentNode[key] = {};
        }
        currentNode = currentNode[key];
      }
    }

    function convertTree(node: Record<string, any>, prefix?: string): TranslationNode[] {
      return Object.entries(node).map(([key, value]) => ({
        name: key,
        key: prefix ? `${prefix}.${key}` : key,
        ...(Object.keys(value).length > 0 && { children: convertTree(value, prefix ? `${prefix}.${key}` : key) }),
      }));
    }

    return convertTree(tTree);
  }

  selectTranslation(translation: Translation): void {
    this.selectedTranslation = translation;
    this.selectedTranslationLocaleValue = this.selectedTranslation.locales[this.selectedTargetLocale()];
  }

  selectTargetLocale(): void {
    this.selectedTranslationLocaleValue = this.selectedTranslation?.locales[this.selectedTargetLocale()];
  }

  updateLocale(transaction: Translation, locale: string, value: string): void {
    this.isLocaleUpdateLoading.set(true);
    this.translationUpdateId.set(transaction.id);
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
          this.translationUpdateId.set(undefined);
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

  openApiV1InNewTab(locale: string, token: string): void {
    const url = new URL(`${location.origin}/api/v1/spaces/${this.spaceId()}/translations/${locale}`);
    url.searchParams.set('token', token);
    window.open(url, '_blank');
  }

  openPublishedV1InNewTab(locale: string): void {
    if (this.availableToken) {
      this.openApiV1InNewTab(locale, this.availableToken);
    } else {
      this.tokenService.findFirst(this.spaceId()).subscribe({
        next: tokens => {
          if (tokens.length === 1) {
            this.availableToken = tokens[0].id;
            this.openApiV1InNewTab(locale, this.availableToken);
          } else {
            this.notificationService.error('Please create Access Token in your Space Settings');
          }
        },
      });
    }
  }

  translate(): void {
    this.isTranslateLoading.set(true);
    this.translateService
      .translate({
        content: this.selectedTranslation?.locales[this.selectedSourceLocale()] || '',
        sourceLocale: this.selectedSourceLocale(),
        targetLocale: this.selectedTargetLocale(),
      })
      .subscribe({
        next: value => {
          // make sure the component is updated
          this.selectedTranslationLocaleValue = value;
          this.notificationService.success('Translated');
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
            this.cd.detectChanges();
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
