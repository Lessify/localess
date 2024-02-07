import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { filter, switchMap } from 'rxjs/operators';
import { Store } from '@ngrx/store';
import { AppState } from '@core/state/core.state';
import { SpaceService } from '@shared/services/space.service';
import { Space } from '@shared/models/space.model';
import { NotificationService } from '@shared/services/notification.service';
import { selectSpace } from '@core/state/space/space.selector';
import { FormBuilder, FormGroup } from '@angular/forms';
import { SpaceValidator } from '@shared/validators/space.validator';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'll-space-settings-general',
  templateUrl: './general.component.html',
  styleUrls: ['./general.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GeneralComponent implements OnInit {
  isLoading = true;
  space?: Space;

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
    private readonly store: Store<AppState>
  ) {}

  ngOnInit(): void {
    this.store
      .select(selectSpace)
      .pipe(
        filter(it => it.id !== ''),
        switchMap(it => this.spaceService.findById(it.id)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: space => {
          this.space = space;
          this.form.patchValue(space);
          this.isLoading = false;
          this.cd.markForCheck();
        },
      });
  }

  save(): void {
    this.spaceService.update(this.space!.id, this.form.value).subscribe({
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
