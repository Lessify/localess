export interface TranslationNode {
  name: string;
  key: string;
  children?: TranslationNode[];
}
