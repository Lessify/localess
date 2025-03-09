import { NgModule } from '@angular/core';
import { MarkdownModule } from 'ngx-markdown';
import { ContentsRoutingModule } from './contents-routing.module';

@NgModule({
  declarations: [],
  imports: [ContentsRoutingModule, MarkdownModule.forChild()],
  providers: [],
})
export class ContentsModule {}
