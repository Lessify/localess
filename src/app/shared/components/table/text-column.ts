import { CdkTextColumn } from '@angular/cdk/table';
import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';

import { LlCell, LlCellDef, LlColumnDef, LlHeaderCell, LlHeaderCellDef } from './cell';

/**
 * Column that simply shows text content for the header and row cells, mirroring MatTextColumn.
 * Assumes the table is using the native table implementation (ll-table).
 *
 * By default, the name of this column will be the header text and data property accessor.
 * The header text can be overridden with the `headerText` input. Cell values can be overridden
 * with the `dataAccessor` input. Change the text justification to the start or end using the
 * `justify` input.
 */
@Component({
  selector: 'll-text-column',
  template: `
    <ng-container llColumnDef>
      <th llHeaderCell *llHeaderCellDef [style.text-align]="justify">{{ headerText }}</th>
      <td llCell *llCellDef="let data" [style.text-align]="justify">{{ dataAccessor(data, name) }}</td>
    </ng-container>
  `,
  encapsulation: ViewEncapsulation.None,
  // Change detection is intentionally not OnPush, mirroring MatTextColumn:
  // this component's template is provided to the table for insertion into
  // its own view, which runs its change detection after this template's
  // bindings would otherwise be checked under OnPush.
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [LlColumnDef, LlHeaderCellDef, LlHeaderCell, LlCellDef, LlCell],
})
export class LlTextColumn<T> extends CdkTextColumn<T> {}
