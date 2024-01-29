import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject, input, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { Store } from '@ngrx/store';
import { AppState } from '@core/state/core.state';
import { SpaceService } from '@shared/services/space.service';
import { Space } from '@shared/models/space.model';
import { NotificationService } from '@shared/services/notification.service';
import { activate } from '@angular/fire/remote-config';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

interface TabItem {
  icon: string;
  link: string;
  label: string;
}

@Component({
  selector: 'll-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComponent implements OnInit {
  @ViewChild(MatSort, { static: false }) sort?: MatSort;
  @ViewChild(MatPaginator, { static: false }) paginator?: MatPaginator;

  // Loading
  isLoading = true;

  // Input
  spaceId = input.required<string>();

  space?: Space;
  activeTab = 'general';
  tabItems: TabItem[] = [
    { icon: 'space_dashboard', label: 'General', link: 'general' },
    { icon: 'palette', label: 'UI', link: 'ui' },
    { icon: 'language', label: 'Locales', link: 'locales' },
    { icon: 'shape_line', label: 'Visual Editor', link: 'visual-editor' },
    { icon: 'badge', label: 'Access Tokens', link: 'tokens' },
  ];

  private destroyRef = inject(DestroyRef);

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly spaceService: SpaceService,
    private readonly dialog: MatDialog,
    private readonly cd: ChangeDetectorRef,
    private readonly notificationService: NotificationService,
    private readonly store: Store<AppState>
  ) {
    const idx = router.url.lastIndexOf('/');
    this.activeTab = router.url.substring(idx + 1);
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.spaceService
      .findById(this.spaceId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: space => {
          this.space = space;
          this.isLoading = false;
          this.cd.markForCheck();
        },
      });
  }

  protected readonly activate = activate;
}
