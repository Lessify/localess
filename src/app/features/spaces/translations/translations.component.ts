import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, computed, DestroyRef, inject, input, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { provideIcons } from '@ng-icons/core';
import {
  lucideCloudDownload,
  lucideEarth,
  lucideEllipsisVertical,
  lucideExternalLink,
  lucideLanguages,
  lucideLayoutList,
  lucideListTree,
  lucidePencil,
  lucidePlus,
  lucideUpload,
  lucideUploadCloud,
} from '@ng-icons/lucide';
import {
  TranslateLocaleDialogComponent,
  TranslateLocaleDialogModel,
  TranslateLocaleDialogReturn,
} from '@shared/components/translate-locale-dialog';
import { CONTENT_DEFAULT_LOCALE, Locale } from '@shared/models/locale.model';
import { TokenPermission } from '@shared/models/token.model';
import { Translation, TranslationCreate, TranslationType } from '@shared/models/translation.model';
import { CanUserPerformPipe } from '@shared/pipes/can-user-perform.pipe';
import { NotificationService } from '@shared/services/notification.service';
import { TaskService } from '@shared/services/task.service';
import { TokenService } from '@shared/services/token.service';
import { TranslateService } from '@shared/services/translate.service';
import { TranslationService } from '@shared/services/translation.service';
import { LocalSettingsStore } from '@shared/stores/local-settings.store';
import { SpaceStore } from '@shared/stores/space.store';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmProgressImports } from '@spartan-ng/helm/progress';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { HlmToggleGroupImports } from '@spartan-ng/helm/toggle-group';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { EMPTY, forkJoin, of } from 'rxjs';
import { catchError, filter, map, switchMap } from 'rxjs/operators';

import { AddDialogComponent, AddDialogModel, AddDialogReturnModel } from './add-dialog';
import { ExportDialogComponent } from './export-dialog/export-dialog.component';
import { ExportDialogModel, ExportDialogReturn } from './export-dialog/export-dialog.model';
import { ImportDialogComponent } from './import-dialog/import-dialog.component';
import { ImportDialogModel, ImportDialogReturn } from './import-dialog/import-dialog.model';
import { TranslationDetailComponent } from './shared/components/translation-detail/translation-detail.component';
import { TranslationFilterComponent, TranslationFilterCriteria } from './shared/components/translation-filter/translation-filter.component';
import { TranslationListComponent } from './shared/components/translation-list/translation-list.component';

@Component({
  selector: 'll-translations',
  templateUrl: './translations.component.html',
  styleUrls: ['./translations.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    CanUserPerformPipe,
    TranslationFilterComponent,
    TranslationListComponent,
    TranslationDetailComponent,
    HlmButtonImports,
    HlmIconImports,
    HlmTooltipImports,
    HlmDropdownMenuImports,
    HlmToggleGroupImports,
    HlmProgressImports,
    HlmSpinnerImports,
  ],
  providers: [
    provideIcons({
      lucidePlus,
      lucideEllipsisVertical,
      lucideCloudDownload,
      lucideUploadCloud,
      lucideUpload,
      lucideEarth,
      lucideExternalLink,
      lucideLayoutList,
      lucideListTree,
      lucidePencil,
      lucideLanguages,
    }),
  ],
})
export class TranslationsComponent implements OnInit {
  private readonly translationService = inject(TranslationService);
  private readonly taskService = inject(TaskService);
  private readonly notificationService = inject(NotificationService);
  private readonly dialog = inject(MatDialog);
  private readonly cd = inject(ChangeDetectorRef);
  private readonly translateService = inject(TranslateService);
  private readonly tokenService = inject(TokenService);

  // Input
  spaceId = input.required<string>();

  selectedSpace = computed(() => this.spaceStore.selectedSpace());
  // Locales
  availableLocales = computed(() => {
    const space = this.selectedSpace();
    if (space) {
      const { locales, localeFallback } = space;
      return locales.map(locale => {
        if (locale.id === localeFallback.id) {
          return {
            id: locale.id,
            name: `${locale.name} (${CONTENT_DEFAULT_LOCALE.name})`,
          };
        }
        return locale;
      });
    }
    return [];
  });

  // Translations
  translations = signal<Translation[]>([]);
  translationIds = computed(() => this.translations().map(it => it.id));

  // Labels
  allLabels = computed(() => {
    const tmp = this.translations()
      .map(it => it.labels)
      .flat()
      .filter(it => it != undefined)
      .map(it => it!);
    return [...new Set<string>(tmp)];
  });

  // Filter state, fed by TranslationFilterComponent
  currentLocale = signal('');
  filterCriteria = signal<TranslationFilterCriteria | undefined>(undefined);

  selectedTranslation = signal<Translation | undefined>(undefined);

  availableToken?: string = undefined;

  //Loadings
  isLoading = signal(true);
  isPublishLoading = signal(false);
  isLocaleUpdateLoading = signal(false);

  translationUpdateId = signal<string | undefined>(undefined);

  private destroyRef = inject(DestroyRef);
  // Local Settings
  settingsStore = inject(LocalSettingsStore);
  spaceStore = inject(SpaceStore);

  ngOnInit(): void {
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
        // Resolve every locale value client-side (fallback + optional auto-translated locales)
        // BEFORE writing anything, so `create()` performs a single Firestore write with all
        // required locale fields already populated — no follow-up per-locale saves.
        switchMap(it => {
          const locales: Record<string, string> = { [space.localeFallback.id]: it!.value };
          const otherLocales = space.locales.filter(locale => locale.id !== space.localeFallback.id);
          if (!it!.autoTranslate || it!.type !== TranslationType.STRING || otherLocales.length === 0) {
            return of({ it: it!, locales });
          }
          return forkJoin(
            otherLocales.map(locale =>
              this.translateService
                .translate({
                  content: it!.value,
                  sourceLocale: space.localeFallback.id,
                  targetLocale: locale.id,
                })
                .pipe(
                  map(value => ({ localeId: locale.id, value })),
                  catchError(err => {
                    console.error(err);
                    return of(null);
                  }),
                ),
            ),
          ).pipe(
            map(results => {
              for (const result of results) {
                if (result) locales[result.localeId] = result.value;
              }
              return { it: it!, locales };
            }),
          );
        }),
        switchMap(({ it, locales }) => {
          const tc: TranslationCreate = {
            id: it.id,
            type: it.type,
            locales,
            labels: it.labels,
            description: it.description,
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
          this.notificationService.success('Translation Import Task has been created.', {
            action: {
              type: 'route',
              label: 'To Tasks',
              link: `/features/spaces/${this.spaceId()}/tasks`,
            },
          });
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
            return this.taskService.createTranslationExportTask(this.spaceId(), it.locale);
          } else if (it?.kind === 'FULL') {
            return this.taskService.createTranslationExportTask(this.spaceId());
          }
          return EMPTY;
        }),
      )
      .subscribe({
        next: () => {
          this.notificationService.success('Translation Export Task has been created.', {
            action: {
              type: 'route',
              label: 'To Tasks',
              link: `/features/spaces/${this.spaceId()}/tasks`,
            },
          });
        },
        error: (err: unknown) => {
          console.error(err);
          this.notificationService.error('Translation Export Task can not be created.');
        },
      });
  }

  openTranslateLocaleDialog(locales: Locale[]): void {
    this.dialog
      .open<TranslateLocaleDialogComponent, TranslateLocaleDialogModel, TranslateLocaleDialogReturn>(TranslateLocaleDialogComponent, {
        panelClass: 'sm',
        data: {
          locales: locales,
        },
      })
      .afterClosed()
      .pipe(
        filter(it => it !== undefined),
        switchMap(it => this.translationService.translateLocale(this.spaceId(), it.sourceLocale, it.targetLocale)),
      )
      .subscribe({
        next: () => {
          this.notificationService.success('Locale Translate run with success.');
        },
        error: () => {
          this.notificationService.error('Locale Translate failed.');
        },
      });
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
}
