import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { BeamsComponent } from '../beams';
import { BeamsCollisionComponent } from '../beams-collision';
import { DotPatternComponent } from '../dot-pattern';
import { GalaxyComponent } from '../galaxy';
import { LaserGridComponent } from '../laser-grid';
import { MatrixComponent } from '../matrix';
import { MeteorsComponent } from '../meteors';
import { PollenComponent } from '../pollen';
import { PrismComponent } from '../prism';
import { StarfieldComponent } from '../starfield';
import { TopographyComponent } from '../topography';

const BACKGROUND_COUNT = 11;

@Component({
  selector: 'll-random-background',
  templateUrl: './random-background.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block size-full' },
  imports: [
    BeamsComponent,
    BeamsCollisionComponent,
    DotPatternComponent,
    GalaxyComponent,
    LaserGridComponent,
    MatrixComponent,
    MeteorsComponent,
    PollenComponent,
    PrismComponent,
    StarfieldComponent,
    TopographyComponent,
  ],
})
export class RandomBackgroundComponent {
  readonly bgIndex = signal(Math.floor(Math.random() * BACKGROUND_COUNT));
}
