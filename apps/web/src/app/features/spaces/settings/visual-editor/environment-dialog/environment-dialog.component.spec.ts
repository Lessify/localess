import { DIALOG_DATA } from '@angular/cdk/dialog';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { vi } from 'vitest';

import { EnvironmentDialogComponent } from './environment-dialog.component';
import { EnvironmentDialogContext } from './environment-dialog.model';

let close: ReturnType<typeof vi.fn>;

async function setup(context: EnvironmentDialogContext | null) {
  close = vi.fn();
  await TestBed.configureTestingModule({
    imports: [EnvironmentDialogComponent],
    providers: [
      { provide: DIALOG_DATA, useValue: context },
      { provide: BrnDialogRef, useValue: { close } },
    ],
  }).compileComponents();
  const fixture: ComponentFixture<EnvironmentDialogComponent> = TestBed.createComponent(EnvironmentDialogComponent);
  fixture.detectChanges();
  return fixture;
}

describe('EnvironmentDialogComponent', () => {
  it('starts empty and invalid when adding', async () => {
    const fixture = await setup(null);

    expect(fixture.componentInstance.form.value).toEqual({ name: '', url: '' });
    expect(fixture.componentInstance.form.valid).toBe(false);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Add Environment');
  });

  it('patches the environment when editing', async () => {
    const fixture = await setup({ name: 'Prod', url: 'https://prod.example.com/' });

    expect(fixture.componentInstance.form.value).toEqual({ name: 'Prod', url: 'https://prod.example.com/' });
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Edit Environment');
  });

  it('refuses URLs that are not absolute http(s)', async () => {
    const fixture = await setup(null);
    fixture.componentInstance.form.patchValue({ name: 'Bad', url: 'javascript:alert(1)' });

    expect(fixture.componentInstance.form.valid).toBe(false);
  });

  it('exampleUrl() shows what an environment URL opens for the sample document', async () => {
    const fixture = await setup(null);

    expect(fixture.componentInstance.exampleUrl('https://site.com/')).toBe('https://site.com/de/blog/hello');
    expect(fixture.componentInstance.exampleUrl('https://site.com/{locale/}news/{slug}/')).toBe('https://site.com/de/news/hello/');
  });

  it('closes with the name and URL when saved', async () => {
    const fixture = await setup(null);
    fixture.componentInstance.form.patchValue({ name: 'Prod', url: 'https://prod.example.com/' });

    fixture.componentInstance.save();

    expect(close).toHaveBeenCalledWith({ name: 'Prod', url: 'https://prod.example.com/' });
  });
});
