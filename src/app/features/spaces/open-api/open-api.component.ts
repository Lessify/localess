import { ChangeDetectionStrategy, Component, input, OnInit } from '@angular/core';
import { OpenApiService } from '@shared/services/open-api.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'll-open-api',
  templateUrl: './open-api.component.html',
  styleUrl: './open-api.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
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
