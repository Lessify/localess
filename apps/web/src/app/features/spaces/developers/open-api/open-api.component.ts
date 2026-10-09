import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, inject, OnInit, signal, ViewEncapsulation } from '@angular/core';
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

  /**
   * Whether the Stoplight Elements bundle has finished loading and `<elements-api>` is defined.
   *
   * The bundle is ~2MB and this is the only route that renders it, so it is imported on demand
   * rather than listed in angular.json's global `scripts` - a global script would ship in the
   * initial bundle on every page, including login.
   */
  protected readonly elementsReady = signal(false);

  openApiDocument$?: Observable<string>;

  ngOnInit(): void {
    const spaceId = this.spaceStore.selectedSpaceId();
    if (spaceId) {
      this.openApiDocument$ = this.openApiService.generate(spaceId);
    }
    void this.loadElements();
  }

  private async loadElements(): Promise<void> {
    await import('@stoplight/elements/web-components.min.js');
    this.elementsReady.set(true);
  }
}
