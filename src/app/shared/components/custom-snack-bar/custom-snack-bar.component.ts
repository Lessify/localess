import {ChangeDetectionStrategy, Component, HostBinding, Inject, ViewEncapsulation} from '@angular/core';
import {MAT_SNACK_BAR_DATA} from '@angular/material/snack-bar';
import {CustomSnackBarModel} from '@shared/components/custom-snack-bar/custom-snack-bar.model';
import {Router} from '@angular/router';

@Component({
  selector: 'll-custom-snack-bar',
  templateUrl: 'custom-snack-bar.component.html',
  styleUrls: ['custom-snack-bar.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomSnackBarComponent {

  @HostBinding('class') class = 'mat-mdc-simple-snack-bar';

  constructor(
    private readonly router: Router,
    @Inject(MAT_SNACK_BAR_DATA) public readonly data: CustomSnackBarModel,
  ) {
  }

  navigate(link: string): void {
    if (link.startsWith('https://') || link.startsWith('http://')) {
      window.open(link)
    } else {
      this.router.navigate([link]);
    }
  }

}
