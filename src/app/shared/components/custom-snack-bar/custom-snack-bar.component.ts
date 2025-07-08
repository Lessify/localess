import { ChangeDetectionStrategy, Component, HostBinding, ViewEncapsulation, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_SNACK_BAR_DATA, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { CustomSnackBarModel } from '@shared/components/custom-snack-bar/custom-snack-bar.model';

@Component({
  selector: 'll-custom-snack-bar',
  templateUrl: 'custom-snack-bar.component.html',
  styleUrls: ['custom-snack-bar.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatSnackBarModule, MatButtonModule],
})
export class CustomSnackBarComponent {
  private readonly router = inject(Router);
  readonly data = inject<CustomSnackBarModel>(MAT_SNACK_BAR_DATA);

  @HostBinding('class') class = 'mat-mdc-simple-snack-bar';

  navigate(link: string): void {
    if (link.startsWith('https://') || link.startsWith('http://')) {
      window.open(link);
    } else {
      this.router.navigate([link]);
    }
  }
}
