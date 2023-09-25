import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'll-icon',
  templateUrl: './icon.component.html',
  styleUrls: ['./icon.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconComponent {
  @Input() start = '';
  @Input() end = '';
  @Input() animate = false;
}
