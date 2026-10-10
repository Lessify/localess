import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { MigrationService } from '@shared/services/migration.service';
import { MigrationComponent } from './migration.component';

describe('MigrationComponent', () => {
  function setup(createdAt: string | undefined) {
    const service = {
      status: vi.fn().mockReturnValue(of({ createdAt })),
      generate: vi.fn().mockReturnValue(of({ token: 'T'.repeat(40), createdAt: '2026-10-10T00:00:00.000Z' })),
      revoke: vi.fn().mockReturnValue(of(undefined)),
    };
    TestBed.overrideComponent(MigrationComponent, { set: { template: '<div></div>' } });
    TestBed.configureTestingModule({ providers: [{ provide: MigrationService, useValue: service }] });
    const fixture = TestBed.createComponent(MigrationComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance, service };
  }

  it('shows whether a token is configured', () => {
    expect(setup('2026-01-01T00:00:00.000Z').component.configuredAt()).toBe('2026-01-01T00:00:00.000Z');
    TestBed.resetTestingModule();
    expect(setup(undefined).component.configuredAt()).toBeUndefined();
  });

  it('shows a generated token once', () => {
    const { component } = setup(undefined);
    component.generate();
    expect(component.newToken()).toBe('T'.repeat(40));
    expect(component.configuredAt()).toBe('2026-10-10T00:00:00.000Z');
    component.dismissToken();
    expect(component.newToken()).toBeUndefined();
  });

  it('shows why generating or revoking failed instead of failing silently', () => {
    const { component, service } = setup(undefined);
    service.generate.mockReturnValue(throwError(() => ({ code: 'functions/permission-denied' })));
    component.generate();
    expect(component.error()).toBe('Only admins can manage the migration token.');
    expect(component.newToken()).toBeUndefined();
    service.revoke.mockReturnValue(throwError(() => new Error('offline')));
    component.revoke();
    expect(component.error()).toBe('The migration token could not be changed.');
  });

  it('explains that only admins see the token status when reading it is refused', () => {
    TestBed.overrideComponent(MigrationComponent, { set: { template: '<div></div>' } });
    TestBed.configureTestingModule({
      providers: [{ provide: MigrationService, useValue: { status: vi.fn().mockReturnValue(throwError(() => ({ code: 'permission-denied' }))) } }],
    });
    const fixture = TestBed.createComponent(MigrationComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.error()).toBe('Only admins can manage the migration token.');
  });

  it('revokes', () => {
    const { component, service } = setup('2026-01-01T00:00:00.000Z');
    component.revoke();
    expect(service.revoke).toHaveBeenCalled();
    expect(component.configuredAt()).toBeUndefined();
  });
});
