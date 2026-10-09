import { TestBed } from '@angular/core/testing';
import { DIALOG_DATA } from '@angular/cdk/dialog';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { UnsplashPhoto } from '@shared/models/unsplash-plugin.model';
import { UnsplashPluginService } from '@shared/services/unsplash-plugin.service';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { UnsplashAssetsSelectDialogContext } from './unsplash-assets-select-dialog.model';
import { UnsplashAssetsSelectDialogComponent } from './unsplash-assets-select-dialog.component';

function photo(id: string): UnsplashPhoto {
  return { id } as unknown as UnsplashPhoto;
}

describe('UnsplashAssetsSelectDialogComponent', () => {
  function setup(context: UnsplashAssetsSelectDialogContext) {
    const close = vi.fn();
    const random = vi.fn().mockReturnValue(of({ results: [photo('p1')], limit: 50, remaining: 49 }));
    const search = vi.fn().mockReturnValue(of({ results: [photo('p2')], limit: 50, remaining: 48, total: 1, total_pages: 1 }));

    TestBed.overrideComponent(UnsplashAssetsSelectDialogComponent, { set: { template: '<div></div>' } });
    TestBed.configureTestingModule({
      providers: [
        { provide: DIALOG_DATA, useValue: context },
        { provide: BrnDialogRef, useValue: { close } },
        { provide: UnsplashPluginService, useValue: { random, search } },
      ],
    });
    const fixture = TestBed.createComponent(UnsplashAssetsSelectDialogComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance, close, random, search };
  }

  it('loads a random set of photos on init', () => {
    const { component, random } = setup({ spaceId: 'space-1' });

    expect(random).toHaveBeenCalled();
    expect(component.assets()).toEqual([photo('p1')]);
    expect(component.limit()).toBe(50);
    expect(component.remaining()).toBe(49);
    expect(component.isLoading()).toBe(false);
  });

  it('search() replaces the assets and updates pagination state for the first page', () => {
    const { component, search } = setup({ spaceId: 'space-1' });

    component.search('cats');

    expect(search).toHaveBeenCalledWith({ query: 'cats', orientation: undefined, page: undefined });
    expect(component.assets()).toEqual([photo('p2')]);
    expect(component.total()).toBe(1);
    expect(component.totalPages()).toBe(1);
    expect(component.currentPage()).toBe(1);
    expect(component.showLoadMore()).toBe(false);
    expect(component.isLoading()).toBe(false);
  });

  it('search() appends results and enables load-more when there are further pages', () => {
    const { component, search } = setup({ spaceId: 'space-1' });
    search.mockReturnValue(of({ results: [photo('p3')], limit: 50, remaining: 47, total: 10, total_pages: 3 }));

    component.search('cats', 2);

    expect(component.assets()).toEqual([photo('p1'), photo('p3')]);
    expect(component.currentPage()).toBe(2);
    expect(component.showLoadMore()).toBe(true);
  });

  it('search() does nothing for a blank search term', () => {
    const { component, search } = setup({ spaceId: 'space-1' });

    component.search('');

    expect(search).not.toHaveBeenCalled();
  });
});
