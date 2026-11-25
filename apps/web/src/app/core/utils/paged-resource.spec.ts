import { HttpParams } from '@angular/common/http';
import { Injector, runInInjectionContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NotificationService } from '@core/services/notification.service';
import type { Page } from '@localess/shared';
import { Observable, Subject } from 'rxjs';
import { vi } from 'vitest';

import { PagedList } from './paged-list';
import { pagedResource } from './paged-resource';

/** Lets the resource take what the stream sent (it resolves through a promise), then runs the effects. */
const settle = async () => {
  TestBed.tick();
  await new Promise(resolve => setTimeout(resolve));
  TestBed.tick();
};

const pageOf = (items: string[], page = 0, total = items.length): Page<string> => ({ items, page, size: 20, total });

describe('pagedResource', () => {
  function setup() {
    const error = vi.fn();
    TestBed.configureTestingModule({ providers: [{ provide: NotificationService, useValue: { error } }] });
    const list = new PagedList(20);
    const requests: { params: string; answer: Subject<Page<string>>; cancelled: boolean }[] = [];
    const load = (params: HttpParams) => {
      const request = { params: params.toString(), answer: new Subject<Page<string>>(), cancelled: false };
      requests.push(request);
      return new Observable<Page<string>>(subscriber => {
        const subscription = request.answer.subscribe(subscriber);
        return () => {
          request.cancelled = true;
          subscription.unsubscribe();
        };
      });
    };
    const resource = runInInjectionContext(TestBed.inject(Injector), () => pagedResource({ list, load, error: 'Can not be loaded.' }));
    TestBed.tick();
    return { list, requests, resource, error };
  }

  it('asks once for the query, and shows the page with its total', async () => {
    const { requests, resource } = setup();

    expect(requests.map(it => it.params)).toEqual(['page=0&size=20']);
    expect(resource.loading()).toBe(true);
    requests[0].answer.next(pageOf(['a', 'b'], 0, 25));
    await settle();

    expect(resource.items()).toEqual(['a', 'b']);
    expect(resource.total()).toBe(25);
    expect(resource.loading()).toBe(false);
  });

  it('asks again for a new query, keeping the previous page shown until the new one comes', async () => {
    const { list, requests, resource } = setup();
    requests[0].answer.next(pageOf(['a']));
    await settle();

    list.setFilters({ search: 'x' });
    await settle();

    expect(requests.map(it => it.params)).toEqual(['page=0&size=20', 'page=0&size=20&search=x']);
    expect(requests[0].cancelled).toBe(true);
    expect(resource.loading()).toBe(true);
    expect(resource.items()).toEqual(['a']);
    requests[1].answer.next(pageOf(['x']));
    await settle();
    expect(resource.items()).toEqual(['x']);
  });

  it('shows each new page a live read sends for the same query', async () => {
    const { requests, resource } = setup();
    requests[0].answer.next(pageOf(['a']));
    requests[0].answer.next(pageOf(['a', 'b']));
    await settle();

    expect(resource.items()).toEqual(['a', 'b']);
    expect(requests).toHaveLength(1);
  });

  it('tells a failed load, keeping the previous page', async () => {
    const { list, requests, resource, error } = setup();
    requests[0].answer.next(pageOf(['a']));
    await settle();

    list.setFilters({ search: 'x' });
    await settle();
    requests[1].answer.error(new Error('down'));
    await settle();

    expect(error).toHaveBeenCalledWith('Can not be loaded.');
    expect(resource.items()).toEqual(['a']);
    expect(resource.loading()).toBe(false);
  });

  it('moves to the last page there is when the page asked for is past the end', async () => {
    const { list, requests } = setup();
    list.page.set(5);
    await settle();

    requests[1].answer.next(pageOf([], 5, 45));
    await settle();

    expect(list.page()).toBe(2);
    expect(requests.at(-1)?.params).toBe('page=2&size=20');
  });
});
