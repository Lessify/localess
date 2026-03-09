import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { HlmH3 } from '@spartan-ng/helm/typography';

@Component({
  selector: 'll-logo',
  templateUrl: './logo.component.html',
  styleUrls: ['./logo.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmH3, NgOptimizedImage],
})
export class LogoComponent {
  open = input.required<boolean>();
}
