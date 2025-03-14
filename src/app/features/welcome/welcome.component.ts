import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'll-welcome',
  templateUrl: './welcome.component.html',
  styleUrl: './welcome.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
})
export class WelcomeComponent {
  constructor() {}
}
