import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject, signal } from '@angular/core';
import { filter } from 'rxjs/operators';
import { SpaceService } from '@shared/services/space.service';
import { SpaceEnvironment } from '@shared/models/space.model';
import { NotificationService } from '@shared/services/notification.service';
import { FormArray, FormBuilder, FormGroup } from '@angular/forms';
import { SpaceValidator } from '@shared/validators/space.validator';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { SpaceStore } from '@shared/store/space.store';
import { SettingsStore } from '@shared/store/settings.store';

@Component({
  selector: 'll-space-settings-visual-editor',
  templateUrl: './visual-editor.component.html',
  styleUrls: ['./visual-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VisualEditorComponent {
  isLoading = signal(true);
  spaceStore = inject(SpaceStore);

  // Form
  form: FormGroup = this.fb.group({
    environments: this.fb.array([]),
  });

  // Subscriptions
  settingsStore = inject(SettingsStore);
  private destroyRef = inject(DestroyRef);

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
