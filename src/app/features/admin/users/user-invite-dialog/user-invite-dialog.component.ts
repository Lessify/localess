import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { LocalSettingsStore } from '@shared/stores/local-settings.store';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { MatTooltip } from '@angular/material/tooltip';
import { MatListModule, MatSelectionList } from '@angular/material/list';
import { MatDivider } from '@angular/material/divider';
import { MatButton } from '@angular/material/button';
import { JsonPipe } from '@angular/common';

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
    MatInput,
    MatSelectModule,
    MatSlideToggle,
    MatTooltip,
    MatSelectionList,
    MatListModule,
    MatDivider,
    MatButton,
    JsonPipe,
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
