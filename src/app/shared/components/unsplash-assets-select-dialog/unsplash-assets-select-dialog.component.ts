import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject, Inject, OnInit, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { UnsplashAssetsSelectDialogModel } from './unsplash-assets-select-dialog.model';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { SelectionModel } from '@angular/cdk/collections';
import { LocalSettingsStore } from '@shared/stores/local-settings.store';
import { UnsplashPhoto } from '@shared/models/unsplash-plugin.model';
import { UnsplashPluginService } from '@shared/services/unsplash-plugin.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatIcon } from '@angular/material/icon';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatTooltip } from '@angular/material/tooltip';
import { MatButton } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { DatePipe, NgOptimizedImage } from '@angular/common';
import { MatCheckbox } from '@angular/material/checkbox';

@Component({
  selector: 'll-unsplash-assets-select-dialog',
  standalone: true,
  templateUrl: './unsplash-assets-select-dialog.component.html',
  styleUrls: ['./unsplash-assets-select-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogModule,
    MatProgressBar,
    MatFormFieldModule,
    MatInput,
    MatIcon,
    MatButtonToggleModule,
    MatTooltip,
    MatButton,
    NgOptimizedImage,
    MatCardModule,
    DatePipe,
    MatCheckbox,
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
