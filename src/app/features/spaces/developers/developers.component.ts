import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'll-spaces-developers',
  templateUrl: './developers.component.html',
  styleUrls: ['./developers.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterModule],
})
export class DevelopersComponent {
  // Input
  spaceId = input.required<string>();
}
