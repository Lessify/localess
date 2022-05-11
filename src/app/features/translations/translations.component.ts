import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnInit,
  ViewChild
} from '@angular/core';
import {combineLatest} from 'rxjs';
import {ActivatedRoute} from '@angular/router';
import {filter, switchMap} from 'rxjs/operators';
import {MatDialog} from '@angular/material/dialog';
import {FormBuilder, FormControl} from '@angular/forms';
import {MatAutocomplete} from '@angular/material/autocomplete';
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

  labelCtrl: FormControl = new FormControl();
  selectedTranslation?: Translation;
  selectedTranslationLocaleValue?: string;

  selectedSearchLocale: string = this.DEFAULT_LOCALE;
  selectedSourceLocale: string = this.DEFAULT_LOCALE;
  selectedTargetLocale: string = this.DEFAULT_LOCALE;

  translations: Translation[] = [];
  locales: Locale[] = [];

  isLoading: boolean = false;

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
          this.selectTranslation(translations[0]);
        }
        this.selectedSearchLocale = space.localeFallback.id;
        this.selectedSourceLocale = space.localeFallback.id;
        this.selectedTargetLocale = space.localeFallback.id;
        this.isLoading = false;
        this.cd.markForCheck();
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
          const defaultLocale = this.selectedSpace!.localeFallback.id
          const tc: TranslationCreate = {
            type: it!.type,
            labels: it!.labels,
            description: it!.description,
            locales: {}
          }
          tc.locales[defaultLocale] = it!.value
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
        return this.translationService.update(this.selectedTranslation!.id, translation.id, tu)
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

  //value -> selectedTranslationLocaleValue
  save(transaction: Translation, locale: string): void {
    // this.translationService
    // .updateSpaceTranslationLocale({
    //   spaceId: this.spaceId,
    //   environment: this.environment,
    //   id: transaction.id,
    //   locale,
    //   body: {
    //     value
    //   }
    // })
    // .subscribe(
    //   () => {
    //     const change: Translation = this.translations.find(
    //       it => it.id === transaction.id
    //     );
    //     change.locales[locale] = value;
    //     this.cd.detectChanges();
    //     this.notificationService.success('Translation has been updated.');
    //   },
    //   () => this.notificationService.error('Translation can not be updated.')
    // );
  }

  copy(value: string): void {
    this.copierService.copyText(value);
  }

}
