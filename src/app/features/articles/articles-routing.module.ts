import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {ArticlesComponent} from './articles.component';
import {ArticleContentEditComponent} from './article-content-edit/article-content-edit.component';

const routes: Routes = [
  {
    path: '',
    component: ArticlesComponent
  },
  {
    path: ':id',
    component: ArticleContentEditComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ArticlesRoutingModule {}
