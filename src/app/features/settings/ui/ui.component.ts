import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
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
import { ThemePalette } from '@angular/material/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'll-space-settings-ui',
  templateUrl: './ui.component.html',
  styleUrls: ['./ui.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiComponent implements OnInit {
  private destroyRef = inject(DestroyRef);

  isLoading = true;
  space?: Space;

  // Form
  form: FormGroup = this.fb.group({
    color: this.fb.control<ThemePalette>(undefined, SpaceValidator.UI_COLOR),
  });

  constructor(
    private readonly fb: FormBuilder,
    readonly fe: FormErrorHandlerService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly spaceService: SpaceService,
    private readonly dialog: MatDialog,
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
          if (space.ui) {
            this.form.patchValue(space.ui);
          }
          this.isLoading = false;
          this.cd.markForCheck();
        },
      });
  }

  save(): void {
    this.spaceService.updateUi(this.space!.id, this.form.value).subscribe({
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
