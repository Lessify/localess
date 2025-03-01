import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'll-breadcrumb-item',
  standalone: true,
  templateUrl: './breadcrumb-item.component.html',
  styleUrls: ['./breadcrumb-item.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BreadcrumbItemComponent {
  home = input(false, { transform: booleanAttribute });
}
