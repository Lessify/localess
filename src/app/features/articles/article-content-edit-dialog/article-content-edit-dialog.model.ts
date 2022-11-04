import {Article} from '@shared/models/article.model';
import {Schematic} from '@shared/models/schematic.model';

export interface ArticleContentEditDialogModel {
  article: Article;
  schematic: Schematic
}
