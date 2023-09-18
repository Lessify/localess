/* tslint:disable */
/* eslint-disable */

/**
 * A description of the machine powering a codespace.
 */
export interface CodespaceMachine {

  /**
   * How many cores are available to the codespace.
   */
  cpus: number;

  /**
   * The display name of the machine includes cores, memory, and storage.
   */
  display_name: string;

  /**
   * How much memory is available to the codespace.
   */
  memory_in_bytes: number;

  /**
   * The name of the machine.
   */
  name: string;

  /**
   * The operating system of the machine.
   */
  operating_system: string;

  /**
   * Whether a prebuild is currently available when creating a codespace for this machine and repository. If a branch was not specified as a ref, the default branch will be assumed. Value will be "null" if prebuilds are not supported or prebuild availability could not be determined. Value will be "none" if no prebuild is available. Latest values "ready" and "in_progress" indicate the prebuild availability status.
   */
  prebuild_availability: null | 'none' | 'ready' | 'in_progress';

  /**
   * How much storage is available to the codespace.
   */
  storage_in_bytes: number;
}
