import { Injectable } from '@angular/core';
import { Observable, share } from 'rxjs';

/** A server change event (see apps/server/src/events). `entity: '*'` means "anything may have changed". */
export interface ChangeEvent {
  spaceId: string | null;
  entity: string;
  id?: string;
  op: 'created' | 'updated' | 'deleted';
}

/** Emitted after the stream reconnects: events sent while disconnected are lost, so everything refetches. */
export const RESYNC_EVENT: ChangeEvent = { spaceId: null, entity: '*', op: 'updated' };

/**
 * Server-sent change events (`GET /api/app/events`), replacing Firestore realtime listeners. One
 * EventSource per space (or one global), shared by every subscriber and closed with the last one.
 */
@Injectable({ providedIn: 'root' })
export class ChangeEventsService {
  private readonly streams = new Map<string, Observable<ChangeEvent>>();

  /** Events of `spaceId` plus global ones; every event when `spaceId` is undefined. */
  changes(spaceId?: string): Observable<ChangeEvent> {
    const key = spaceId ?? '';
    let stream = this.streams.get(key);
    if (!stream) {
      stream = new Observable<ChangeEvent>(subscriber => {
        if (typeof EventSource === 'undefined') return undefined;
        const source = new EventSource(spaceId ? `/api/app/events?spaceId=${encodeURIComponent(spaceId)}` : '/api/app/events');
        let opened = false;
        source.onopen = () => {
          if (opened) subscriber.next(RESYNC_EVENT);
          opened = true;
        };
        source.addEventListener('change', message => {
          try {
            const event = JSON.parse((message as MessageEvent<string>).data) as ChangeEvent;
            subscriber.next(event);
          } catch {
            // ignore malformed events
          }
        });
        return () => source.close();
      }).pipe(share({ resetOnRefCountZero: true }));
      this.streams.set(key, stream);
    }
    return stream;
  }
}
