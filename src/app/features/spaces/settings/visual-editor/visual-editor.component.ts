import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { SpaceEnvironment } from '@shared/models/space.model';
import { NotificationService } from '@shared/services/notification.service';
import { SpaceService } from '@shared/services/space.service';
import { LocalSettingsStore } from '@shared/stores/local-settings.store';
import { SpaceStore } from '@shared/stores/space.store';
import { SpaceValidator } from '@shared/validators/space.validator';
import { HlmProgressImports } from '@spartan-ng/helm/progress';
import { filter } from 'rxjs/operators';
import { provideIcons } from '@ng-icons/core';
import { lucideGripVertical, lucidePlus, lucideSave, lucideTrash } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmItemImports } from '@spartan-ng/helm/item';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInputImports } from '@spartan-ng/helm/input';

@Component({
  selector: 'll-space-settings-visual-editor',
  templateUrl: './visual-editor.component.html',
  styleUrls: ['./visual-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    DragDropModule,
    CommonModule,
    HlmProgressImports,
    HlmButtonImports,
    HlmIconImports,
    HlmItemImports,
    HlmTooltipImports,
    HlmFieldImports,
    HlmInputImports,
  ],
  providers: [
    provideIcons({
      lucideSave,
      lucidePlus,
      lucideTrash,
      lucideGripVertical,
    }),
  ],
})
export class VisualEditorComponent {
  private readonly fb = inject(FormBuilder);
  readonly fe = inject(FormErrorHandlerService);
  private readonly spaceService = inject(SpaceService);
  private readonly cd = inject(ChangeDetectorRef);
  private readonly notificationService = inject(NotificationService);

  isLoading = signal(true);
  spaceStore = inject(SpaceStore);

  // Form
  form: FormGroup = this.fb.group({
    environments: this.fb.array([]),
  });

  // Subscriptions
  settingsStore = inject(LocalSettingsStore);
  private destroyRef = inject(DestroyRef);

  constructor() {
    toObservable(this.spaceStore.selectedSpace)
      .pipe(
        filter(it => it !== undefined),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: space => {
          this.environments.clear();
          space?.environments?.forEach(env => this.addEnvironment(env));
          this.isLoading.set(false);
          this.cd.markForCheck();
        },
      });
  }

  get environments(): FormArray<FormGroup> {
    return this.form.controls['environments'] as FormArray<FormGroup>;
  }

  addEnvironment(env?: SpaceEnvironment): void {
    const environment: FormGroup = this.fb.group({
      name: this.fb.control<string>(env?.name || '', SpaceValidator.ENVIRONMENT_NAME),
      url: this.fb.control<string>(env?.url || '', SpaceValidator.ENVIRONMENT_URL),
    });
    this.environments.push(environment);
  }

  removeEnvironment(i: number): void {
    this.environments.removeAt(i);
  }

  save(): void {
    this.spaceService.updateEnvironments(this.spaceStore.selectedSpaceId()!, this.form.value.environments).subscribe({
      next: () => {
        this.notificationService.success('Space has been updated.');
      },
      error: (err: unknown) => {
        console.error(err);
        this.notificationService.error('Space can not be updated.');
      },
    });
  }

  environmentDropDrop(event: CdkDragDrop<string[]>): void {
    if (event.previousIndex === event.currentIndex) return;
    const tmp = this.environments.at(event.previousIndex);
    this.environments.removeAt(event.previousIndex);
    this.environments.insert(event.currentIndex, tmp);
  }
}
