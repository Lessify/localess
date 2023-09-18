import {ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {MatTableDataSource} from '@angular/material/table';
import {MatDialog} from '@angular/material/dialog';
import {filter, switchMap, takeUntil} from 'rxjs/operators';
import {MatSort} from '@angular/material/sort';
import {MatPaginator} from '@angular/material/paginator';
import {Store} from '@ngrx/store';
import {AppState} from '@core/state/core.state';
import {Space} from '@shared/models/space.model';
import {NotificationService} from '@shared/services/notification.service';
import {combineLatest, Subject} from 'rxjs';
import {selectSpace} from '@core/state/space/space.selector';
import {ConfirmationDialogComponent} from '@shared/components/confirmation-dialog/confirmation-dialog.component';
import {ConfirmationDialogModel} from '@shared/components/confirmation-dialog/confirmation-dialog.model';
import {SpaceService} from '@shared/services/space.service';
import {PluginService} from '@shared/services/plugin.service';
import {Plugin, PluginActionDefinition, PluginConfiguration, PluginDefinition} from '@shared/models/plugin.model';
import {InstallDialogComponent} from './install-dialog/install-dialog.component';
import {InstallDialogModel} from './install-dialog/install-dialog.model';
import {ConfigDialogComponent} from './config-dialog/config-dialog.component';
import {ConfigDialogModel} from './config-dialog/config-dialog.model';
import {ObjectUtils} from '@core/utils/object-utils.service';

@Component({
  selector: 'll-plugins',
  templateUrl: './plugins.component.html',
  styleUrls: ['./plugins.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PluginsComponent implements OnInit, OnDestroy {
  @ViewChild(MatSort, {static: false}) sort?: MatSort;
  @ViewChild(MatPaginator, {static: false}) paginator?: MatPaginator;

  isLoading: boolean = true;
  dataSource: MatTableDataSource<Plugin> = new MatTableDataSource<Plugin>([]);
  displayedColumns: string[] = ['id', 'name', 'owner', 'version', 'createdAt', 'updatedAt', 'actions'];
  availablePlugins: PluginDefinition[] = [];

  selectedSpace?: Space;

  // Subscriptions
  private destroy$ = new Subject();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly pluginService: PluginService,
    private readonly spaceService: SpaceService,
    private readonly dialog: MatDialog,
    private readonly cd: ChangeDetectorRef,
    private readonly notificationService: NotificationService,
    private readonly store: Store<AppState>,
  ) {
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.store.select(selectSpace)
      .pipe(
        filter(it => it.id !== ''), // Skip initial data
        switchMap(it =>
          combineLatest([
            this.spaceService.findById(it.id),
            this.pluginService.findAll(it.id),
            this.pluginService.findAllAvailable(it.id)
          ])
        ),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: ([space, plugins, availablePlugins]) => {
          this.dataSource = new MatTableDataSource<Plugin>(plugins);
          this.dataSource.sort = this.sort || null;
          this.dataSource.paginator = this.paginator || null;
          this.selectedSpace = space
          this.availablePlugins = availablePlugins;
          this.isLoading = false;
          this.cd.markForCheck();
        }
      })
  }

  openInstallDialog(): void {
    this.dialog.open<InstallDialogComponent, InstallDialogModel, string>(
      InstallDialogComponent, {
        minWidth: '900px',
        width: 'calc(100vw - 160px)',
        maxWidth: '1000px',
        maxHeight: 'calc(100vh - 80px)',
        data: {
          plugins: this.availablePlugins
        }
      })
      .afterClosed()
      .pipe(
        filter(it => it !== undefined),
        switchMap((id) =>
          this.pluginService.install(this.selectedSpace!.id, id!)
        )
      )
      .subscribe({
        next: (value) => {
          if (value) {
            this.notificationService.success(`Plugin has been installed.`);
          } else {
            this.notificationService.warn(`Plugin can not be installed.`);
          }
        },
        error: (err) => {
          this.notificationService.error(`Plugin can not be installed.`);
        }
      });
  }

  openUpdateVersionDialog(element: Plugin): void {
    this.dialog.open<ConfirmationDialogComponent, ConfirmationDialogModel, boolean>(
      ConfirmationDialogComponent, {
        data: {
          title: 'Update Plugin',
          content: `Are you sure about Updating Plugin with name '${element.name}'.`
        }
      })
      .afterClosed()
      .pipe(
        filter((it) => it || false),
        switchMap(_ =>
          this.pluginService.updateVersion(this.selectedSpace!.id, element.id)
        )
      )
      .subscribe({
        next: (value) => {
          if (value) {
            this.notificationService.success(`Plugin '${element.name}' has been updated.`);
          } else {
            this.notificationService.warn(`Plugin '${element.name}' can not be updated.`);
          }
        },
        error: (err) => {
          this.notificationService.error(`Plugin '${element.name}' can not be updated.`);
        }
      });
  }

  openConfigurationDialog(element: Plugin): void {
    this.dialog.open<ConfigDialogComponent, ConfigDialogModel, PluginConfiguration>(
      ConfigDialogComponent, {
        width: '500px',
        data: {
          plugin: ObjectUtils.clone(element)
        }
      })
      .afterClosed()
      .pipe(
        filter(it => it !== undefined),
        switchMap(it =>
          this.pluginService.updateConfiguration(this.selectedSpace!.id, element.id, it!)
        )
      )
      .subscribe({
        next: () => {
          this.notificationService.success(`Plugin '${element.name}' has been updated.`);
        },
        error: (err) => {
          this.notificationService.error(`Plugin '${element.name}' can not be updated.`);
        }
      });
  }

  openActionDialog(element: Plugin, action: PluginActionDefinition): void {
    this.dialog.open<ConfirmationDialogComponent, ConfirmationDialogModel, boolean>(
      ConfirmationDialogComponent, {
        data: {
          title: 'Plugin Action',
          content: `Are you sure about Executing Plugin '${element.name}' with Action '${action.name}' .`
        }
      })
      .afterClosed()
      .pipe(
        filter((it) => it || false),
        switchMap(it =>
          this.pluginService.sendEvent(this.selectedSpace!.id, element.id, action.id)
        )
      )
      .subscribe({
        next: () => {
          this.notificationService.success(`Plugin '${element.name}' with Action '${action.name}' has been executed.`);
        },
        error: (err) => {
          this.notificationService.error(`Plugin '${element.name}' with Action '${action.name}' can not been executed.`);
        }
      });
  }

  openUninstallDialog(element: Plugin): void {
    this.dialog.open<ConfirmationDialogComponent, ConfirmationDialogModel, boolean>(
      ConfirmationDialogComponent, {
        data: {
          title: 'Uninstall Plugin',
          content: `Are you sure about Uninstalling Plugin with name '${element.name}'.`
        }
      })
      .afterClosed()
      .pipe(
        filter((it) => it || false),
        switchMap(_ =>
          this.pluginService.uninstall(this.selectedSpace!.id, element.id)
        )
      )
      .subscribe({
        next: () => {
          this.notificationService.success(`Plugin '${element.name}' has been uninstalled.`);
        },
        error: (err) => {
          this.notificationService.error(`Plugin '${element.name}' can not be uninstalled.`);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next(undefined)
    this.destroy$.complete()
  }
}
