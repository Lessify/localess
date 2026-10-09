export interface DirtyFormGuardComponent {
  get isFormDirty(): boolean;
}

export function isFormDirtyGuard<T extends DirtyFormGuardComponent>(component: T): boolean {
  if (component.isFormDirty) {
    return window.confirm('You have unsaved changes. Do you really want to leave?');
  }
  return true;
}
