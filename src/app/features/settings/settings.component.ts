import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { takeUntil } from 'rxjs/operators';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { Store } from '@ngrx/store';
import { AppState } from '@core/state/core.state';
import { SpaceService } from '@shared/services/space.service';
import { Space } from '@shared/models/space.model';
import { NotificationService } from '@shared/services/notification.service';
import { Subject } from 'rxjs';
import { activate } from '@angular/fire/remote-config';

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
export class SettingsComponent implements OnInit, OnDestroy {
  @ViewChild(MatSort, { static: false }) sort?: MatSort;
  @ViewChild(MatPaginator, { static: false }) paginator?: MatPaginator;

  // Loading
  isLoading: boolean = true;

  spaceId: string;
  space?: Space;
  activeTab = 'general';
  tabItems: TabItem[] = [
    { icon: 'space_dashboard', label: 'General', link: 'general' },
    { icon: 'palette', label: 'UI', link: 'ui' },
    { icon: 'language', label: 'Locales', link: 'locales' },
    { icon: 'shape_line', label: 'Visual Editor', link: 'visual-editor' },
    { icon: 'badge', label: 'Access Tokens', link: 'tokens' },
  ];

  // Subscriptions
  private destroy$ = new Subject();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly spaceService: SpaceService,
    private readonly dialog: MatDialog,
    private readonly cd: ChangeDetectorRef,
    private readonly notificationService: NotificationService,
    private readonly store: Store<AppState>
  ) {
    const { spaceId } = route.snapshot.params;
    this.spaceId = spaceId;
    const idx = router.url.lastIndexOf('/');
    this.activeTab = router.url.substring(idx + 1);
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.spaceService
      .findById(this.spaceId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: space => {
          this.space = space;
          this.isLoading = false;
          this.cd.markForCheck();
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next(undefined);
    this.destroy$.complete();
  }

  protected readonly activate = activate;
}
