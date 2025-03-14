import { SelectionModel } from '@angular/cdk/collections';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject, Inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { UnsplashPhoto } from '@shared/models/unsplash-plugin.model';
import { UnsplashPluginService } from '@shared/services/unsplash-plugin.service';
import { LocalSettingsStore } from '@shared/stores/local-settings.store';
import { UnsplashAssetsSelectDialogModel } from './unsplash-assets-select-dialog.model';

@Component({
  selector: 'll-unsplash-assets-select-dialog',
  templateUrl: './unsplash-assets-select-dialog.component.html',
  styleUrls: ['./unsplash-assets-select-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogModule,
    MatProgressBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonToggleModule,
    MatTooltipModule,
    MatButtonModule,
    CommonModule,
    MatCardModule,
    MatCheckboxModule,
    NgOptimizedImage,
  ],
})
export class UnsplashAssetsSelectDialogComponent implements OnInit {
  assets = signal<UnsplashPhoto[]>([]);
  limit = signal<number | undefined>(undefined);
  remaining = signal<number | undefined>(undefined);
  total = signal<number | undefined>(undefined);
  totalPages = signal<number | undefined>(undefined);
  currentPage = signal<number>(1);
  showLoadMore = signal<boolean>(false);

  orientation = signal<'landscape' | 'portrait' | 'squarish' | undefined>(undefined);

  selection = new SelectionModel<UnsplashPhoto>(this.data.multiple, [], undefined, (o1, o2) => o1.id === o2.id);
  // Subscriptions
  private destroyRef = inject(DestroyRef);
  // Loading
  isLoading = signal(true);
  // Local Settings
  settingsStore = inject(LocalSettingsStore);

  constructor(
    private readonly unsplashPluginService: UnsplashPluginService,
    readonly fe: FormErrorHandlerService,
    private readonly cd: ChangeDetectorRef,
    @Inject(MAT_DIALOG_DATA)
    public data: UnsplashAssetsSelectDialogModel,
  ) {}

  ngOnInit(): void {
    this.unsplashPluginService
      .random()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: data => {
          this.assets.set(data.results);
          this.limit.set(data.limit);
          this.remaining.set(data.remaining);
          this.isLoading.set(false);
        },
      });
  }

  search(searchTerm: string, page?: number | undefined): void {
    if (searchTerm.length < 1) return;
    this.isLoading.set(true);
    this.unsplashPluginService
      .search({ query: searchTerm, orientation: this.orientation(), page: page })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: data => {
          if (page) {
            this.assets.update(it => {
              it.push(...data.results);
              return it;
            });
          } else {
            this.assets.set(data.results);
          }
          this.limit.set(data.limit);
          this.remaining.set(data.remaining);
          this.total.set(data.total);
          this.totalPages.set(data.total_pages);
          this.currentPage.set(page || 1);
          this.showLoadMore.set(this.currentPage() < data.total_pages);
          this.isLoading.set(false);
        },
      });
  }
}
