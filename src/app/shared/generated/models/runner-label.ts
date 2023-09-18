/* tslint:disable */
/* eslint-disable */

/**
 * A label for a self hosted runner
 */
export interface RunnerLabel {

  /**
   * Unique identifier of the label.
   */
  id?: number;

  /**
   * Name of the label.
   */
  name: string;

  /**
   * The type of label. Read-only labels are applied automatically when the runner is configured.
   */
  type?: 'read-only' | 'custom';
}
