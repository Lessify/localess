import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnInit,
  ViewChild
} from '@angular/core';
import {Subject, zip} from 'rxjs';
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
import {Translation} from '../../shared/models/translation.model';
import {selectSpace} from '../../core/state/space/space.selector';
import {Space} from '../../shared/models/space.model';
import {CopierService} from '../../shared/services/copier.service';

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

  destroy$: Subject<boolean> = new Subject();
  translations: Translation[] = [];
  spaceId: string = '';
  environment: string = '';
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
        zip(
          this.spaceService.findById(it.id),
          this.translationService.findAll(it.id)
        )
      )
    )
    .subscribe({
      next: ([space, translations]) => {
        this.selectedSpace = space
        this.translations = translations;
        if (translations.length > 0) {
          this.selectTranslation(translations[0]);
        }
        this.selectedSearchLocale = space.localeFallback.id;
        this.selectedSourceLocale = space.localeFallback.id;
        this.selectedTargetLocale = space.localeFallback.id;
        this.isLoading = false;
        this.cd.detectChanges();
      }
    })
  }

   openAddDialog(): void {
  //   this.dialog
  //   .open<TranslationAddDialogComponent, any, TranslationCreate>(
  //     TranslationAddDialogComponent,
  //     {
  //       width: '500px'
  //     }
  //   )
  //   .afterClosed()
  //   .pipe(
  //     filter(it => it !== undefined),
  //     switchMap(form =>
  //       this.translationService.addSpaceTranslation({
  //         spaceId: this.spaceId,
  //         environment: this.environment,
  //         body: form
  //       })
  //     )
  //   )
  //   .subscribe(
  //     value => {
  //       this.translations.unshift(value);
  //       this.cd.detectChanges();
  //       this.store.dispatch(
  //         translationActions.increaseTranslation({
  //           increase: 1,
  //           env: this.environment
  //         })
  //       );
  //       this.notificationService.success('Translation has been added.');
  //     },
  //     _ => {
  //       this.notificationService.error('Translation can not be added.');
  //     }
  //   );
  }

  openEditDialog(translation: Translation): void {
  //   this.dialog
  //   .open<TranslationEditDialogComponent, Translation, TranslationUpdate>(
  //     TranslationEditDialogComponent,
  //     {
  //       width: '500px',
  //       data: ObjectUtils.clone(translation)
  //     }
  //   )
  //   .afterClosed()
  //   .pipe(
  //     filter(it => it !== undefined),
  //     switchMap(form =>
  //       this.translationService.updateSpaceTranslation({
  //         spaceId: this.spaceId,
  //         environment: this.environment,
  //         id: translation.id,
  //         body: form
  //       })
  //     )
  //   )
  //   .subscribe(
  //     value => {
  //       const idx: number = this.translations.findIndex(
  //         it => it.id === value.id
  //       );
  //       if (idx !== -1) {
  //         this.translations[idx] = value;
  //         this.selectTranslation(value);
  //       }
  //       this.cd.detectChanges();
  //       this.store.dispatch(
  //         translationActions.increaseTranslation({
  //           increase: 1,
  //           env: this.environment
  //         })
  //       );
  //       this.notificationService.success('Translation has been updated.');
  //     },
  //     _ => {
  //       this.notificationService.error('Translation can not be updated.');
  //     }
  //   );
  }

  deleteTranslation(element: Translation): void {
  //   this.dialog
  //   .open<ConfirmationDialogComponent, ConfirmationDialogModel>(
  //     ConfirmationDialogComponent,
  //     {
  //       data: {
  //         title: 'Delete Translation',
  //         content: `Are you sure about deleting Translation with id '${element.id}'.`
  //       }
  //     }
  //   )
  //   .afterClosed()
  //   .pipe(
  //     filter(it => it),
  //     switchMap(() =>
  //       this.translationService.deleteSpaceTranslation({
  //         spaceId: this.spaceId,
  //         id: element.id,
  //         environment: this.environment
  //       })
  //     )
  //   )
  //   .subscribe(
  //     () => {
  //       const idx: number = this.translations.findIndex(
  //         it => it.id === element.id
  //       );
  //       if (idx !== -1) {
  //         this.translations.splice(idx, 1);
  //         if (this.translations.length > 0) {
  //           this.selectedTranslation = this.translations[0];
  //         } else {
  //           this.selectedTranslation = null;
  //         }
  //       }
  //       this.cd.detectChanges();
  //       this.store.dispatch(
  //         translationActions.decreaseTranslation({
  //           decrease: 1,
  //           env: this.environment
  //         })
  //       );
  //       this.notificationService.success('Translation has been deleted.');
  //     },
  //     () => this.notificationService.error('Translation can not be deleted.')
  //   );
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
