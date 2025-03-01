import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { StatusMode } from '@shared/components/status/status.model';

@Component({
  selector: 'll-status',
  standalone: true,
  templateUrl: './status.component.html',
  styleUrls: ['./status.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
})
export class StatusComponent {
  mode = input.required<StatusMode>();
}
