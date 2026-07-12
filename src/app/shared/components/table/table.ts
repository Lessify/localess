import {
  CDK_TABLE,
  CdkTable,
  DataRowOutlet,
  FooterRowOutlet,
  HeaderRowOutlet,
  NoDataRowOutlet,
  STICKY_POSITIONING_LISTENER,
} from '@angular/cdk/table';
import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';
import { HlmTable, HlmTBody, HlmTFoot, HlmTHead } from '@spartan-ng/helm/table';

/**
 * The ll-table component. Mirrors MatTable, extending CdkTable directly and
 * authoring its own <thead>/<tbody>/<tfoot> so hlmTHead/hlmTBody/hlmTFoot can
 * be applied (impossible when using a bare `<table cdk-table>`, whose own
 * internal template generates those sections opaquely).
 */
@Component({
  selector: 'll-table, table[ll-table]',
  exportAs: 'llTable',
  template: `
    <ng-content select="caption" />
    <ng-content select="colgroup, col" />
    <thead hlmTHead role="rowgroup">
      <ng-container headerRowOutlet></ng-container>
    </thead>
    <tbody hlmTBody role="rowgroup">
      <ng-container rowOutlet></ng-container>
      <ng-container noDataRowOutlet></ng-container>
    </tbody>
    <tfoot hlmTFoot role="rowgroup">
      <ng-container footerRowOutlet></ng-container>
    </tfoot>
  `,
  hostDirectives: [HlmTable],
  providers: [
    { provide: CdkTable, useExisting: LlTable },
    { provide: CDK_TABLE, useExisting: LlTable },
    { provide: STICKY_POSITIONING_LISTENER, useValue: null },
  ],
  encapsulation: ViewEncapsulation.None,
  // CDK's own note (see CdkTable / MatTable source): the table needs Angular's
  // default change-detection timing to reliably catch structural changes —
  // OnPush is deliberately NOT used here, unlike every other component in this app.
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [HeaderRowOutlet, DataRowOutlet, NoDataRowOutlet, FooterRowOutlet, HlmTHead, HlmTBody, HlmTFoot],
})
export class LlTable<T> extends CdkTable<T> {}
