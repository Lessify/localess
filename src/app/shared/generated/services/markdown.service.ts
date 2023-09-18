/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { BaseService } from '../base-service';
import { ApiConfiguration } from '../api-configuration';
import { StrictHttpResponse } from '../strict-http-response';

import { markdownRender } from '../fn/markdown/markdown-render';
import { MarkdownRender$Params } from '../fn/markdown/markdown-render';
import { markdownRenderRaw$Plain } from '../fn/markdown/markdown-render-raw-plain';
import { MarkdownRenderRaw$Plain$Params } from '../fn/markdown/markdown-render-raw-plain';
import { markdownRenderRaw$XMarkdown } from '../fn/markdown/markdown-render-raw-x-markdown';
import { MarkdownRenderRaw$XMarkdown$Params } from '../fn/markdown/markdown-render-raw-x-markdown';


/**
 * Render GitHub flavored markdown
 */
@Injectable({ providedIn: 'root' })
export class MarkdownService extends BaseService {
  constructor(config: ApiConfiguration, http: HttpClient) {
    super(config, http);
  }

  /** Path part for operation `markdownRender()` */
  static readonly MarkdownRenderPath = '/markdown';

  /**
   * Render a Markdown document.
   *
   *
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `markdownRender()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  markdownRender$Response(params: MarkdownRender$Params, context?: HttpContext): Observable<StrictHttpResponse<string>> {
    return markdownRender(this.http, this.rootUrl, params, context);
  }

  /**
   * Render a Markdown document.
   *
   *
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `markdownRender$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  markdownRender(params: MarkdownRender$Params, context?: HttpContext): Observable<string> {
    return this.markdownRender$Response(params, context).pipe(
      map((r: StrictHttpResponse<string>): string => r.body)
    );
  }

  /** Path part for operation `markdownRenderRaw()` */
  static readonly MarkdownRenderRawPath = '/markdown/raw';

  /**
   * Render a Markdown document in raw mode.
   *
   * You must send Markdown as plain text (using a `Content-Type` header of `text/plain` or `text/x-markdown`) to this endpoint, rather than using JSON format. In raw mode, [GitHub Flavored Markdown](https://github.github.com/gfm/) is not supported and Markdown will be rendered in plain format like a README.md file. Markdown content must be 400 KB or less.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `markdownRenderRaw$Plain()` instead.
   *
   * This method sends `text/plain` and handles request body of type `text/plain`.
   */
  markdownRenderRaw$Plain$Response(params?: MarkdownRenderRaw$Plain$Params, context?: HttpContext): Observable<StrictHttpResponse<string>> {
    return markdownRenderRaw$Plain(this.http, this.rootUrl, params, context);
  }

  /**
   * Render a Markdown document in raw mode.
   *
   * You must send Markdown as plain text (using a `Content-Type` header of `text/plain` or `text/x-markdown`) to this endpoint, rather than using JSON format. In raw mode, [GitHub Flavored Markdown](https://github.github.com/gfm/) is not supported and Markdown will be rendered in plain format like a README.md file. Markdown content must be 400 KB or less.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `markdownRenderRaw$Plain$Response()` instead.
   *
   * This method sends `text/plain` and handles request body of type `text/plain`.
   */
  markdownRenderRaw$Plain(params?: MarkdownRenderRaw$Plain$Params, context?: HttpContext): Observable<string> {
    return this.markdownRenderRaw$Plain$Response(params, context).pipe(
      map((r: StrictHttpResponse<string>): string => r.body)
    );
  }

  /**
   * Render a Markdown document in raw mode.
   *
   * You must send Markdown as plain text (using a `Content-Type` header of `text/plain` or `text/x-markdown`) to this endpoint, rather than using JSON format. In raw mode, [GitHub Flavored Markdown](https://github.github.com/gfm/) is not supported and Markdown will be rendered in plain format like a README.md file. Markdown content must be 400 KB or less.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `markdownRenderRaw$XMarkdown()` instead.
   *
   * This method sends `text/x-markdown` and handles request body of type `text/x-markdown`.
   */
  markdownRenderRaw$XMarkdown$Response(params?: MarkdownRenderRaw$XMarkdown$Params, context?: HttpContext): Observable<StrictHttpResponse<string>> {
    return markdownRenderRaw$XMarkdown(this.http, this.rootUrl, params, context);
  }

  /**
   * Render a Markdown document in raw mode.
   *
   * You must send Markdown as plain text (using a `Content-Type` header of `text/plain` or `text/x-markdown`) to this endpoint, rather than using JSON format. In raw mode, [GitHub Flavored Markdown](https://github.github.com/gfm/) is not supported and Markdown will be rendered in plain format like a README.md file. Markdown content must be 400 KB or less.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `markdownRenderRaw$XMarkdown$Response()` instead.
   *
   * This method sends `text/x-markdown` and handles request body of type `text/x-markdown`.
   */
  markdownRenderRaw$XMarkdown(params?: MarkdownRenderRaw$XMarkdown$Params, context?: HttpContext): Observable<string> {
    return this.markdownRenderRaw$XMarkdown$Response(params, context).pipe(
      map((r: StrictHttpResponse<string>): string => r.body)
    );
  }

}
