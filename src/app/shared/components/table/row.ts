import {
  CdkCellOutlet,
  CdkFooterRow,
  CdkFooterRowDef,
  CdkHeaderRow,
  CdkHeaderRowDef,
  CdkNoDataRow,
  CdkRow,
  CdkRowDef,
} from '@angular/cdk/table';
import { booleanAttribute, ChangeDetectionStrategy, Component, Directive, ViewEncapsulation } from '@angular/core';
import { HlmTr } from '@spartan-ng/helm/table';

// Mirrors CDK_ROW_TEMPLATE / Material's ROW_TEMPLATE.
const ROW_TEMPLATE = `<ng-container cdkCellOutlet></ng-container>`;

/**
 * Header row definition for the ll-table. Mirrors MatHeaderRowDef, which
 * re-aliases CdkHeaderRowDef's inherited `columns`/`sticky` inputs via the
 * `inputs` metadata array — the only way to re-alias an inherited accessor
 * without redeclaring it; `@Input()` can't be added to a property the
 * subclass doesn't itself declare.
 */
@Directive({
  selector: '[llHeaderRowDef]',
  providers: [{ provide: CdkHeaderRowDef, useExisting: LlHeaderRowDef }],
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: [
    { name: 'columns', alias: 'llHeaderRowDef' },
    { name: 'sticky', alias: 'llHeaderRowDefSticky', transform: booleanAttribute },
  ],
})
export class LlHeaderRowDef extends CdkHeaderRowDef {}

/** Footer row definition for the ll-table. Mirrors MatFooterRowDef (see LlHeaderRowDef for why `inputs` is used here). */
@Directive({
  selector: '[llFooterRowDef]',
  providers: [{ provide: CdkFooterRowDef, useExisting: LlFooterRowDef }],
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: [
    { name: 'columns', alias: 'llFooterRowDef' },
    { name: 'sticky', alias: 'llFooterRowDefSticky', transform: booleanAttribute },
  ],
})
export class LlFooterRowDef extends CdkFooterRowDef {}

/** Data row definition for the ll-table. Mirrors MatRowDef (see LlHeaderRowDef for why `inputs` is used here). */
@Directive({
  selector: '[llRowDef]',
  providers: [{ provide: CdkRowDef, useExisting: LlRowDef }],
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: [
    { name: 'columns', alias: 'llRowDefColumns' },
    { name: 'when', alias: 'llRowDefWhen' },
  ],
})
export class LlRowDef<T> extends CdkRowDef<T> {}

/**
 * Header row template container. Bakes in hlmTr styling via hostDirectives.
 * Also sets an opaque background — HlmTr/HlmTh have no background of their
 * own, so a sticky header row (position: sticky, per *llHeaderRowDef="...;
 * sticky: true") would otherwise show the scrolling body rows through it.
 */
@Component({
  selector: 'll-header-row, tr[ll-header-row]',
  template: ROW_TEMPLATE,
  host: { role: 'row', class: 'bg-background' },
  hostDirectives: [HlmTr],
  // See table.ts for why this deliberately isn't OnPush.
  changeDetection: ChangeDetectionStrategy.Eager,
  encapsulation: ViewEncapsulation.None,
  exportAs: 'llHeaderRow',
  providers: [{ provide: CdkHeaderRow, useExisting: LlHeaderRow }],
  imports: [CdkCellOutlet],
})
export class LlHeaderRow extends CdkHeaderRow {}

/** Footer row template container. Bakes in hlmTr styling via hostDirectives. */
@Component({
  selector: 'll-footer-row, tr[ll-footer-row]',
  template: ROW_TEMPLATE,
  host: { role: 'row' },
  hostDirectives: [HlmTr],
  changeDetection: ChangeDetectionStrategy.Eager,
  encapsulation: ViewEncapsulation.None,
  exportAs: 'llFooterRow',
  providers: [{ provide: CdkFooterRow, useExisting: LlFooterRow }],
  imports: [CdkCellOutlet],
})
export class LlFooterRow extends CdkFooterRow {}

/** Data row template container. Bakes in hlmTr styling via hostDirectives. */
@Component({
  selector: 'll-row, tr[ll-row]',
  template: ROW_TEMPLATE,
  host: { role: 'row' },
  hostDirectives: [HlmTr],
  changeDetection: ChangeDetectionStrategy.Eager,
  encapsulation: ViewEncapsulation.None,
  exportAs: 'llRow',
  providers: [{ provide: CdkRow, useExisting: LlRow }],
  imports: [CdkCellOutlet],
})
export class LlRow extends CdkRow {}

/**
 * Row shown when there's no data. Mirrors MatNoDataRow: pushes plain global
 * CSS classes (defined in src/styles/style-nova.css) onto its generated
 * row/cell, since CdkTable adds these directly via classList, not through a
 * directive instance — the reactive `classes()` helper doesn't apply here.
 */
@Directive({
  selector: 'ng-template[llNoDataRow]',
  providers: [{ provide: CdkNoDataRow, useExisting: LlNoDataRow }],
})
export class LlNoDataRow extends CdkNoDataRow {
  override _cellSelector = 'td, ll-cell, [llCell]';

  constructor() {
    super();
    this._contentClassNames.push('spartan-table-row');
    this._cellClassNames.push('spartan-table-cell');
  }
}
