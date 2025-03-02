import { ChangeDetectionStrategy, Component, input, OnInit } from '@angular/core';
import { OpenApiService } from '@shared/services/open-api.service';
import { Observable } from 'rxjs';
import { AsyncPipe } from '@angular/common';
import { MatProgressBar } from '@angular/material/progress-bar';

@Component({
  selector: 'll-open-api',
  standalone: true,
  templateUrl: './open-api.component.html',
  styleUrl: './open-api.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AsyncPipe, MatProgressBar],
})
export class OpenApiComponent implements OnInit {
  // Input
  spaceId = input.required<string>();

  openApiDocument$?: Observable<string>;

  constructor(private readonly openApiService: OpenApiService) {}

  ngOnInit(): void {
    this.openApiDocument$ = this.openApiService.generate(this.spaceId());
  }
}
