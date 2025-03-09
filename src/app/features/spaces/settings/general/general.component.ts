import { ClipboardModule } from '@angular/cdk/clipboard';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { MaterialService } from '@shared/services/material.service';
import { NotificationService } from '@shared/services/notification.service';
import { SpaceService } from '@shared/services/space.service';
import { SpaceStore } from '@shared/stores/space.store';
import { SpaceValidator } from '@shared/validators/space.validator';
import { filter, map } from 'rxjs/operators';

@Component({
  selector: 'll-space-settings-general',
  standalone: true,
  templateUrl: './general.component.html',
  styleUrls: ['./general.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatToolbarModule,
    MatProgressBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    ClipboardModule,
    ReactiveFormsModule,
    MatTooltipModule,
    MatSelectModule,
    CommonModule,
  ],
})
export class GeneralComponent {
  isLoading = signal(true);
  spaceStore = inject(SpaceStore);

  // Form
  form: FormGroup = this.fb.group({
    name: this.fb.control('', SpaceValidator.NAME),
    icon: this.fb.control<string | undefined>(undefined),
  });

  icons$ = this.materialService.findAllIcons().pipe(
    map(it => it.icons),
    map(it => it.filter(icon => !icon.unsupported_families.includes('Material Icons'))),
  );
  private destroyRef = inject(DestroyRef);

  constructor(
    private readonly fb: FormBuilder,
    readonly fe: FormErrorHandlerService,
    private readonly spaceService: SpaceService,
    private readonly cd: ChangeDetectorRef,
    private readonly notificationService: NotificationService,
    private readonly materialService: MaterialService,
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
