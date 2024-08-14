import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject, signal } from '@angular/core';
import { filter } from 'rxjs/operators';
import { SpaceService } from '@shared/services/space.service';
import { NotificationService } from '@shared/services/notification.service';
import { FormBuilder, FormGroup } from '@angular/forms';
import { SpaceValidator } from '@shared/validators/space.validator';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { SpaceStore } from '@shared/store/space.store';

@Component({
  selector: 'll-space-settings-general',
  templateUrl: './general.component.html',
  styleUrls: ['./general.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GeneralComponent {
  isLoading = signal(true);
  spaceStore = inject(SpaceStore);

  // Form
  form: FormGroup = this.fb.group({
    name: this.fb.control('', SpaceValidator.NAME),
  });

  private destroyRef = inject(DestroyRef);

  constructor(
    private readonly fb: FormBuilder,
    readonly fe: FormErrorHandlerService,
    private readonly spaceService: SpaceService,
    private readonly cd: ChangeDetectorRef,
    private readonly notificationService: NotificationService,
  ) {
    toObservable(this.spaceStore.selectedSpace)
      .pipe(
        filter(it => it !== undefined), // Skip initial data
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: space => {
          this.form.patchValue(space!);
          this.isLoading.set(false);
          this.cd.markForCheck();
        },
      });
  }

  save(): void {
    this.spaceService.update(this.spaceStore.selectedSpaceId()!, this.form.value).subscribe({
      next: () => {
        this.notificationService.success('Space has been updated.');
      },
      error: (err: unknown) => {
        console.error(err);
        this.notificationService.error('Space can not be updated.');
      },
    });
  }
}
