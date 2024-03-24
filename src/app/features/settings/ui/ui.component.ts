import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject, signal } from '@angular/core';
import { filter } from 'rxjs/operators';
import { SpaceService } from '@shared/services/space.service';
import { NotificationService } from '@shared/services/notification.service';
import { FormBuilder, FormGroup } from '@angular/forms';
import { SpaceValidator } from '@shared/validators/space.validator';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { ThemePalette } from '@angular/material/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { SpaceStore } from '@shared/store/space.store';

@Component({
  selector: 'll-space-settings-ui',
  templateUrl: './ui.component.html',
  styleUrls: ['./ui.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiComponent {
  private destroyRef = inject(DestroyRef);

  isLoading = signal(true);
  spaceStore = inject(SpaceStore);

  // Form
  form: FormGroup = this.fb.group({
    color: this.fb.control<ThemePalette>(undefined, SpaceValidator.UI_COLOR),
  });

  constructor(
    private readonly fb: FormBuilder,
    readonly fe: FormErrorHandlerService,
    private readonly spaceService: SpaceService,
    private readonly cd: ChangeDetectorRef,
    private readonly notificationService: NotificationService
  ) {
    toObservable(this.spaceStore.selectedSpace)
      .pipe(
        filter(it => it !== undefined),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: space => {
          if (space?.ui) {
            this.form.patchValue(space.ui);
          }
          this.isLoading.set(false);
          this.cd.markForCheck();
        },
      });
  }

  save(): void {
    this.spaceService.updateUi(this.spaceStore.selectedSpaceId()!, this.form.value).subscribe({
      next: () => {
        this.notificationService.success('Space UI has been updated.');
      },
      error: (err: unknown) => {
        console.error(err);
        this.notificationService.error('Space UI can not be updated.');
      },
    });
  }
}
