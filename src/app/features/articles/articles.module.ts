import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';

import {SharedModule} from '@shared/shared.module';
import {ArticlesComponent} from './articles.component';
import {ArticlesRoutingModule} from './articles-routing.module';
import {SpaceService} from '@shared/services/space.service';
import {SchematicService} from '@shared/services/schematic.service';
import {ArticleService} from '@shared/services/article.service';
import {ArticleAddDialogComponent} from './article-add-dialog/article-add-dialog.component';
import {ArticleEditDialogComponent} from './article-edit-dialog/article-edit-dialog.component';
import {
  ArticleContentEditComponent
} from './article-content-edit/article-content-edit.component';

@NgModule({
  declarations: [ArticlesComponent, ArticleAddDialogComponent, ArticleEditDialogComponent, ArticleContentEditComponent],
  imports: [CommonModule, SharedModule, ArticlesRoutingModule],
  providers: [SpaceService, SchematicService, ArticleService]
})
export class ArticlesModule {
}
