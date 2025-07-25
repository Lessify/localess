import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, input, OnInit, ViewEncapsulation, inject } from '@angular/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { OpenApiService } from '@shared/services/open-api.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'll-open-api',
  templateUrl: './open-api.component.html',
  styleUrl: './open-api.component.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatProgressBarModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class OpenApiComponent implements OnInit {
  private readonly openApiService = inject(OpenApiService);

  // Input
  spaceId = input.required<string>();

  openApiDocument$?: Observable<string>;

  ngOnInit(): void {
    this.openApiDocument$ = this.openApiService.generate(this.spaceId());
  }
}
