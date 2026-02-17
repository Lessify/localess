import { ClipboardModule } from '@angular/cdk/clipboard';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  linkedSignal,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatTreeModule } from '@angular/material/tree';
import { ObjectUtils } from '@core/utils/object-utils.service';
import { provideIcons } from '@ng-icons/core';
import {
  lucideArrowRight,
  lucideCheck,
  lucideChevronDown,
  lucideChevronRight,
  lucideCirclePlus,
  lucideCircleQuestionMark,
  lucideCircleSmall,
  lucideCloudDownload,
  lucideCopy,
  lucideEarth,
  lucideEllipsisVertical,
  lucideExternalLink,
  lucideHistory,
  lucideLanguages,
  lucideLayoutList,
  lucideListTree,
  lucidePencil,
  lucidePlus,
  lucideReplace,
  lucideSave,
  lucideSearch,
  lucideTrash,
  lucideUpload,
  lucideUploadCloud,
} from '@ng-icons/lucide';
import { ConfirmationDialogComponent } from '@shared/components/confirmation-dialog/confirmation-dialog.component';
import { ConfirmationDialogModel } from '@shared/components/confirmation-dialog/confirmation-dialog.model';
import { StatusComponent } from '@shared/components/status';
import { Locale, TRANSLATION_DEFAULT_LOCALE } from '@shared/models/locale.model';
import { TranslationHistory } from '@shared/models/translation-history.model';
import { Translation, TranslationCreate, TranslationStatus, TranslationUpdate } from '@shared/models/translation.model';
import { CanUserPerformPipe } from '@shared/pipes/can-user-perform.pipe';
import { LocaleService } from '@shared/services/locale.service';
import { NotificationService } from '@shared/services/notification.service';
import { TaskService } from '@shared/services/task.service';
import { TokenService } from '@shared/services/token.service';
import { TranslateService } from '@shared/services/translate.service';
import { TranslationHistoryService } from '@shared/services/translation-history.service';
import { TranslationService } from '@shared/services/translation.service';
import { LocalSettingsStore } from '@shared/stores/local-settings.store';
import { SpaceStore } from '@shared/stores/space.store';
import { BrnSelectImports } from '@spartan-ng/brain/select';
import { BrnSheetImports } from '@spartan-ng/brain/sheet';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmButtonGroupImports } from '@spartan-ng/helm/button-group';
import { HlmCommandImports } from '@spartan-ng/helm/command';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { HlmItemImports } from '@spartan-ng/helm/item';
import { HlmPopoverImports } from '@spartan-ng/helm/popover';
import { HlmProgressImports } from '@spartan-ng/helm/progress';
import { HlmScrollAreaImports } from '@spartan-ng/helm/scroll-area';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmSeparatorImports } from '@spartan-ng/helm/separator';
import { HlmSheetImports } from '@spartan-ng/helm/sheet';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { HlmToggleGroupImports } from '@spartan-ng/helm/toggle-group';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { NgScrollbarModule } from 'ngx-scrollbar';
import { debounceTime, EMPTY, Observable } from 'rxjs';
import { filter, switchMap } from 'rxjs/operators';
import { AddDialogComponent, AddDialogModel, AddDialogReturnModel } from './add-dialog';
import { EditDialogComponent, EditDialogModel } from './edit-dialog';
import { EditIdDialogComponent, EditIdDialogModel } from './edit-id-dialog';
import { ExportDialogComponent } from './export-dialog/export-dialog.component';
import { ExportDialogModel, ExportDialogReturn } from './export-dialog/export-dialog.model';
import { ImportDialogComponent } from './import-dialog/import-dialog.component';
import { ImportDialogModel, ImportDialogReturn } from './import-dialog/import-dialog.model';
import { TranslationArrayEditComponent } from './shared/components/translation-array-edit/translation-array-edit.component';
import { TranslationArrayViewComponent } from './shared/components/translation-array-view/translation-array-view.component';
import { TranslationPluralEditComponent } from './shared/components/translation-plural-edit/translation-plural-edit.component';
import { TranslationPluralViewComponent } from './shared/components/translation-plural-view/translation-plural-view.component';
import { TranslationStringEditComponent } from './shared/components/translation-string-edit/translation-string-edit.component';
import { TranslationStringViewComponent } from './shared/components/translation-string-view/translation-string-view.component';
import { TranslationNode } from './shared/models/translation.model';
import { TokenPermission } from '@shared/models/token.model';

@Component({
  selector: 'll-translations',
  templateUrl: './translations.component.html',
  styleUrls: ['./translations.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    CanUserPerformPipe,
    ReactiveFormsModule,
    ScrollingModule,
    StatusComponent,
    TranslationStringViewComponent,
    TranslationPluralViewComponent,
    TranslationArrayViewComponent,
    TranslationStringEditComponent,
    TranslationPluralEditComponent,
    TranslationArrayEditComponent,
    ClipboardModule,
    MatTreeModule,
    HlmButtonImports,
    HlmIconImports,
    HlmTooltipImports,
    HlmDropdownMenuImports,
    HlmToggleGroupImports,
    HlmProgressImports,
    HlmSheetImports,
    BrnSheetImports,
    HlmScrollAreaImports,
    NgScrollbarModule,
    HlmSpinnerImports,
    HlmSelectImports,
    BrnSelectImports,
    HlmFieldImports,
    HlmPopoverImports,
    HlmCommandImports,
    HlmButtonGroupImports,
    HlmBadgeImports,
    HlmItemImports,
    HlmInputGroupImports,
    HlmSeparatorImports,
  ],
  providers: [
    provideIcons({
      lucidePlus,
      lucideCirclePlus,
      lucideCheck,
      lucideEllipsisVertical,
      lucideCloudDownload,
      lucideUploadCloud,
      lucideUpload,
      lucideHistory,
      lucideEarth,
      lucideExternalLink,
      lucideLayoutList,
      lucideListTree,
      lucideSearch,
      lucideCircleSmall,
      lucideReplace,
      lucidePencil,
      lucideTrash,
      lucideCopy,
      lucideSave,
      lucideArrowRight,
      lucideLanguages,
      lucideCircleQuestionMark,
      lucideChevronRight,
      lucideChevronDown,
    }),
  ],
})
export class TranslationsComponent implements OnInit {
  private readonly translationService = inject(TranslationService);
  private readonly translateHistoryService = inject(TranslationHistoryService);
  private readonly localeService = inject(LocaleService);
  private readonly taskService = inject(TaskService);
  private readonly notificationService = inject(NotificationService);
  private readonly dialog = inject(MatDialog);
  private readonly cd = inject(ChangeDetectorRef);
  private readonly translateService = inject(TranslateService);
  private readonly tokenService = inject(TokenService);
  private readonly fb = inject(FormBuilder);

  // Input
  spaceId = input.required<string>();

  // Form
  filterForm = this.fb.group({
    locale: this.fb.control<string>('', [Validators.required]),
    search: this.fb.control<string>('', []),
    labels: this.fb.control<string[]>([], []),
    states: this.fb.control<TranslationStatus[]>([], []),
  });
  $filterForm = toSignal(this.filterForm.valueChanges.pipe(debounceTime(500)));

  selectedSpace = computed(() => this.spaceStore.selectedSpace());
  showHistory = signal(false);

  // Translations
  translations = signal<Translation[]>([]);
  translationsFiltered = computed(() => {
    const form = this.$filterForm();
    return this.filterTranslations(this.translations(), form?.locale || 'en', form?.search || '', form?.labels || [], form?.states || []);
  });
  translationTreeFiltered = computed(() => this.buildTranslationTree(this.translationsFiltered()));
  translationIds = computed(() => this.translations().map(it => it.id));
  translationMap = computed(() => new Map<string, Translation>(this.translations().map(it => [it.id, it])));

  //Labels
  allLabels = computed(() => {
    const tmp = this.translations()
      .map(it => it.labels)
      .flat()
      .filter(it => it != undefined)
      .map(it => it!);
    return [...new Set<string>(tmp)];
  });
  allStates = [TranslationStatus.TRANSLATED, TranslationStatus.PARTIALLY_TRANSLATED, TranslationStatus.UNTRANSLATED];
  stateTranslations: Record<TranslationStatus, string> = {
    [TranslationStatus.TRANSLATED]: 'Translated',
    [TranslationStatus.PARTIALLY_TRANSLATED]: 'Partially Translated',
    [TranslationStatus.UNTRANSLATED]: 'Untranslated',
  };

  selectedTranslation = signal<Translation | undefined>(undefined);
  selectedTranslationLocaleValue = linkedSignal(() => {
    return this.selectedTranslation()?.locales[this.selectedTargetLocale().id] || '';
  });

  selectedSourceLocale = linkedSignal(() => {
    const space = this.selectedSpace();
    return space ? space.localeFallback : TRANSLATION_DEFAULT_LOCALE;
  });
  selectedTargetLocale = linkedSignal(() => {
    const space = this.selectedSpace();
    return space ? space.localeFallback : TRANSLATION_DEFAULT_LOCALE;
  });

  availableToken?: string = undefined;

  // Subscriptions
  history$?: Observable<TranslationHistory[]>;

  //Loadings
  isLoading = signal(true);
  isPublishLoading = signal(false);
  isLocaleUpdateLoading = signal(false);
  isTranslateLoading = signal(false);

  translationUpdateId = signal<string | undefined>(undefined);

  private destroyRef = inject(DestroyRef);
  // Local Settings
  settingsStore = inject(LocalSettingsStore);
  spaceStore = inject(SpaceStore);

  // Tree features
  childrenAccessor = (node: TranslationNode) => node.children ?? [];
  hasChild = (_: number, node: TranslationNode) => !!node.children && node.children.length > 0;
  trackBy = (_: number, node: TranslationNode) => this.expansionKey(node);
  expansionKey = (node: TranslationNode) => node.key;

  constructor() {
    effect(() => {
      const space = this.selectedSpace();
      if (space) {
        if (this.filterForm.value.locale === '') {
          this.filterForm.patchValue({ locale: space.localeFallback.id });
        }
      }
    });
  }

  ngOnInit(): void {
    this.filterForm.valueChanges.subscribe(value => console.log(value));
    this.translationService
      .findAll(this.spaceId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: translations => {
          this.translations.set(translations);
          if (translations.length > 0) {
            if (this.selectedTranslation()) {
              const tr = translations.find(it => it.id === this.selectedTranslation()?.id);
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
    const space = this.selectedSpace();
    if (!space) return;
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
            locale: space.localeFallback.id,
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

  filterTranslations(items: Translation[], locale: string, search: string, labels: string[], states: TranslationStatus[]): Translation[] {
    console.log('Filtering translations', locale, search, labels, states);
    const lcFilter = search.trim().toLowerCase();
    if (!items || (!search && !labels.length && !states.length)) {
      return items;
    }
    return items.filter(it => {
      const matchByLabel = !labels.length || (it.labels && it.labels.length > 0 && labels.some(label => it.labels?.includes(label)));
      const matchByStatus = !states.length || states.includes(this.identifyStatus(it));
      if (!matchByStatus) return false;
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
    this.selectedTranslation.set(translation);
  }

  updateLocale(transaction: Translation, locale: Locale, value: string): void {
    this.isLocaleUpdateLoading.set(true);
    this.translationUpdateId.set(transaction.id);
    this.translationService.updateLocale(this.spaceId(), transaction.id, locale.id, value).subscribe({
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
  compareLocale(a: Locale, b: Locale): boolean {
    return a.id === b.id;
  }

  selectLabel(label: string): void {
    const current = this.filterForm.controls.labels.value || [];
    if (current.includes(label)) {
      this.filterForm.controls.labels.setValue(current.filter(l => l !== label));
    } else {
      this.filterForm.controls.labels.setValue([...current, label]);
    }
  }

  selectState(state: TranslationStatus): void {
    const current = this.filterForm.controls.states.value || [];
    if (current.includes(state)) {
      this.filterForm.controls.states.setValue(current.filter(l => l !== state));
    } else {
      this.filterForm.controls.states.setValue([...current, state]);
    }
  }

  openApiV1InNewTab(locale: string, token: string, version?: 'draft'): void {
    const url = new URL(`${location.origin}/api/v1/spaces/${this.spaceId()}/translations/${locale}`);
    if (version) {
      url.searchParams.set('version', version);
    }
    url.searchParams.set('token', token);
    window.open(url, '_blank');
  }

  openDraftV1InNewTab(locale: string): void {
    if (this.availableToken) {
      this.openApiV1InNewTab(locale, this.availableToken, 'draft');
    } else {
      this.tokenService.findFirstByPermission(this.spaceId(), TokenPermission.TRANSLATION_DRAFT).subscribe({
        next: tokens => {
          if (tokens.length === 1) {
            this.availableToken = tokens[0].id;
            this.openApiV1InNewTab(locale, this.availableToken, 'draft');
          } else {
            this.notificationService.error('Please create Access Token with Translation Draft Permission in your Space Settings');
          }
        },
      });
    }
  }

  openPublishedV1InNewTab(locale: string): void {
    if (this.availableToken) {
      this.openApiV1InNewTab(locale, this.availableToken);
    } else {
      this.tokenService.findFirstByPermission(this.spaceId(), TokenPermission.TRANSLATION_PUBLIC).subscribe({
        next: tokens => {
          if (tokens.length === 1) {
            this.availableToken = tokens[0].id;
            this.openApiV1InNewTab(locale, this.availableToken);
          } else {
            this.notificationService.error('Please create Access Token with Translation Public Permission in your Space Settings');
          }
        },
      });
    }
  }

  translate(): void {
    this.isTranslateLoading.set(true);
    this.translateService
      .translate({
        content: this.selectedTranslation()?.locales[this.selectedSourceLocale().id] || '',
        sourceLocale: this.selectedSourceLocale().id,
        targetLocale: this.selectedTargetLocale().id,
      })
      .subscribe({
        next: value => {
          console.log('[translate]', value);
          // make sure the component is updated
          this.selectedTranslationLocaleValue.set(value);
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

  isLocaleTranslatable(sourceLocale: Locale, targetLocale: Locale): boolean {
    if (sourceLocale.id === targetLocale.id) {
      return false;
    }
    return this.localeService.isLocaleTranslatable(sourceLocale.id) && this.localeService.isLocaleTranslatable(targetLocale.id);
  }

  identifyStatus(translate: Translation): TranslationStatus {
    const space = this.selectedSpace();
    const locales = space?.locales || [];
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
