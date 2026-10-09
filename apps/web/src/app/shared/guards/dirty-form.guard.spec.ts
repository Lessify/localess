import { DirtyFormGuardComponent, isFormDirtyGuard } from './dirty-form.guard';

describe('isFormDirtyGuard', () => {
  let originalConfirm: typeof window.confirm;

  beforeEach(() => {
    originalConfirm = window.confirm;
  });

  afterEach(() => {
    window.confirm = originalConfirm;
  });

  function fakeComponent(isFormDirty: boolean): DirtyFormGuardComponent {
    return { isFormDirty };
  }

  it('allows navigation without prompting when the form is not dirty', () => {
    window.confirm = () => {
      throw new Error('confirm should not be called when the form is clean');
    };

    expect(isFormDirtyGuard(fakeComponent(false))).toBe(true);
  });

  it('prompts for confirmation when the form is dirty, and allows navigation if confirmed', () => {
    window.confirm = () => true;

    expect(isFormDirtyGuard(fakeComponent(true))).toBe(true);
  });

  it('prompts for confirmation when the form is dirty, and blocks navigation if declined', () => {
    window.confirm = () => false;

    expect(isFormDirtyGuard(fakeComponent(true))).toBe(false);
  });
});
