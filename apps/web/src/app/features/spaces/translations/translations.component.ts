import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, computed, DestroyRef, inject, input, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FEATURE_FLAGS } from '@core/feature-flags';
import { NotificationService } from '@core/services/notification.service';
import { SpaceTokenService } from '@core/services/space-token.service';
import { TaskService } from '@core/services/task.service';
import { TranslateService } from '@core/services/translate.service';
import { TranslationService } from '@core/services/translation.service';
import { LocalSettingsStore } from '@core/stores/local-settings.store';
import { SpaceStore } from '@core/stores/space.store';
import { translateErrorMessage } from '@core/utils/translate-error';
import { CONTENT_DEFAULT_LOCALE, Locale, TokenType, Translation, TranslationCreate } from '@localess/shared';
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
import { DIALOG_WIDTH_SM } from '@shared/components/dialog/dialog-width';
import { LocaleIconComponent } from '@shared/components/locale-icon';
import {
  TranslateLocaleDialogComponent,
  TranslateLocaleDialogContext,
  TranslateLocaleDialogResult,
} from '@shared/components/translate-locale-dialog';
import { TOKEN_TYPE_INFO } from '@shared/models/token.model';
import { HasRolePipe } from '@shared/pipes/has-role.pipe';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmProgressImports } from '@spartan-ng/helm/progress';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { HlmToggleGroupImports } from '@spartan-ng/helm/toggle-group';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { EMPTY, forkJoin, of } from 'rxjs';
import { catchError, filter, map, switchMap, take } from 'rxjs/operators';

import { AddDialogComponent, AddDialogContext, AddDialogResult } from './add-dialog';
import { ExportDialogComponent } from './export-dialog/export-dialog.component';
import { ExportDialogContext, ExportDialogResult } from './export-dialog/export-dialog.model';
import { ImportDialogComponent } from './import-dialog/import-dialog.component';
import { ImportDialogContext, ImportDialogResult } from './import-dialog/import-dialog.model';
import { TranslationDetailComponent } from './shared/components/translation-detail/translation-detail.component';
import { TranslationFilterComponent, TranslationFilterCriteria } from './shared/components/translation-filter/translation-filter.component';
import { TranslationListComponent } from './shared/components/translation-list/translation-list.component';

@Component({
  selector: 'll-translations',
  templateUrl: './translations.component.html',
  styleUrls: ['./translations.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // The window below the app header (h-12): the columns take what the toolbar and filter leave.
  host: { class: 'flex h-[calc(100svh-3rem)] flex-col' },
  imports: [
    CommonModule,
    HasRolePipe,
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
    LocaleIconComponent,
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
  protected readonly importExportEnabled = FEATURE_FLAGS.importExport;
  private readonly translationService = inject(TranslationService);
  private readonly taskService = inject(TaskService);
  private readonly notificationService = inject(NotificationService);
  private readonly dialog = inject(HlmDialogService);
  private readonly cd = inject(ChangeDetectorRef);
  private readonly translateService = inject(TranslateService);
  private readonly spaceTokenService = inject(SpaceTokenService);

  // Input
  spaceId = input.required<string>();

  selectedSpace = computed(() => this.spaceStore.selectedSpace());
  // Locales
  availableLocales = computed(() => {
    const defaultLocale = this.spaceStore.defaultLocale();
    if (defaultLocale) {
      return this.spaceStore.locales().map(locale => {
        if (locale.id === defaultLocale.id) {
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

  /** Every label of the space's translations (the filter's choices), from the server. */
  allLabels = signal<string[]>([]);
  /** Whether a key is taken, for the add and rename dialogs (exactly: the server's rule). */
  readonly isKeyTaken = (key: string) => this.translationService.isKeyTaken(this.spaceId(), key);

  // Filter state, fed by TranslationFilterComponent
  currentLocale = signal('');
  filterCriteria = signal<TranslationFilterCriteria | undefined>(undefined);

  selectedTranslation = signal<Translation | undefined>(undefined);

  //Loadings
  isLoading = signal(true);
  isPublishLoading = signal(false);
  isLocaleUpdateLoading = signal(false);

  translationUpdateId = signal<string | undefined>(undefined);

  private destroyRef = inject(DestroyRef);
  // Local Settings
  settingsStore = inject(LocalSettingsStore);
  spaceStore = inject(SpaceStore);

  /** The selected translation's id: the detail panel reads it again whenever it changes. */
  private readonly selectedId = signal<string | undefined>(undefined);
  private readonly selectedId$ = toObservable(this.selectedId);

  ngOnInit(): void {
    this.translationService
      .findLabels(this.spaceId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: labels => this.allLabels.set(labels), error: () => this.allLabels.set([]) });
    // The detail panel follows the selected translation: an edit (here or by someone else) shows at once; a deleted one
    // clears the panel.
    this.selectedId$
      .pipe(
        switchMap(id =>
          id === undefined ? of(undefined) : this.translationService.findOne(this.spaceId(), id).pipe(catchError(() => of(undefined))),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(translation => {
        this.selectedTranslation.set(translation);
        if (!translation) this.selectedId.set(undefined);
      });
    this.isLoading.set(false);
  }

  /** The list or tree loaded: its first key is selected when nothing is. */
  onFirstTranslation(translation: Translation): void {
    if (this.selectedId() === undefined) this.selectTranslation(translation);
  }

  publish(): void {
    this.isPublishLoading.set(true);
    this.translationService.publish(this.spaceId()).subscribe({
      next: () => {
        this.notificationService.success('Translations have been published.');
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
    const defaultLocale = this.spaceStore.defaultLocale();
    if (!defaultLocale) return;
    const spaceLocales = this.spaceStore.locales();
    // A locale that could not be auto-translated is left empty; the first reason is reported once, after the save.
    let autoTranslateError: unknown;
    this.dialog
      .open<AddDialogResult, AddDialogContext>(AddDialogComponent, {
        context: {
          isKeyTaken: this.isKeyTaken,
        },
        contentClass: DIALOG_WIDTH_SM,
      })
      .closed$.pipe(
        take(1),
        filter(it => it !== undefined),
        // Resolve every locale value client-side (fallback + optional auto-translated locales)
        // BEFORE writing anything, so `create()` performs a single request with all
        // required locale fields already populated — no follow-up per-locale saves.
        switchMap(it => {
          const locales: Record<string, string> = { [defaultLocale.id]: it!.value };
          const otherLocales = spaceLocales.filter(locale => locale.id !== defaultLocale.id);
          if (!it!.autoTranslate || otherLocales.length === 0) {
            return of({ it: it!, locales });
          }
          return forkJoin(
            otherLocales.map(locale =>
              this.translateService
                .translate({
                  content: it!.value,
                  sourceLocale: defaultLocale.id,
                  targetLocale: locale.id,
                })
                .pipe(
                  map(value => ({ localeId: locale.id, value })),
                  catchError((err: unknown) => {
                    console.error(err);
                    autoTranslateError ??= err;
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
            key: it.key,
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
          if (autoTranslateError !== undefined) {
            this.notificationService.error(translateErrorMessage(autoTranslateError, 'Some locales could not be auto-translated.'));
          }
        },
        error: () => {
          this.notificationService.error('Translation can not be added.');
        },
      });
  }

  openImportDialog(locales: Locale[]): void {
    this.dialog
      .open<ImportDialogResult, ImportDialogContext>(ImportDialogComponent, {
        context: {
          locales: locales,
        },
        contentClass: DIALOG_WIDTH_SM,
      })
      .closed$.pipe(
        take(1),
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
      .open<ExportDialogResult, ExportDialogContext>(ExportDialogComponent, {
        context: {
          locales: locales,
        },
        contentClass: DIALOG_WIDTH_SM,
      })
      .closed$.pipe(
        take(1),
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
      .open<TranslateLocaleDialogResult, TranslateLocaleDialogContext>(TranslateLocaleDialogComponent, {
        context: {
          locales: locales,
        },
        contentClass: DIALOG_WIDTH_SM,
      })
      .closed$.pipe(
        take(1),
        filter(it => it !== undefined),
        switchMap(it => this.translationService.translateLocale(this.spaceId(), it.sourceLocale, it.targetLocale, it.overwrite)),
      )
      .subscribe({
        next: ({ translated, failed }) => {
          if (failed > 0) {
            this.notificationService.error(`Translated ${translated} keys; ${failed} failed and were left unchanged.`);
          } else if (translated === 0) {
            this.notificationService.success('Nothing to translate.');
          } else {
            this.notificationService.success(`Translated ${translated} keys.`);
          }
        },
        error: (err: unknown) => {
          this.notificationService.error(translateErrorMessage(err, 'Locale Translate failed.'));
        },
      });
  }

  selectTranslation(translation: Translation): void {
    this.selectedTranslation.set(translation);
    this.selectedId.set(translation.id);
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
    this.withApiToken([TokenType.PREVIEW], token => this.openApiV1InNewTab(locale, token, 'draft'));
  }

  openPublishedV1InNewTab(locale: string): void {
    this.withApiToken([TokenType.PUBLIC, TokenType.PREVIEW], token => this.openApiV1InNewTab(locale, token));
  }

  /** Opens `open` with the current value of the first of `types` the space has; a toast when it has none or the lookup fails. */
  private withApiToken(types: TokenType[], open: (token: string) => void): void {
    this.spaceTokenService.firstValue(this.spaceId(), types).subscribe({
      next: token => {
        if (token) open(token);
        else this.notificationService.error(`Please create a ${TOKEN_TYPE_INFO[types[0]].label} Token in your Space Settings`);
      },
      error: () => this.notificationService.error('Tokens could not be loaded'),
    });
  }
}
