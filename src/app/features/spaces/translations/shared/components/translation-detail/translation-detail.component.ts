import { ClipboardModule } from '@angular/cdk/clipboard';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, input, linkedSignal, output, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ObjectUtils } from '@core/utils/object-utils.service';
import { provideIcons } from '@ng-icons/core';
import { lucideArrowRight, lucideCopy, lucideLanguages, lucidePencil, lucideReplace, lucideSave, lucideTrash } from '@ng-icons/lucide';
import { ConfirmationDialogComponent } from '@shared/components/confirmation-dialog/confirmation-dialog.component';
import { ConfirmationDialogModel } from '@shared/components/confirmation-dialog/confirmation-dialog.model';
import { Locale, TRANSLATION_DEFAULT_LOCALE } from '@shared/models/locale.model';
import { Translation, TranslationStatus, TranslationUpdate } from '@shared/models/translation.model';
import { CanUserPerformPipe } from '@shared/pipes/can-user-perform.pipe';
import { LocaleService } from '@shared/services/locale.service';
import { NotificationService } from '@shared/services/notification.service';
import { PlatformService } from '@shared/services/platform.service';
import { TranslateService } from '@shared/services/translate.service';
import { TranslationService } from '@shared/services/translation.service';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmKbdImports } from '@spartan-ng/helm/kbd';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmSeparatorImports } from '@spartan-ng/helm/separator';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { filter, switchMap } from 'rxjs/operators';

import { EditDialogComponent, EditDialogModel } from '../../../edit-dialog';
import { EditIdDialogComponent, EditIdDialogModel } from '../../../edit-id-dialog';
import { identifyTranslationStatus } from '../../models/translation.model';
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
    ClipboardModule,
    CanUserPerformPipe,
    TranslationStringViewComponent,
    TranslationStringEditComponent,
    HlmButtonImports,
    HlmIconImports,
    HlmTooltipImports,
    HlmSpinnerImports,
    HlmSelectImports,
    HlmFieldImports,
    HlmBadgeImports,
    HlmSeparatorImports,
    HlmKbdImports,
  ],
  providers: [
    provideIcons({
      lucideArrowRight,
      lucideLanguages,
      lucideReplace,
      lucidePencil,
      lucideTrash,
      lucideCopy,
      lucideSave,
    }),
  ],
})
export class TranslationDetailComponent {
  readonly platformService = inject(PlatformService);
  private readonly localeService = inject(LocaleService);
  private readonly notificationService = inject(NotificationService);
  private readonly dialog = inject(MatDialog);
  private readonly cd = inject(ChangeDetectorRef);
  private readonly translateService = inject(TranslateService);
  private readonly translationService = inject(TranslationService);

  // Inputs
  readonly translation = input.required<Translation>();
  readonly spaceId = input.required<string>();
  readonly availableLocales = input.required<Locale[]>();
  readonly localeFallback = input<Locale | undefined>(undefined);
  readonly reservedIds = input<string[]>([]);
  readonly selectedLabels = input<string[]>([]);
  readonly isLocaleUpdateLoading = input(false);

  // Outputs
  readonly save = output<{ translation: Translation; locale: Locale; value: string }>();

  selectedSourceLocale = linkedSignal(() => this.localeFallback() ?? TRANSLATION_DEFAULT_LOCALE);
  selectedTargetLocale = linkedSignal(() => this.localeFallback() ?? TRANSLATION_DEFAULT_LOCALE);
  selectedTranslationLocaleValue = linkedSignal(() => {
    return this.translation()?.locales[this.selectedTargetLocale().id] || '';
  });

  isTranslateLoading = signal(false);

  localeToString = (locale: Locale): string => locale?.name ?? '';

  compareLocale = (a: Locale, b: Locale | null): boolean => {
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
          this.notificationService.error('Can not be translation.', {
            action: {
              type: 'link',
              label: 'Documentation',
              link: 'https://localess.org/docs/setup/firebase#errors-in-the-user-interface',
            },
          });
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
    return this.localeService.isLocaleTranslatableFrom(sourceLocale.id) && this.localeService.isLocaleTranslatableTo(targetLocale.id);
  }

  openEditIdDialog(translation: Translation): void {
    this.dialog
      .open<EditIdDialogComponent, EditIdDialogModel, string>(EditIdDialogComponent, {
        panelClass: 'sm',
        data: {
          id: translation.id,
          reservedIds: this.reservedIds(),
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

  copied() {
    this.notificationService.success(`Translation ID copied to clipboard.`);
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
