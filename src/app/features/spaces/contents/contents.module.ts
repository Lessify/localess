import { NgModule } from '@angular/core';
import { provideMarkdown } from 'ngx-markdown';

import { ContentsRoutingModule } from './contents-routing.module';

@NgModule({
  declarations: [],
  imports: [ContentsRoutingModule],
  // MarkdownService has no `providedIn`, so it has to be provided explicitly. Keeping it here
  // rather than in the root providers is what stops `marked` from landing in the initial bundle -
  // `<markdown>` is only ever rendered by the markdown editor, which lives under this route.
  providers: [provideMarkdown()],
})
export class ContentsModule {}
