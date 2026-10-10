import { ClipboardModule } from '@angular/cdk/clipboard';
import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MigrationService } from '@shared/services/migration.service';
import { HlmButtonImports } from '@spartan-ng/helm/button';

@Component({
  selector: 'll-admin-settings-migration',
  templateUrl: './migration.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ClipboardModule, DatePipe, HlmButtonImports],
})
export class MigrationComponent implements OnInit {
  private readonly migration = inject(MigrationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly configuredAt = signal<string | undefined>(undefined);
  /** Shown once after generating; never stored in the app. */
  readonly newToken = signal<string | undefined>(undefined);
  readonly error = signal<string | undefined>(undefined);

  ngOnInit(): void {
    this.migration
      .status()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: it => this.configuredAt.set(it.createdAt),
        // configs/migration is readable by admins only.
        error: () => this.error.set('Only admins can manage the migration token.'),
      });
  }

  generate(): void {
    this.error.set(undefined);
    this.migration.generate().subscribe({
      next: it => {
        this.newToken.set(it.token);
        this.configuredAt.set(it.createdAt);
      },
      error: err => this.fail(err),
    });
  }

  revoke(): void {
    this.error.set(undefined);
    this.migration.revoke().subscribe({ next: () => this.configuredAt.set(undefined), error: err => this.fail(err) });
  }

  private fail(err: unknown): void {
    const denied = (err as { code?: string } | undefined)?.code === 'functions/permission-denied';
    this.error.set(denied ? 'Only admins can manage the migration token.' : 'The migration token could not be changed.');
  }

  dismissToken(): void {
    this.newToken.set(undefined);
  }
}
