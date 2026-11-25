import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { provideIcons } from '@ng-icons/core';
import { lucideCodeXml, lucideEye, lucideLanguages, lucidePenLine, lucideShieldCheck, lucideUserX } from '@ng-icons/lucide';
import { NO_ROLE_OPTION, USER_ROLE_OPTIONS } from '@shared/models/user-role.model';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmRadioGroupImports } from '@spartan-ng/helm/radio-group';

/** The control's value for None: a radio needs a value, the dialog answers `null`. */
export const NO_ROLE = '';

/**
 * The role as choice cards (as Create Space offers its templates): None, then the five roles, each with what it lets the
 * user do. `control` holds a `UserRole` or `NO_ROLE`.
 */
@Component({
  selector: 'll-user-role-choice',
  templateUrl: './user-role-choice.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, HlmFieldImports, HlmIconImports, HlmRadioGroupImports],
  providers: [provideIcons({ lucideCodeXml, lucideEye, lucideLanguages, lucidePenLine, lucideShieldCheck, lucideUserX })],
})
export class UserRoleChoiceComponent {
  readonly control = input.required<FormControl<string>>();

  /** None first, then the roles, most access first. `key` names the card's elements (None's value can not). */
  protected readonly options = [
    { id: NO_ROLE, key: 'role-NONE', ...NO_ROLE_OPTION },
    ...USER_ROLE_OPTIONS.map(it => ({ ...it, key: `role-${it.id}` })),
  ];
}
