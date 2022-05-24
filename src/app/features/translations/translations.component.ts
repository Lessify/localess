import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnInit,
  ViewChild
} from '@angular/core';
import {combineLatest, Observable, startWith} from 'rxjs';
import {ActivatedRoute} from '@angular/router';
import {filter, map, switchMap} from 'rxjs/operators';
import {MatDialog} from '@angular/material/dialog';
import {FormBuilder, FormControl} from '@angular/forms';
import {MatAutocomplete, MatAutocompleteSelectedEvent} from '@angular/material/autocomplete';
import {Store} from '@ngrx/store';
import {TranslationService} from '../../shared/services/translation.service';
import {SpaceService} from '../../shared/services/space.service';
import {NotificationService} from '../../core/notifications/notification.service';
import {AppState} from '../../core/state/core.state';
import {Locale} from '../../shared/models/locale.model';
import {
  Translation,
  TranslationCreate,
  TranslationUpdate
} from '../../shared/models/translation.model';
import {selectSpace} from '../../core/state/space/space.selector';
import {Space} from '../../shared/models/space.model';
import {CopierService} from '../../shared/services/copier.service';
import {
  TranslationAddDialogComponent
} from './translation-add-dialog/translation-add-dialog.component';
import {TranslationAddDialogModel} from './translation-add-dialog/translation-add-dialog.model';
import {TranslationEditDialogModel} from './translation-edit-dialog/translation-edit-dialog.model';
import {
  TranslationEditDialogComponent
} from './translation-edit-dialog/translation-edit-dialog.component';
import {ObjectUtils} from '../../core/utils/object-utils.service';
import {
  ConfirmationDialogComponent
} from '../../shared/components/confirmation-dialog/confirmation-dialog.component';
import {
  ConfirmationDialogModel
} from '../../shared/components/confirmation-dialog/confirmation-dialog.model';

@Component({
  selector: 'll-translations',
  templateUrl: './translations.component.html',
  styleUrls: ['./translations.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TranslationsComponent implements OnInit {

  @ViewChild('labelsInput') labelsInput!: ElementRef<HTMLInputElement>;
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;
  @ViewChild('auto') matAutocomplete!: MatAutocomplete;

  selectedSpace?: Space;

  DEFAULT_LOCALE: string = 'en';

  //Labels
  availableLabels: string[] = [];
  selectedLabels: string[] = [];
  labelCtrl: FormControl = new FormControl();
  filteredLabels: Observable<string[]>;

  selectedTranslation?: Translation;
  selectedTranslationLocaleValue: string = '';

  selectedSearchLocale: string = '';
  selectedSourceLocale: string = '';
  selectedTargetLocale: string = '';

  translations: Translation[] = [];
  locales: Locale[] = [];

  isLoading: boolean = false;
  isPublishLoading: boolean = false;

  constructor(
    private readonly translationService: TranslationService,
    private readonly spaceService: SpaceService,
    private readonly notificationService: NotificationService,
    private readonly route: ActivatedRoute,
    private readonly fb: FormBuilder,
    private readonly dialog: MatDialog,
    private readonly store: Store<AppState>,
    private readonly cd: ChangeDetectorRef,
    private readonly copierService: CopierService
  ) {
    this.filteredLabels = this.labelCtrl.valueChanges.pipe(
      startWith(null),
      map((label: string | null) =>
        label ? this._filter(label) : this.availableLabels.slice()
      )
    );
  }

  ngOnInit(): void {
    this.loadData()
  }

  loadData(): void {
    this.store.select(selectSpace)
    .pipe(
      filter(it => it.id !== ''), // Skip initial data
      switchMap(it =>
        combineLatest([
          this.spaceService.findById(it.id),
          this.translationService.findAll(it.id)
        ])
      )
    )
    .subscribe({
      next: ([space, translations]) => {
        this.selectedSpace = space
        this.locales = space.locales
        this.translations = translations;
        if (translations.length > 0) {
          if (this.selectedTranslation) {
            const tr = translations.find(it => it.id === this.selectedTranslation?.id)
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
        this.groupAvailableLabels(translations)
        this.isLoading = false;
        this.cd.markForCheck();
      }
    })
  }

  publish(): void {
    this.isPublishLoading = true
    this.translationService.publish(this.selectedSpace!.id)
    .subscribe({
      next: () => {
        this.notificationService.success('Translations has been published.');
      },
      error: (err) => {
        console.error(err)
        this.notificationService.error('Translations can not be published.');
      },
      complete: () => {
        setTimeout(() => {
          this.isPublishLoading = false
          this.cd.markForCheck()
        }, 1000)

      }
    })
  }

  openAddDialog(): void {
    this.dialog
    .open<TranslationAddDialogComponent, any, TranslationAddDialogModel>(
      TranslationAddDialogComponent,
      {
        width: '500px'
      }
    )
    .afterClosed()
    .pipe(
      filter(it => it !== undefined),
      switchMap(it => {
          const tc: TranslationCreate = {
            type: it!.type,
            locale: this.selectedSpace!.localeFallback.id,
            value: it!.value,
            labels: it!.labels,
            description: it!.description,
          }
          return this.translationService.add(this.selectedSpace!.id, it!.id, tc)
        }
      )
    )
    .subscribe(
      {
        next: () => {
          this.notificationService.success('Translation has been added.');
        },
        error: (err) => {
          console.error(err)
          this.notificationService.error('Translation can not be added.');
        }
      }
    );
  }

  openEditDialog(translation: Translation): void {
    this.dialog
    .open<TranslationEditDialogComponent, Translation, TranslationEditDialogModel>(
      TranslationEditDialogComponent,
      {
        width: '500px',
        data: ObjectUtils.clone(translation)
      }
    )
    .afterClosed()
    .pipe(
      filter(it => it !== undefined),
      switchMap(it => {
        const tu: TranslationUpdate = {
          labels: it!.labels,
          description: it!.description
        }
        return this.translationService.update(this.selectedSpace!.id, translation.id, tu)
      })
    )
    .subscribe({
        next: () => {
          this.notificationService.success('Translation has been updated.');
        },
        error: (err) => {
          console.error(err)
          this.notificationService.error('Translation can not be updated.');
        }
      }
    );
  }

  deleteTranslation(element: Translation): void {
    this.dialog
    .open<ConfirmationDialogComponent, ConfirmationDialogModel>(
      ConfirmationDialogComponent,
      {
        data: {
          title: 'Delete Translation',
          content: `Are you sure about deleting Translation with id '${element.id}'.`
        }
      }
    )
    .afterClosed()
    .pipe(
      filter(it => it),
      switchMap(() =>
        this.translationService.delete(this.selectedSpace!.id, element.id)
      )
    )
    .subscribe({
        next: () => {
          this.notificationService.success('Translation has been deleted.');
        },
        error: () => this.notificationService.error('Translation can not be deleted.')
      }
    );
  }


  selectTranslation(translation: Translation): void {
    this.selectedTranslation = translation;
  }

  updateLocale(transaction: Translation, locale: string, value: string): void {
    this.translationService.updateLocale(this.selectedSpace!.id, transaction.id, locale, value)
    .subscribe({
        next: () => {
          this.notificationService.success('Translation has been updated.');
        },
        error: () => this.notificationService.error('Translation can not be updated.')
      }
    );
  }

  copy(value: string): void {
    this.copierService.copyText(value);
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
    return this.availableLabels.filter(
      label => label.toLowerCase().indexOf(filterValue) === 0
    );
  }

  groupAvailableLabels(input: Translation[]): void {
    input
    .map(it => it.labels)
    .flat()
    .forEach(it => {
      if (!this.availableLabels.find(el => el === it)) {
        this.availableLabels.push(it);
      }
    });

    /*console.log(new Set<string>(labels))

    Array.from(
      input
      .reduce(
        (entryMap, translation) =>
          entryMap.set(translation.labels, {
            ...(entryMap.get(translation.id) || {}),
            ...translation
          }),
        new Map()
      )
      .keys()
    )
    .filter(k => k.length)
    .forEach((key: string[]) => {
      key.forEach(it => {
        if (!this.availableLabels.find(el => el === it)) {
          this.availableLabels.push(it);
        }
      });
    });*/
  }

}
