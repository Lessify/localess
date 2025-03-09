import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { LocalSettingsStore } from '@shared/stores/local-settings.store';

@Component({
  selector: 'll-user-invite-dialog',
  standalone: true,
  templateUrl: './user-invite-dialog.component.html',
  styleUrls: ['./user-invite-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatTooltipModule,
    MatListModule,
    MatDividerModule,
    MatButtonModule,
    CommonModule,
  ],
})
export class UserInviteDialogComponent {
  form: FormGroup = this.fb.group({
    email: this.fb.control('', [Validators.required, Validators.minLength(2), Validators.email]),
    password: this.fb.control('', [Validators.required, Validators.minLength(6)]),
    displayName: this.fb.control('', [Validators.minLength(2)]),
    role: this.fb.control<string | undefined>(undefined),
    permissions: this.fb.control<string[] | undefined>(undefined),
    lock: this.fb.control<boolean | undefined>(undefined),
  });

  settingsStore = inject(LocalSettingsStore);

  constructor(
    private readonly fb: FormBuilder,
    readonly fe: FormErrorHandlerService,
  ) {}
}
