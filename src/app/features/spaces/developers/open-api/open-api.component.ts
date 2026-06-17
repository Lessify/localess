import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, inject, OnInit, ViewEncapsulation } from '@angular/core';
import { OpenApiService } from '@shared/services/open-api.service';
import { SpaceStore } from '@shared/stores/space.store';
import { HlmProgressImports } from '@spartan-ng/helm/progress';
import { Observable } from 'rxjs';

@Component({
  selector: 'll-open-api',
  templateUrl: './open-api.component.html',
  styleUrl: './open-api.component.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, HlmProgressImports],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class OpenApiComponent implements OnInit {
  private readonly openApiService = inject(OpenApiService);
  private readonly spaceStore = inject(SpaceStore);

  openApiDocument$?: Observable<string>;

  ngOnInit(): void {
    const spaceId = this.spaceStore.selectedSpaceId();
    if (spaceId) {
      this.openApiDocument$ = this.openApiService.generate(spaceId);
    }
  }
}
