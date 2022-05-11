import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
} from '@angular/core';

@Component({
  selector: 'll-translation-string-view',
  templateUrl: './translation-string-view.component.html',
  styleUrls: ['./translation-string-view.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TranslationStringViewComponent implements OnInit {
  @Input() value: string = '';

  constructor() {}

  ngOnInit(): void {}
}
