import { ClipboardModule } from '@angular/cdk/clipboard';
import { CommonModule } from '@angular/common';
import { AfterViewInit, ChangeDetectionStrategy, Component, DestroyRef, inject, Injector, OnInit, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { FilterPredicateUtils } from '@core/utils/filter-predicate-utils.service';
import { provideIcons } from '@ng-icons/core';
import { lucideCopy, lucidePencil, lucidePlus, lucideTrash } from '@ng-icons/lucide';
import { ConfirmationDialogComponent } from '@shared/components/confirmation-dialog/confirmation-dialog.component';
import { ConfirmationDialogModel } from '@shared/components/confirmation-dialog/confirmation-dialog.model';
import { FilterToolbarValue, LlFilterToolbarImports } from '@shared/components/filter-toolbar/filter-toolbar.imports';
import { LlPaginatorImports, Paginator } from '@shared/components/paginator/paginator.imports';
import { LlTableImports, TableDataSource, TableSort } from '@shared/components/table/table.imports';
import { Space } from '@shared/models/space.model';
import { NotificationService } from '@shared/services/notification.service';
import { SpaceService } from '@shared/services/space.service';
import { SpaceTemplateService } from '@shared/services/space-template.service';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmProgressImports } from '@spartan-ng/helm/progress';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { of } from 'rxjs';
import { catchError, filter, map, switchMap } from 'rxjs/operators';

import { SpaceCreateDialogComponent } from './space-create-dialog/space-create-dialog.component';
import { SpaceCreateDialogModel } from './space-create-dialog/space-create-dialog.model';
import { SpaceEditDialogComponent } from './space-edit-dialog/space-edit-dialog.component';
import { SpaceEditDialogModel } from './space-edit-dialog/space-edit-dialog.model';
import { SPACE_TEMPLATES } from './templates';

@Component({
  selector: 'll-spaces',
  templateUrl: './spaces.component.html',
  styleUrls: ['./spaces.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ClipboardModule,
    CommonModule,
    LlTableImports,
    LlPaginatorImports,
    LlFilterToolbarImports,
    HlmButtonImports,
    HlmIconImports,
    HlmProgressImports,
    HlmTooltipImports,
  ],
  providers: [
    provideIcons({
      lucidePlus,
      lucideCopy,
      lucidePencil,
      lucideTrash,
    }),
  ],
})
export class SpacesComponent implements OnInit, AfterViewInit {
  private readonly spaceService = inject(SpaceService);
  private readonly spaceTemplateService = inject(SpaceTemplateService);
  private readonly dialog = inject(MatDialog);
  private readonly notificationService = inject(NotificationService);
  private readonly injector = inject(Injector);

  sort = viewChild.required(TableSort);
  paginator = viewChild.required(Paginator);

  isLoading = signal(true);
  private readonly spaces = signal<Space[]>([]);
  readonly dataSource = new TableDataSource<Space>(this.spaces, this.injector);
  displayedColumns: string[] = ['id', 'name', /*'createdAt',*/ 'updatedAt', 'actions'];

  private destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    this.dataSource.filterPredicate = FilterPredicateUtils.create<Space>({
      searchFields: space => [space.id, space.name],
    });
    this.loadData();
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort();
    this.dataSource.paginator = this.paginator();
  }

  onFilterChange(value: FilterToolbarValue): void {
    this.dataSource.filter = JSON.stringify(value);
  }

  loadData(): void {
    this.spaceService
      .findAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(response => {
        this.spaces.set(response);
        this.isLoading.set(false);
      });
  }

  openAddDialog(): void {
    this.dialog
      .open<SpaceCreateDialogComponent, undefined, SpaceCreateDialogModel>(SpaceCreateDialogComponent, {
        panelClass: 'sm',
      })
      .afterClosed()
      .pipe(
        filter(it => it !== undefined),
        switchMap(it =>
          this.spaceService.create(it!).pipe(
            switchMap(ref => {
              const template = SPACE_TEMPLATES.find(t => t.id === it!.template);
              // EMPTY resolves to a template whose schemas array is empty, and apply()
              // short-circuits on that without touching Firestore.
              if (!template) return of({ templateFailed: false });
              return this.spaceTemplateService.apply(ref.id, template).pipe(
                map(() => ({ templateFailed: false })),
                // The space exists and is usable, so a failed template is not a failed creation.
                // Reporting it as one would be a lie, and would invite the user to retry a create
                // that already succeeded. There is deliberately no rollback: deleting a space the
                // user just watched appear is worse than leaving an empty one.
                catchError((err: unknown) => {
                  console.error(err);
                  return of({ templateFailed: true });
                }),
              );
            }),
          ),
        ),
      )
      .subscribe({
        next: result => {
          if (result.templateFailed) {
            this.notificationService.warning('Space has been created, but the template could not be applied.');
          } else {
            this.notificationService.success('Space has been created.');
          }
        },
        error: (err: unknown) => {
          console.error(err);
          this.notificationService.error('Space can not be created.');
        },
      });
  }

  openEditDialog(element: Space): void {
    this.dialog
      .open<SpaceEditDialogComponent, SpaceEditDialogModel, SpaceEditDialogModel>(SpaceEditDialogComponent, {
        panelClass: 'sm',
        data: {
          name: element.name,
        },
      })
      .afterClosed()
      .pipe(
        filter(it => it !== undefined),
        switchMap(it => this.spaceService.update(element.id, it!)),
      )
      .subscribe({
        next: () => {
          this.notificationService.success('Space has been updated.');
        },
        error: (err: unknown) => {
          console.error(err);
          this.notificationService.error('Space can not be updated.');
        },
      });
  }

  openDeleteDialog(element: Space): void {
    this.dialog
      .open<ConfirmationDialogComponent, ConfirmationDialogModel, boolean>(ConfirmationDialogComponent, {
        data: {
          title: 'Delete Space',
          content: `Are you sure about deleting Space with name '${element.name}'.\n This action can not be undone.`,
        },
      })
      .afterClosed()
      .pipe(
        filter(it => it || false),
        switchMap(() => this.spaceService.delete(element.id)),
      )
      .subscribe({
        next: () => {
          this.notificationService.success(`Space '${element.name}' has been deleted.`);
        },
        error: (err: unknown) => {
          console.error(err);
          this.notificationService.error(`Space '${element.name}' can not be deleted.`);
        },
      });
  }

  copied() {
    this.notificationService.success(`Space ID copied to clipboard.`);
  }
}
