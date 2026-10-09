import { CdkCell, CdkCellDef, CdkColumnDef, CdkFooterCell, CdkFooterCellDef, CdkHeaderCell, CdkHeaderCellDef } from '@angular/cdk/table';
import { Directive, Input } from '@angular/core';
import { HlmTd, HlmTh } from '@spartan-ng/helm/table';

/** Cell definition for the ll-table. Mirrors MatCellDef. */
@Directive({
  selector: '[llCellDef]',
  providers: [{ provide: CdkCellDef, useExisting: LlCellDef }],
})
export class LlCellDef extends CdkCellDef {}

/** Header cell definition for the ll-table. Mirrors MatHeaderCellDef. */
@Directive({
  selector: '[llHeaderCellDef]',
  providers: [{ provide: CdkHeaderCellDef, useExisting: LlHeaderCellDef }],
})
export class LlHeaderCellDef extends CdkHeaderCellDef {}

/** Footer cell definition for the ll-table. Mirrors MatFooterCellDef. */
@Directive({
  selector: '[llFooterCellDef]',
  providers: [{ provide: CdkFooterCellDef, useExisting: LlFooterCellDef }],
})
export class LlFooterCellDef extends CdkFooterCellDef {}

/**
 * Column definition for the ll-table. Mirrors MatColumnDef, pushing an
 * ll-column-<name> class. Also accepts `llColumnDefClass`, a class list
 * applied to both the header cell and data cell for this column — CDK's
 * `BaseCdkCell` applies every class in `_columnCssClassName` to whichever
 * cell it constructs (`classList.add(...columnDef._columnCssClassName)`),
 * so pushing the extra classes there is what fans them out to both `<th>`
 * and `<td>` without repeating `class="..."` on each.
 */
@Directive({
  selector: '[llColumnDef]',
  providers: [{ provide: CdkColumnDef, useExisting: LlColumnDef }],
})
export class LlColumnDef extends CdkColumnDef {
  @Input('llColumnDef')
  override get name(): string {
    return this._name;
  }
  override set name(name: string) {
    this._setNameInput(name);
  }

  @Input()
  set llColumnDefClass(value: string) {
    this._class = value;
    this._updateColumnCssClassName();
  }
  get llColumnDefClass(): string {
    return this._class;
  }
  private _class = '';

  protected override _updateColumnCssClassName(): void {
    super._updateColumnCssClassName();
    this._columnCssClassName!.push(`ll-column-${this.cssClassFriendlyName}`);
    if (this._class) {
      this._columnCssClassName!.push(...this._class.split(/\s+/).filter(Boolean));
    }
  }
}

/**
 * Header cell template container. Bakes in hlmTh styling via hostDirectives.
 * Also sets an opaque background — CDK's StickyStyler pins individual cells
 * (not the row) for sticky headers in native-table mode, so once scrolled,
 * the row's own box (and its background) moves out of view while the cell
 * stays pinned; without its own background, the cell would show the
 * scrolling body rows through it.
 */
@Directive({
  selector: 'll-header-cell, th[llHeaderCell]',
  host: { role: 'columnheader', class: 'bg-background' },
  hostDirectives: [HlmTh],
})
export class LlHeaderCell extends CdkHeaderCell {}

/** Footer cell template container. Bakes in hlmTd styling via hostDirectives. */
@Directive({
  selector: 'll-footer-cell, td[llFooterCell]',
  hostDirectives: [HlmTd],
})
export class LlFooterCell extends CdkFooterCell {}

/** Cell template container. Bakes in hlmTd styling via hostDirectives. */
@Directive({
  selector: 'll-cell, td[llCell]',
  host: {
    class: 'overflow-hidden truncate',
  },
  hostDirectives: [HlmTd],
})
export class LlCell extends CdkCell {}
