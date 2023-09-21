import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'll-breadcrumb-item',
  templateUrl: './breadcrumb-item.component.html',
  styleUrls: ['./breadcrumb-item.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BreadcrumbItemComponent {
  constructor() {}
}
