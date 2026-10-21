import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  output,
  signal,
} from '@angular/core';
import { LocaleService } from '@core/services/locale.service';
import { NotificationService } from '@core/services/notification.service';
import { PlatformService } from '@core/services/platform.service';
import { TranslateService } from '@core/services/translate.service';
import { TranslationService } from '@core/services/translation.service';
import { ObjectUtils } from '@core/utils/object-utils.service';
import { translateErrorMessage } from '@core/utils/translate-error';
import { DEFAULT_LOCALE, Locale, Translation, TranslationUpdate } from '@localess/shared';
import { provideIcons } from '@ng-icons/core';
import { lucideArrowRight, lucideInfo, lucideLanguages, lucideSave } from '@ng-icons/lucide';
import {
  CONFIRMATION_DIALOG_CONTENT_CLASS,
  ConfirmationDialogComponent,
  ConfirmationDialogContext,
  ConfirmationDialogResult,
} from '@shared/components/confirmation-dialog';
import { DIALOG_WIDTH_SM } from '@shared/components/dialog/dialog-width';
import { LocaleIconComponent } from '@shared/components/locale-icon';
import { HasRolePipe } from '@shared/pipes/has-role.pipe';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmKbdImports } from '@spartan-ng/helm/kbd';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmSeparatorImports } from '@spartan-ng/helm/separator';
import { HlmSheetImports } from '@spartan-ng/helm/sheet';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { Observable } from 'rxjs';
import { filter, switchMap, take } from 'rxjs/operators';

import { EditDialogComponent, EditDialogContext, EditDialogResult } from '../../../edit-dialog';
import { EditIdDialogComponent, EditIdDialogContext, EditIdDialogResult } from '../../../edit-id-dialog';
import { identifyTranslationStatus } from '../../models/translation.model';
import { TranslationStatus } from '../../models/translation-status.model';
import { TranslationInfoComponent } from '../translation-info/translation-info.component';
import { TranslationStringEditComponent } from '../translation-string-edit/translation-string-edit.component';
import { TranslationStringViewComponent } from '../translation-string-view/translation-string-view.component';

@Component({
  selector: 'll-translation-detail',
  templateUrl: './translation-detail.component.html',
  styleUrls: ['./translation-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:keydown)': 'captureKeyboard($event)',
  },
  imports: [
    CommonModule,
    HasRolePipe,
    TranslationStringViewComponent,
    TranslationInfoComponent,
    TranslationStringEditComponent,
    HlmButtonImports,
    HlmIconImports,
    HlmTooltipImports,
    HlmSpinnerImports,
    HlmSelectImports,
    HlmSheetImports,
    HlmFieldImports,
    HlmSeparatorImports,
    HlmKbdImports,
    LocaleIconComponent,
  ],
  providers: [
    provideIcons({
      lucideArrowRight,
      lucideInfo,
      lucideLanguages,
      lucideSave,
    }),
  ],
})
export class TranslationDetailComponent {
  readonly platformService = inject(PlatformService);
  private readonly localeService = inject(LocaleService);
  private readonly notificationService = inject(NotificationService);
  private readonly dialog = inject(HlmDialogService);
  /** Whether the details sheet is open (narrow pages, where the info panel is hidden). */
  readonly detailsOpen = signal(false);
  /** The action waiting for the details sheet to close. */
  private afterDetailsClosed?: () => void;
  private readonly cd = inject(ChangeDetectorRef);
  private readonly translateService = inject(TranslateService);
  private readonly translationService = inject(TranslationService);

  // Inputs
  readonly translation = input.required<Translation>();
  readonly spaceId = input.required<string>();
  readonly availableLocales = input.required<Locale[]>();
  readonly defaultLocale = input<Locale | undefined>(undefined);
  /** Keys already taken, for the rename dialog. */
  /** Whether the space has a key (the rename dialog's check). */
  readonly isKeyTaken = input.required<(key: string) => Observable<boolean>>();
  readonly selectedLabels = input<string[]>([]);
  readonly isLocaleUpdateLoading = input(false);

  // Outputs
  readonly save = output<{ translation: Translation; locale: Locale; value: string }>();

  // Live data arrives as new objects on every refresh (a change to any space or any translation), so the selection and
  // the value being typed follow their inputs by value, not by identity. By identity, a refresh reset the target to
  // the default locale mid-edit, and the text typed for German was saved over English.
  private readonly initialLocale = computed(() => this.defaultLocale() ?? DEFAULT_LOCALE, {
    equal: (a, b) => a.id === b.id,
  });
  private readonly storedValue = computed(
    () => {
      const translation = this.translation();
      const locale = this.selectedTargetLocale().id;
      return { id: translation?.id, locale, value: translation?.locales[locale] || '' };
    },
    { equal: (a, b) => a.id === b.id && a.locale === b.locale && a.value === b.value },
  );

  selectedSourceLocale = linkedSignal(() => this.initialLocale());
  selectedTargetLocale = linkedSignal(() => this.initialLocale());
  selectedTranslationLocaleValue = linkedSignal(() => this.storedValue().value);

  isTranslateLoading = signal(false);

  localeToString = (locale: Locale): string => locale?.name ?? '';

  compareLocale = (a: Locale, b: Locale | null | undefined): boolean => {
    return a.id === b?.id;
  };

  identifyTranslationStatus(translate: Translation): TranslationStatus {
    return identifyTranslationStatus(translate, this.availableLocales());
  }

  translate(): void {
    this.isTranslateLoading.set(true);
    this.translateService
      .translate({
        content: this.translation()?.locales[this.selectedSourceLocale().id] || '',
        sourceLocale: this.selectedSourceLocale().id,
        targetLocale: this.selectedTargetLocale().id,
      })
      .subscribe({
        next: value => {
          // make sure the component is updated
          this.selectedTranslationLocaleValue.set(value);
          this.notificationService.success('Translated');
        },
        error: (err: unknown) => {
          console.error(err);
          this.notificationService.error(translateErrorMessage(err, 'Could not be translated.'));
        },
        complete: () => {
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
    return this.canTranslateFrom(sourceLocale) && this.canTranslateTo(targetLocale);
  }

  /**
   * Whether the provider accepts this locale at each end.
   *
   * Only the translate button is gated by this. The two selects choose which locale is displayed
   * and hand-edited as well as which one would be translated, so every locale of the space stays
   * selectable there - a locale the provider does not know is still one an author writes by hand.
   */
  canTranslateFrom(locale: Locale): boolean {
    return this.localeService.isLocaleTranslatableFrom(locale.id);
  }

  canTranslateTo(locale: Locale): boolean {
    return this.localeService.isLocaleTranslatableTo(locale.id);
  }

  /** Says why the translate button is off, rather than leaving a dead button unexplained. */
  translateTooltip(): string {
    const source = this.selectedSourceLocale();
    const target = this.selectedTargetLocale();
    if (source.id === target.id) {
      return `Pick a target other than ${target.name}`;
    }
    if (!this.canTranslateFrom(source)) {
      return `${source.name} is not supported as a translation source`;
    }
    if (!this.canTranslateTo(target)) {
      return `${target.name} is not supported as a translation target`;
    }
    return 'Translate';
  }

  /** The details (key, status, labels, dates and their actions) in a sheet from the right: the panel is hidden on a
   * narrow page. */
  openDetails(): void {
    this.detailsOpen.set(true);
  }

  /**
   * An action of the details sheet opens its own dialog: only once the sheet has closed (the sheet is a dialog too, and
   * two open at once collide). From the panel, at once.
   */
  fromDetails(action: 'editKey' | 'edit' | 'remove', translation: Translation): void {
    const run = () => {
      if (action === 'editKey') this.openEditIdDialog(translation);
      else if (action === 'edit') this.openEditDialog(translation);
      else this.openDeleteDialog(translation);
    };
    if (!this.detailsOpen()) {
      run();
      return;
    }
    this.afterDetailsClosed = run;
    this.detailsOpen.set(false);
  }

  onDetailsClosed(): void {
    this.detailsOpen.set(false);
    const action = this.afterDetailsClosed;
    this.afterDetailsClosed = undefined;
    action?.();
  }

  openEditIdDialog(translation: Translation): void {
    this.dialog
      .open<EditIdDialogResult, EditIdDialogContext>(EditIdDialogComponent, {
        context: {
          key: translation.key,
          isKeyTaken: this.isKeyTaken(),
        },
        contentClass: DIALOG_WIDTH_SM,
      })
      .closed$.pipe(
        take(1),
        filter(it => it !== undefined),
        switchMap(it => {
          return this.translationService.rename(this.spaceId(), translation, it!);
        }),
      )
      .subscribe({
        next: () => {
          this.notificationService.success('Translation key has been updated.');
        },
        error: err => {
          console.error(err);
          this.notificationService.error('Translation ID can not be updated.');
        },
      });
  }

  openEditDialog(translation: Translation): void {
    this.dialog
      .open<EditDialogResult, EditDialogContext>(EditDialogComponent, {
        context: ObjectUtils.clone(translation),
        contentClass: DIALOG_WIDTH_SM,
      })
      .closed$.pipe(
        take(1),
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
      .open<ConfirmationDialogResult, ConfirmationDialogContext>(ConfirmationDialogComponent, {
        context: {
          title: 'Delete Translation',
          content: `Are you sure about deleting Translation with Key '${element.key}'.`,
          variant: 'destructive',
        },
        contentClass: CONFIRMATION_DIALOG_CONTENT_CLASS,
      })
      .closed$.pipe(
        take(1),
        filter(it => it || false),
        switchMap(() => this.translationService.remove(this.spaceId(), element.id)),
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

  captureKeyboard(event: KeyboardEvent): void {
    // Ctrl + S to Save
    if (this.platformService.isActionSave(event)) {
      event.preventDefault();
      const translation = this.translation();
      const selectedTargetLocale = this.selectedTargetLocale();
      const selectedTranslationLocaleValue = this.selectedTranslationLocaleValue();
      if (translation) {
        this.save.emit({ translation, locale: selectedTargetLocale, value: selectedTranslationLocaleValue! });
      }
    }
  }
}
