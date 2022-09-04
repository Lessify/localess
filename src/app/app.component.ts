import {Component} from '@angular/core';
import {Performance} from '@angular/fire/performance';

@Component({
  selector: 'll-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

  constructor(
    private readonly performance: Performance,
  ) {
  }
}
