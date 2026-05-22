import { ChangeDetectionStrategy, Component } from '@angular/core';

interface Meteor {
  left: string;
  delay: string;
  duration: string;
}

@Component({
  selector: 'll-meteors',
  templateUrl: './meteors.component.html',
  styleUrls: ['./meteors.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MeteorsComponent {
  readonly meteors: Meteor[] = Array.from({ length: 30 }, () => ({
    left: `${Math.floor(Math.random() * 115 - 5)}%`,
    delay: `${(Math.random() * 8).toFixed(2)}s`,
    duration: `${(Math.random() * 8 + 2).toFixed(2)}s`,
  }));
}
