import { ChangeDetectionStrategy, Component, computed, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { TokenType } from '@localess/shared';
import { provideIcons } from '@ng-icons/core';
import { lucideEye, lucideGlobe, lucideKeyRound, lucideX } from '@ng-icons/lucide';
import { TOKEN_TYPES, TokenForm } from '@shared/models/token.model';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { HlmRadioGroupImports } from '@spartan-ng/helm/radio-group';
import { HlmSeparatorImports } from '@spartan-ng/helm/separator';

import { TokenValidator } from '../token.validator';

@Component({
  selector: 'll-token-dialog',
  templateUrl: './token-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'grid gap-4' },
  imports: [
    HlmDialogImports,
    ReactiveFormsModule,
    HlmButtonImports,
    HlmFieldImports,
    HlmInputGroupImports,
    HlmRadioGroupImports,
    HlmSeparatorImports,
    HlmIconImports,
  ],
  providers: [provideIcons({ lucideX, lucideGlobe, lucideEye, lucideKeyRound })],
})
export class TokenDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  readonly fe = inject(FormErrorHandlerService);
  private readonly dialogRef = inject<BrnDialogRef<TokenForm>>(BrnDialogRef);

  /** Optional: creating a token opens the dialog with no context, editing one passes the token. */
  private readonly context = injectBrnDialogContext<TokenForm>({ optional: true });

  readonly types = TOKEN_TYPES;
  /** On edit the type is shown but locked: the value's prefix names it. */
  readonly isEdit = this.context != null;

  readonly form = this.fb.group({
    name: this.fb.control<string>('', TokenValidator.NAME),
    type: this.fb.nonNullable.control<TokenType>({ value: TokenType.PUBLIC, disabled: this.isEdit }, Validators.required),
    cacheTtl: this.fb.control<number | null>(null, TokenValidator.CACHE_TTL),
  });

  private readonly typeValue = toSignal(this.form.controls.type.valueChanges, { initialValue: this.form.controls.type.value });
  readonly showCacheTtl = computed(() => this.typeValue() !== TokenType.MANAGEMENT);

  constructor() {
    // A management token is never cached: its TTL field is hidden and emptied.
    this.form.controls.type.valueChanges.pipe(takeUntilDestroyed()).subscribe(type => {
      if (type === TokenType.MANAGEMENT) this.form.controls.cacheTtl.setValue(null);
    });
  }

  ngOnInit(): void {
    // `?.` because the injection above is optional - without it this throws on the create path.
    if (this.context != null) {
      this.form.patchValue({ name: this.context.name, type: this.context.type, cacheTtl: this.context.cacheTtl ?? null });
    }
  }

  resetCacheTtl(): void {
    this.form.controls.cacheTtl.setValue(null);
  }

  save(): void {
    this.dialogRef.close(this.form.getRawValue() as TokenForm);
  }
}
