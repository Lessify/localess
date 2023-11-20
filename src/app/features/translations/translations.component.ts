import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, ElementRef, inject, OnInit, ViewChild } from '@angular/core';
import { combineLatest, debounceTime, EMPTY, Observable, startWith } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { filter, map, switchMap } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { FormBuilder, FormControl } from '@angular/forms';
import { MatAutocomplete, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { Store } from '@ngrx/store';
import { TranslationService } from '@shared/services/translation.service';
import { SpaceService } from '@shared/services/space.service';
import { AppState } from '@core/state/core.state';
import { Locale } from '@shared/models/locale.model';
import { Translation, TranslationCreate, TranslationStatus, TranslationUpdate } from '@shared/models/translation.model';
import { selectSpace } from '@core/state/space/space.selector';
import { Space } from '@shared/models/space.model';
import { TranslationAddDialogComponent } from './translation-add-dialog/translation-add-dialog.component';
import { TranslationAddDialogModel } from './translation-add-dialog/translation-add-dialog.model';
import { TranslationEditDialogModel } from './translation-edit-dialog/translation-edit-dialog.model';
import { TranslationEditDialogComponent } from './translation-edit-dialog/translation-edit-dialog.component';
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

@Component({
  selector: 'll-translations',
  templateUrl: './translations.component.html',
  styleUrls: ['./translations.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TranslationsComponent implements OnInit {
  @ViewChild('labelsInput') labelsInput!: ElementRef<HTMLInputElement>;
  @ViewChild('auto') matAutocomplete!: MatAutocomplete;

  selectedSpace?: Space;

  DEFAULT_LOCALE = 'en';

  //Search
  searchCtrl: FormControl = new FormControl();
  searchValue = '';

  //Labels
  availableLabels: string[] = [];
  selectedLabels: string[] = [];
  labelCtrl: FormControl = new FormControl();
  filteredLabels: Observable<string[]>;

  selectedTranslation?: Translation;
  selectedTranslationLocaleValue?: string;
  translateValue?: string;

  selectedSearchLocale = '';
  selectedSourceLocale = '';
  selectedTargetLocale = '';

  translations: Translation[] = [];
  locales: Locale[] = [];

  //Loadings
  isLoading = true;
  isPublishLoading = false;
  isLocaleUpdateLoading = false;
  isTranslateLoading = false;

  private destroyRef = inject(DestroyRef);

  constructor(
    private readonly translationService: TranslationService,
    readonly localeService: LocaleService,
    private readonly spaceService: SpaceService,
    private readonly taskService: TaskService,
    private readonly notificationService: NotificationService,
    private readonly route: ActivatedRoute,
    private readonly fb: FormBuilder,
    private readonly dialog: MatDialog,
    private readonly store: Store<AppState>,
    private readonly cd: ChangeDetectorRef,
    private readonly translateService: TranslateService
  ) {
    this.filteredLabels = this.labelCtrl.valueChanges.pipe(
      startWith(null),
      map((label: string | null) => (label ? this._filter(label) : this.availableLabels.slice()))
    );
  }

  ngOnInit(): void {
    this.loadData();
    this.searchCtrl.valueChanges.pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: value => {
        this.searchValue = value;
        this.cd.markForCheck();
      },
    });
  }

  loadData(): void {
    this.store
      .select(selectSpace)
      .pipe(
        filter(it => it.id !== ''), // Skip initial data
        switchMap(it => combineLatest([this.spaceService.findById(it.id), this.translationService.findAll(it.id)])),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: ([space, translations]) => {
          this.selectedSpace = space;
          this.locales = space.locales;
          this.translations = translations;
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
          if (this.selectedSearchLocale === '') {
            this.selectedSearchLocale = space.localeFallback.id;
          }
          if (this.selectedSourceLocale === '') {
            this.selectedSourceLocale = space.localeFallback.id;
          }
          if (this.selectedTargetLocale === '') {
            this.selectedTargetLocale = space.localeFallback.id;
          }
          this.groupAvailableLabels(translations);
          this.isLoading = false;
          this.cd.markForCheck();
        },
      });
  }

  publish(): void {
    this.isPublishLoading = true;
    this.translationService.publish(this.selectedSpace!.id).subscribe({
      next: () => {
        this.notificationService.success('Translations has been published.');
      },
      error: () => {
        this.notificationService.error('Translations can not be published.');
      },
      complete: () => {
        setTimeout(() => {
          this.isPublishLoading = false;
          this.cd.markForCheck();
        }, 1000);
      },
    });
  }

  openAddDialog(): void {
    this.dialog
      .open<TranslationAddDialogComponent, void, TranslationAddDialogModel>(TranslationAddDialogComponent, {
        width: '500px',
      })
      .afterClosed()
      .pipe(
        filter(it => it !== undefined),
        switchMap(it => {
          const tc: TranslationCreate = {
            name: it!.name,
            type: it!.type,
            locale: this.selectedSpace!.localeFallback.id,
            value: it!.value,
            labels: it?.labels,
            description: it?.description,
            autoTranslate: it?.autoTranslate,
          };
          return this.translationService.create(this.selectedSpace!.id, tc);
        })
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

  openEditDialog(translation: Translation): void {
    this.dialog
      .open<TranslationEditDialogComponent, Translation, TranslationEditDialogModel>(TranslationEditDialogComponent, {
        width: '500px',
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
          return this.translationService.update(this.selectedSpace!.id, translation.id, tu);
        })
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
          content: `Are you sure about deleting Translation with name '${element.name}'.`,
        },
      })
      .afterClosed()
      .pipe(
        filter(it => it),
        switchMap(() => this.translationService.delete(this.selectedSpace!.id, element.id))
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

  openImportDialog(): void {
    this.dialog
      .open<ImportDialogComponent, ImportDialogModel, ImportDialogReturn>(ImportDialogComponent, {
        width: '500px',
        data: {
          locales: this.locales,
        },
      })
      .afterClosed()
      .pipe(
        filter(it => it !== undefined),
        switchMap(it => {
          if (it?.kind === 'FLAT') {
            return this.taskService.createTranslationImportTask(this.selectedSpace!.id, it.file, it.locale);
          } else if (it?.kind === 'FULL') {
            return this.taskService.createTranslationImportTask(this.selectedSpace!.id, it.file);
          }
          return EMPTY;
        })
      )
      .subscribe({
        next: () => {
          this.notificationService.success('Translation Import Task has been created.', [{ label: 'To Tasks', link: '/features/tasks' }]);
        },
        error: () => {
          this.notificationService.error('Translation Import Task can not be created.');
        },
      });
  }

  openExportDialog(): void {
    this.dialog
      .open<ExportDialogComponent, ExportDialogModel, ExportDialogReturn>(ExportDialogComponent, {
        width: '500px',
        data: {
          locales: this.locales,
        },
      })
      .afterClosed()
      .pipe(
        filter(it => it !== undefined),
        switchMap(it => {
          console.log(it);
          if (it?.kind === 'FLAT') {
            return this.taskService.createTranslationExportTask(this.selectedSpace!.id, it.fromDate, it.locale);
          } else if (it?.kind === 'FULL') {
            return this.taskService.createTranslationExportTask(this.selectedSpace!.id, it.fromDate);
          }
          return EMPTY;
        })
      )
      .subscribe({
        next: () => {
          this.notificationService.success('Translation Export Task has been created.', [{ label: 'To Tasks', link: '/features/tasks' }]);
        },
        error: (err: unknown) => {
          console.error(err);
          this.notificationService.error('Translation Export Task can not be created.');
        },
      });
  }

  selectTranslation(translation: Translation): void {
    this.selectedTranslation = translation;
    this.translateValue = undefined;
  }

  updateLocale(transaction: Translation, locale: string, value: string): void {
    this.isLocaleUpdateLoading = true;
    this.translationService.updateLocale(this.selectedSpace!.id, transaction.id, locale, value).subscribe({
      next: () => {
        this.notificationService.success('Translation has been updated.');
      },
      error: () => {
        this.notificationService.error('Translation can not be updated.');
      },
      complete: () => {
        setTimeout(() => {
          this.isLocaleUpdateLoading = false;
          this.cd.markForCheck();
        }, 1000);
      },
    });
  }

  // Labels
  selectLabel(event: MatAutocompleteSelectedEvent): void {
    this.selectedLabels = [...this.selectedLabels, event.option.viewValue];
    this.labelsInput.nativeElement.value = '';
    this.selectedTranslation = undefined;
    this.labelCtrl.setValue(null);
  }

  removeLabel(label: string): void {
    const tmpArray: string[] = [...this.selectedLabels];
    const index: number = tmpArray.indexOf(label);
    if (index >= 0) {
      tmpArray.splice(index, 1);
    }
    // for translationFilter pipe do change instance.
    this.selectedLabels = [...tmpArray];
    this.selectedTranslation = undefined;
  }

  private _filter(value: string): string[] {
    if (!value) {
      return this.availableLabels;
    }
    const filterValue: string = value.toLowerCase();
    return this.availableLabels.filter(label => label.toLowerCase().indexOf(filterValue) === 0);
  }

  groupAvailableLabels(input: Translation[]): void {
    input
      .map(it => it.labels)
      .flat()
      .forEach(it => {
        if (it && !this.availableLabels.find(el => el === it)) {
          this.availableLabels.push(it);
        }
      });
  }

  openPublishedInNewTab(locale: string): void {
    const url = `${location.origin}/api/v1/spaces/${this.selectedSpace?.id}/translations/${locale}`;
    window.open(url, '_blank');
  }

  translate(): void {
    this.isTranslateLoading = true;
    this.translateService
      .translate({
        content: this.selectedTranslation?.locales[this.selectedSourceLocale] || '',
        sourceLocale: this.selectedSourceLocale,
        targetLocale: this.selectedTargetLocale,
      })
      .subscribe({
        next: value => {
          // make sure the component is updated
          this.translateValue = '';
          this.cd.detectChanges();
          this.notificationService.success('Translated');
          this.translateValue = value;
          this.cd.markForCheck();
        },
        error: (err: unknown) => {
          console.error(err);
          this.notificationService.error('Can not be translation.', [
            {
              label: 'Documentation',
              link: 'https://github.com/Lessify/localess/wiki/Setup#cloud-translation-api-not-enabled',
            },
          ]);
        },
        complete: () => {
          setTimeout(() => {
            this.isTranslateLoading = false;
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

    return TranslationStatus.PARTIALLY_TRANSLATED;
  }

  identifyStatusColor(translate: Translation): string {
    switch (this.identifyStatus(translate)) {
      case TranslationStatus.TRANSLATED:
        return 'translated';
      case TranslationStatus.PARTIALLY_TRANSLATED:
        return 'partially-translated';
      case TranslationStatus.UNTRANSLATED:
        return 'untranslated';
    }
  }
}
