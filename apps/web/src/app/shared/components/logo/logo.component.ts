import { ChangeDetectionStrategy, Component, computed, input, linkedSignal } from '@angular/core';
import { HlmH3 } from '@spartan-ng/helm/typography';

@Component({
  selector: 'll-logo',
  templateUrl: './logo.component.html',
  styleUrls: ['./logo.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmH3],
})
export class LogoComponent {
  open = input.required<boolean>();

  /** Half turns made so far: one each time the sidebar folds or opens, none on the first render. */
  turns = linkedSignal<boolean, number>({
    source: this.open,
    computation: (_, previous) => (previous ? previous.value + 1 : 0),
  });

  /** After an odd number of half turns the L's sit in each other's place: their colours swap too, so the mark looks the same. */
  turned = computed(() => this.turns() % 2 === 1);

  rotation = computed(() => `rotate(${this.turns() * 180}deg)`);
}
