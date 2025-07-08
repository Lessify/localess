import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatToolbarModule } from '@angular/material/toolbar';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { AppUiColor } from '@shared/models/settings.model';
import { NotificationService } from '@shared/services/notification.service';
import { SettingsService } from '@shared/services/settings.service';
import { SettingsValidator } from '@shared/validators/settings.validator';

@Component({
  selector: 'll-admin-settings-ui',
  templateUrl: './ui.component.html',
  styleUrls: ['./ui.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatProgressBarModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
  ],
})
export class UiComponent {
  private readonly fb = inject(FormBuilder);
  readonly fe = inject(FormErrorHandlerService);
  private readonly settingService = inject(SettingsService);
  private readonly cd = inject(ChangeDetectorRef);
  private readonly notificationService = inject(NotificationService);

  private destroyRef = inject(DestroyRef);

  isLoading = signal(true);

  // Form
  form: FormGroup = this.fb.group({
    text: this.fb.control<string | undefined>(undefined, SettingsValidator.UI_TEXT),
    color: this.fb.control<AppUiColor | undefined>(undefined, SettingsValidator.UI_COLOR),
  });

  constructor() {
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
