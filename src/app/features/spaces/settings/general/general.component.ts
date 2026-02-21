import { ClipboardModule } from '@angular/cdk/clipboard';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { NotificationService } from '@shared/services/notification.service';
import { SpaceService } from '@shared/services/space.service';
import { SpaceStore } from '@shared/stores/space.store';
import { SpaceValidator } from '@shared/validators/space.validator';
import { HlmProgressImports } from '@spartan-ng/helm/progress';
import { filter } from 'rxjs/operators';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { provideIcons } from '@ng-icons/core';
import { lucideSave } from '@ng-icons/lucide';

@Component({
  selector: 'll-space-settings-general',
  templateUrl: './general.component.html',
  styleUrls: ['./general.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    ClipboardModule,
    ReactiveFormsModule,
    MatTooltipModule,
    CommonModule,
    HlmProgressImports,
    HlmButtonImports,
    HlmIconImports,
  ],
  providers: [
    provideIcons({
      lucideSave,
    }),
  ],
})
export class GeneralComponent {
  private readonly fb = inject(FormBuilder);
  readonly fe = inject(FormErrorHandlerService);
  private readonly spaceService = inject(SpaceService);
  private readonly cd = inject(ChangeDetectorRef);
  private readonly notificationService = inject(NotificationService);

  isLoading = signal(true);
  spaceStore = inject(SpaceStore);

  // Form
  form: FormGroup = this.fb.group({
    name: this.fb.control('', SpaceValidator.NAME),
  });

  private destroyRef = inject(DestroyRef);

  constructor() {
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
