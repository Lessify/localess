import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { SpaceEnvironment } from '@shared/models/space.model';
import { NotificationService } from '@shared/services/notification.service';
import { SpaceService } from '@shared/services/space.service';
import { LocalSettingsStore } from '@shared/stores/local-settings.store';
import { SpaceStore } from '@shared/stores/space.store';
import { SpaceValidator } from '@shared/validators/space.validator';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'll-space-settings-visual-editor',
  templateUrl: './visual-editor.component.html',
  styleUrls: ['./visual-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatProgressBarModule,
    ReactiveFormsModule,
    MatExpansionModule,
    DragDropModule,
    MatFormFieldModule,
    MatInputModule,
    CommonModule,
  ],
})
export class VisualEditorComponent {
  isLoading = signal(true);
  spaceStore = inject(SpaceStore);

  // Form
  form: FormGroup = this.fb.group({
    environments: this.fb.array([]),
  });

  // Subscriptions
  settingsStore = inject(LocalSettingsStore);
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
