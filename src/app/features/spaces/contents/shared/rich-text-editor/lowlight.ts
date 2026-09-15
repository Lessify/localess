import bash from 'highlight.js/lib/languages/bash';
import csharp from 'highlight.js/lib/languages/csharp';
import css from 'highlight.js/lib/languages/css';
import go from 'highlight.js/lib/languages/go';
import java from 'highlight.js/lib/languages/java';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import markdown from 'highlight.js/lib/languages/markdown';
import php from 'highlight.js/lib/languages/php';
import python from 'highlight.js/lib/languages/python';
import ruby from 'highlight.js/lib/languages/ruby';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';
import { createLowlight } from 'lowlight';

/**
 * Grammars the rich text editor highlights inside code blocks.
 *
 * lowlight's `common` export registers 37 grammars and costs ~145kB in the contents chunk, most
 * of it languages that never appear in CMS content - arduino alone is 10kB. Registering an
 * explicit set keeps the editor proportional to what authors actually write. A language that is
 * not registered still renders, just without highlighting.
 *
 * `xml` covers HTML, and highlight.js aliases the usual short names (js, ts, sh, yml, py, rb, cs).
 */
export const RICH_TEXT_LANGUAGES = {
  bash,
  csharp,
  css,
  go,
  java,
  javascript,
  json,
  markdown,
  php,
  python,
  ruby,
  typescript,
  xml,
  yaml,
};

/** Builds a lowlight instance limited to {@link RICH_TEXT_LANGUAGES}. */
export function createRichTextLowlight() {
  return createLowlight(RICH_TEXT_LANGUAGES);
}
