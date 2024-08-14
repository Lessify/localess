import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject, signal } from '@angular/core';
import { NotificationService } from '@shared/services/notification.service';
import { FormBuilder, FormGroup } from '@angular/forms';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AppUiColor } from '@shared/models/settings.model';
import { SettingsValidator } from '@shared/validators/settings.validator';
import { SettingsService } from '@shared/services/settings.service';

@Component({
  selector: 'll-admin-settings-ui',
  templateUrl: './ui.component.html',
  styleUrls: ['./ui.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiComponent {
  private destroyRef = inject(DestroyRef);

  isLoading = signal(true);

  // Form
  form: FormGroup = this.fb.group({
    text: this.fb.control<string | undefined>(undefined, SettingsValidator.UI_TEXT),
    color: this.fb.control<AppUiColor | undefined>(undefined, SettingsValidator.UI_COLOR),
  });

  constructor(
    private readonly fb: FormBuilder,
    readonly fe: FormErrorHandlerService,
    private readonly settingService: SettingsService,
    private readonly cd: ChangeDetectorRef,
    private readonly notificationService: NotificationService,
  ) {
    this.settingService
      .find()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: settings => {
          console.log(settings);
          if (settings?.ui) {
            this.form.patchValue(settings.ui);
          }
          this.isLoading.set(false);
          this.cd.markForCheck();
        },
      });
  }

  save(): void {
    this.settingService.updateUi(this.form.value).subscribe({
      next: () => {
        this.notificationService.success('Settings UI has been updated.');
      },
      error: (err: unknown) => {
        console.error(err);
        this.notificationService.error('Settings UI can not be updated.');
      },
    });
  }
}
