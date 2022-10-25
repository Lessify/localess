import {ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, ViewChild} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {MatTableDataSource} from '@angular/material/table';
import {MatDialog} from '@angular/material/dialog';
import {filter, switchMap} from 'rxjs/operators';
import {LocaleDialogComponent} from './locale-dialog/locale-dialog.component';
import {LocaleDialogModel} from './locale-dialog/locale-dialog.model';
import {MatSort} from '@angular/material/sort';
import {MatPaginator} from '@angular/material/paginator';
import {Store} from '@ngrx/store';
import {AppState} from '../../core/state/core.state';
import {ConfirmationDialogComponent} from '@shared/components/confirmation-dialog/confirmation-dialog.component';
import {ConfirmationDialogModel} from '@shared/components/confirmation-dialog/confirmation-dialog.model';
import {LocaleService} from '@shared/services/locale.service';
import {SpaceService} from '@shared/services/space.service';
import {Space} from '@shared/models/space.model';
import {Locale} from '@shared/models/locale.model';
import {selectSpace} from '../../core/state/space/space.selector';
import {NotificationService} from '@shared/services/notification.service';

@Component({
  selector: 'll-locales',
  templateUrl: './locales.component.html',
  styleUrls: ['./locales.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LocalesComponent implements OnInit {
  @ViewChild(MatSort, {static: false}) sort?: MatSort;
  @ViewChild(MatPaginator, {static: false}) paginator?: MatPaginator;

  isLoading: boolean = true;
  selectedSpace?: Space;
  dataSource: MatTableDataSource<Locale> = new MatTableDataSource<Locale>([]);
  displayedColumns: string[] = ['id', 'name' ,'isLocaleTranslatable', 'fallback', 'actions'];


  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    readonly localeService: LocaleService,
    private readonly spaceService: SpaceService,
    private readonly dialog: MatDialog,
    private readonly cd: ChangeDetectorRef,
    private readonly notificationService: NotificationService,
    private readonly store: Store<AppState>
  ) {
  }

  ngOnInit(): void {
    this.store.select(selectSpace)
    .pipe(
      filter(it => it.id !== '') // Skip initial data
    )
    .subscribe({
      next: (space) => {
        this.loadData(space.id);
      }
    })
  }

  loadData(spaceId: string): void {
    this.spaceService.findById(spaceId)
    .subscribe(response => {
        this.selectedSpace = response;
        this.dataSource = new MatTableDataSource<Locale>(response.locales);
        this.dataSource.sort = this.sort || null;
        this.dataSource.paginator = this.paginator || null;
        this.isLoading = false;
        this.cd.markForCheck();
      }
    )
  }

  openAddDialog(): void {
    if (this.selectedSpace) {
      const spaceId = this.selectedSpace.id
      const locales = this.selectedSpace.locales
      this.dialog.open<LocaleDialogComponent, Locale[], LocaleDialogModel>(
        LocaleDialogComponent, {
          width: '500px',
          data: locales
        })
      .afterClosed()
      .pipe(
        filter(it => it !== undefined),
        switchMap(it =>
          this.localeService.add(spaceId, it?.locale!)
        )
      )
      .subscribe({
          next: (value) => {
            this.notificationService.success('Locale has been added.');
          },
          error: (err) => {
            this.notificationService.error('Locale can not be added.');
          }
        }
      );
    }
  }

  openDeleteDialog(element: Locale): void {
    if (this.selectedSpace) {
      const spaceId = this.selectedSpace.id
      this.dialog.open<ConfirmationDialogComponent, ConfirmationDialogModel, boolean>(
        ConfirmationDialogComponent, {
          data: {
            title: 'Delete Locale',
            content: `Are you sure about deleting Locale with name '${element.name}'.`
          }
        })
      .afterClosed()
      .pipe(
        filter((it) => it || false),
        switchMap(_ =>
          this.localeService.delete(spaceId, element)
        )
      )
      .subscribe({
        next: () => {
          const idx: number = this.dataSource.data.findIndex(
            x => x.id === element.id
          );
          if (idx !== -1) {
            this.dataSource.data.splice(idx, 1);
            this.dataSource._updateChangeSubscription();
          }
          this.notificationService.success(`Locale '${element.name}' has been deleted.`);
        },
        error: () => {
          this.notificationService.error(`Locale '${element.name}' can not be deleted.`);
        }
      });
    }

  }

  markAsFallback(element: Locale): void {
    if (this.selectedSpace) {
      this.localeService.markAsFallback(this.selectedSpace.id, element)
      .subscribe({
        next: () => {
          this.notificationService.success(`Locale '${element.name}' has been marked as fallback.`);
        },
        error: () => {
          this.notificationService.error(`Locale '${element.name}' can not be marked as fallback.`);
        }
      })
    }
  }

  isSupport(locale: string): boolean {
    return this.localeService.isLocaleTranslatable(locale)
  }
}
