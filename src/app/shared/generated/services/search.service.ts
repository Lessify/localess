/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { BaseService } from '../base-service';
import { ApiConfiguration } from '../api-configuration';
import { StrictHttpResponse } from '../strict-http-response';

import { CodeSearchResultItem } from '../models/code-search-result-item';
import { CommitSearchResultItem } from '../models/commit-search-result-item';
import { IssueSearchResultItem } from '../models/issue-search-result-item';
import { LabelSearchResultItem } from '../models/label-search-result-item';
import { RepoSearchResultItem } from '../models/repo-search-result-item';
import { searchCode } from '../fn/search/search-code';
import { SearchCode$Params } from '../fn/search/search-code';
import { searchCommits } from '../fn/search/search-commits';
import { SearchCommits$Params } from '../fn/search/search-commits';
import { searchIssuesAndPullRequests } from '../fn/search/search-issues-and-pull-requests';
import { SearchIssuesAndPullRequests$Params } from '../fn/search/search-issues-and-pull-requests';
import { searchLabels } from '../fn/search/search-labels';
import { SearchLabels$Params } from '../fn/search/search-labels';
import { searchRepos } from '../fn/search/search-repos';
import { SearchRepos$Params } from '../fn/search/search-repos';
import { searchTopics } from '../fn/search/search-topics';
import { SearchTopics$Params } from '../fn/search/search-topics';
import { searchUsers } from '../fn/search/search-users';
import { SearchUsers$Params } from '../fn/search/search-users';
import { TopicSearchResultItem } from '../models/topic-search-result-item';
import { UserSearchResultItem } from '../models/user-search-result-item';


/**
 * Look for stuff on GitHub.
 */
@Injectable({ providedIn: 'root' })
export class SearchService extends BaseService {
  constructor(config: ApiConfiguration, http: HttpClient) {
    super(config, http);
  }

  /** Path part for operation `searchCode()` */
  static readonly SearchCodePath = '/search/code';

  /**
   * Search code.
   *
   * Searches for query terms inside of a file. This method returns up to 100 results [per page](https://docs.github.com/rest/overview/resources-in-the-rest-api#pagination).
   *
   * When searching for code, you can get text match metadata for the file **content** and file **path** fields when you pass the `text-match` media type. For more details about how to receive highlighted search results, see [Text match metadata](https://docs.github.com/rest/search/search#text-match-metadata).
   *
   * For example, if you want to find the definition of the `addClass` function inside [jQuery](https://github.com/jquery/jquery) repository, your query would look something like this:
   *
   * `q=addClass+in:file+language:js+repo:jquery/jquery`
   *
   * This query searches for the keyword `addClass` within a file's contents. The query limits the search to files where the language is JavaScript in the `jquery/jquery` repository.
   *
   * Considerations for code search:
   *
   * Due to the complexity of searching code, there are a few restrictions on how searches are performed:
   *
   * *   Only the _default branch_ is considered. In most cases, this will be the `master` branch.
   * *   Only files smaller than 384 KB are searchable.
   * *   You must always include at least one search term when searching source code. For example, searching for [`language:go`](https://github.com/search?utf8=%E2%9C%93&q=language%3Ago&type=Code) is not valid, while [`amazing
   * language:go`](https://github.com/search?utf8=%E2%9C%93&q=amazing+language%3Ago&type=Code) is.
   *
   * This endpoint requires you to authenticate and limits you to 10 requests per minute.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `searchCode()` instead.
   *
   * This method doesn't expect any request body.
   */
  searchCode$Response(params: SearchCode$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'total_count': number;
'incomplete_results': boolean;
'items': Array<CodeSearchResultItem>;
}>> {
    return searchCode(this.http, this.rootUrl, params, context);
  }

  /**
   * Search code.
   *
   * Searches for query terms inside of a file. This method returns up to 100 results [per page](https://docs.github.com/rest/overview/resources-in-the-rest-api#pagination).
   *
   * When searching for code, you can get text match metadata for the file **content** and file **path** fields when you pass the `text-match` media type. For more details about how to receive highlighted search results, see [Text match metadata](https://docs.github.com/rest/search/search#text-match-metadata).
   *
   * For example, if you want to find the definition of the `addClass` function inside [jQuery](https://github.com/jquery/jquery) repository, your query would look something like this:
   *
   * `q=addClass+in:file+language:js+repo:jquery/jquery`
   *
   * This query searches for the keyword `addClass` within a file's contents. The query limits the search to files where the language is JavaScript in the `jquery/jquery` repository.
   *
   * Considerations for code search:
   *
   * Due to the complexity of searching code, there are a few restrictions on how searches are performed:
   *
   * *   Only the _default branch_ is considered. In most cases, this will be the `master` branch.
   * *   Only files smaller than 384 KB are searchable.
   * *   You must always include at least one search term when searching source code. For example, searching for [`language:go`](https://github.com/search?utf8=%E2%9C%93&q=language%3Ago&type=Code) is not valid, while [`amazing
   * language:go`](https://github.com/search?utf8=%E2%9C%93&q=amazing+language%3Ago&type=Code) is.
   *
   * This endpoint requires you to authenticate and limits you to 10 requests per minute.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `searchCode$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  searchCode(params: SearchCode$Params, context?: HttpContext): Observable<{
'total_count': number;
'incomplete_results': boolean;
'items': Array<CodeSearchResultItem>;
}> {
    return this.searchCode$Response(params, context).pipe(
      map((r: StrictHttpResponse<{
'total_count': number;
'incomplete_results': boolean;
'items': Array<CodeSearchResultItem>;
}>): {
'total_count': number;
'incomplete_results': boolean;
'items': Array<CodeSearchResultItem>;
} => r.body)
    );
  }

  /** Path part for operation `searchCommits()` */
  static readonly SearchCommitsPath = '/search/commits';

  /**
   * Search commits.
   *
   * Find commits via various criteria on the default branch (usually `main`). This method returns up to 100 results [per page](https://docs.github.com/rest/overview/resources-in-the-rest-api#pagination).
   *
   * When searching for commits, you can get text match metadata for the **message** field when you provide the `text-match` media type. For more details about how to receive highlighted search results, see [Text match
   * metadata](https://docs.github.com/rest/search/search#text-match-metadata).
   *
   * For example, if you want to find commits related to CSS in the [octocat/Spoon-Knife](https://github.com/octocat/Spoon-Knife) repository. Your query would look something like this:
   *
   * `q=repo:octocat/Spoon-Knife+css`
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `searchCommits()` instead.
   *
   * This method doesn't expect any request body.
   */
  searchCommits$Response(params: SearchCommits$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'total_count': number;
'incomplete_results': boolean;
'items': Array<CommitSearchResultItem>;
}>> {
    return searchCommits(this.http, this.rootUrl, params, context);
  }

  /**
   * Search commits.
   *
   * Find commits via various criteria on the default branch (usually `main`). This method returns up to 100 results [per page](https://docs.github.com/rest/overview/resources-in-the-rest-api#pagination).
   *
   * When searching for commits, you can get text match metadata for the **message** field when you provide the `text-match` media type. For more details about how to receive highlighted search results, see [Text match
   * metadata](https://docs.github.com/rest/search/search#text-match-metadata).
   *
   * For example, if you want to find commits related to CSS in the [octocat/Spoon-Knife](https://github.com/octocat/Spoon-Knife) repository. Your query would look something like this:
   *
   * `q=repo:octocat/Spoon-Knife+css`
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `searchCommits$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  searchCommits(params: SearchCommits$Params, context?: HttpContext): Observable<{
'total_count': number;
'incomplete_results': boolean;
'items': Array<CommitSearchResultItem>;
}> {
    return this.searchCommits$Response(params, context).pipe(
      map((r: StrictHttpResponse<{
'total_count': number;
'incomplete_results': boolean;
'items': Array<CommitSearchResultItem>;
}>): {
'total_count': number;
'incomplete_results': boolean;
'items': Array<CommitSearchResultItem>;
} => r.body)
    );
  }

  /** Path part for operation `searchIssuesAndPullRequests()` */
  static readonly SearchIssuesAndPullRequestsPath = '/search/issues';

  /**
   * Search issues and pull requests.
   *
   * Find issues by state and keyword. This method returns up to 100 results [per page](https://docs.github.com/rest/overview/resources-in-the-rest-api#pagination).
   *
   * When searching for issues, you can get text match metadata for the issue **title**, issue **body**, and issue **comment body** fields when you pass the `text-match` media type. For more details about how to receive highlighted
   * search results, see [Text match metadata](https://docs.github.com/rest/search/search#text-match-metadata).
   *
   * For example, if you want to find the oldest unresolved Python bugs on Windows. Your query might look something like this.
   *
   * `q=windows+label:bug+language:python+state:open&sort=created&order=asc`
   *
   * This query searches for the keyword `windows`, within any open issue that is labeled as `bug`. The search runs across repositories whose primary language is Python. The results are sorted by creation date in ascending order, which means the oldest issues appear first in the search results.
   *
   * **Note:** For requests made by GitHub Apps with a user access token, you can't retrieve a combination of issues and pull requests in a single query. Requests that don't include the `is:issue` or `is:pull-request` qualifier will receive an HTTP `422 Unprocessable Entity` response. To get results for both issues and pull requests, you must send separate queries for issues and pull requests. For more information about the `is` qualifier, see "[Searching only issues or pull requests](https://docs.github.com/github/searching-for-information-on-github/searching-issues-and-pull-requests#search-only-issues-or-pull-requests)."
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `searchIssuesAndPullRequests()` instead.
   *
   * This method doesn't expect any request body.
   */
  searchIssuesAndPullRequests$Response(params: SearchIssuesAndPullRequests$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'total_count': number;
'incomplete_results': boolean;
'items': Array<IssueSearchResultItem>;
}>> {
    return searchIssuesAndPullRequests(this.http, this.rootUrl, params, context);
  }

  /**
   * Search issues and pull requests.
   *
   * Find issues by state and keyword. This method returns up to 100 results [per page](https://docs.github.com/rest/overview/resources-in-the-rest-api#pagination).
   *
   * When searching for issues, you can get text match metadata for the issue **title**, issue **body**, and issue **comment body** fields when you pass the `text-match` media type. For more details about how to receive highlighted
   * search results, see [Text match metadata](https://docs.github.com/rest/search/search#text-match-metadata).
   *
   * For example, if you want to find the oldest unresolved Python bugs on Windows. Your query might look something like this.
   *
   * `q=windows+label:bug+language:python+state:open&sort=created&order=asc`
   *
   * This query searches for the keyword `windows`, within any open issue that is labeled as `bug`. The search runs across repositories whose primary language is Python. The results are sorted by creation date in ascending order, which means the oldest issues appear first in the search results.
   *
   * **Note:** For requests made by GitHub Apps with a user access token, you can't retrieve a combination of issues and pull requests in a single query. Requests that don't include the `is:issue` or `is:pull-request` qualifier will receive an HTTP `422 Unprocessable Entity` response. To get results for both issues and pull requests, you must send separate queries for issues and pull requests. For more information about the `is` qualifier, see "[Searching only issues or pull requests](https://docs.github.com/github/searching-for-information-on-github/searching-issues-and-pull-requests#search-only-issues-or-pull-requests)."
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `searchIssuesAndPullRequests$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  searchIssuesAndPullRequests(params: SearchIssuesAndPullRequests$Params, context?: HttpContext): Observable<{
'total_count': number;
'incomplete_results': boolean;
'items': Array<IssueSearchResultItem>;
}> {
    return this.searchIssuesAndPullRequests$Response(params, context).pipe(
      map((r: StrictHttpResponse<{
'total_count': number;
'incomplete_results': boolean;
'items': Array<IssueSearchResultItem>;
}>): {
'total_count': number;
'incomplete_results': boolean;
'items': Array<IssueSearchResultItem>;
} => r.body)
    );
  }

  /** Path part for operation `searchLabels()` */
  static readonly SearchLabelsPath = '/search/labels';

  /**
   * Search labels.
   *
   * Find labels in a repository with names or descriptions that match search keywords. Returns up to 100 results [per page](https://docs.github.com/rest/overview/resources-in-the-rest-api#pagination).
   *
   * When searching for labels, you can get text match metadata for the label **name** and **description** fields when you pass the `text-match` media type. For more details about how to receive highlighted search results, see [Text match metadata](https://docs.github.com/rest/search/search#text-match-metadata).
   *
   * For example, if you want to find labels in the `linguist` repository that match `bug`, `defect`, or `enhancement`. Your query might look like this:
   *
   * `q=bug+defect+enhancement&repository_id=64778136`
   *
   * The labels that best match the query appear first in the search results.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `searchLabels()` instead.
   *
   * This method doesn't expect any request body.
   */
  searchLabels$Response(params: SearchLabels$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'total_count': number;
'incomplete_results': boolean;
'items': Array<LabelSearchResultItem>;
}>> {
    return searchLabels(this.http, this.rootUrl, params, context);
  }

  /**
   * Search labels.
   *
   * Find labels in a repository with names or descriptions that match search keywords. Returns up to 100 results [per page](https://docs.github.com/rest/overview/resources-in-the-rest-api#pagination).
   *
   * When searching for labels, you can get text match metadata for the label **name** and **description** fields when you pass the `text-match` media type. For more details about how to receive highlighted search results, see [Text match metadata](https://docs.github.com/rest/search/search#text-match-metadata).
   *
   * For example, if you want to find labels in the `linguist` repository that match `bug`, `defect`, or `enhancement`. Your query might look like this:
   *
   * `q=bug+defect+enhancement&repository_id=64778136`
   *
   * The labels that best match the query appear first in the search results.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `searchLabels$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  searchLabels(params: SearchLabels$Params, context?: HttpContext): Observable<{
'total_count': number;
'incomplete_results': boolean;
'items': Array<LabelSearchResultItem>;
}> {
    return this.searchLabels$Response(params, context).pipe(
      map((r: StrictHttpResponse<{
'total_count': number;
'incomplete_results': boolean;
'items': Array<LabelSearchResultItem>;
}>): {
'total_count': number;
'incomplete_results': boolean;
'items': Array<LabelSearchResultItem>;
} => r.body)
    );
  }

  /** Path part for operation `searchRepos()` */
  static readonly SearchReposPath = '/search/repositories';

  /**
   * Search repositories.
   *
   * Find repositories via various criteria. This method returns up to 100 results [per page](https://docs.github.com/rest/overview/resources-in-the-rest-api#pagination).
   *
   * When searching for repositories, you can get text match metadata for the **name** and **description** fields when you pass the `text-match` media type. For more details about how to receive highlighted search results, see [Text match metadata](https://docs.github.com/rest/search/search#text-match-metadata).
   *
   * For example, if you want to search for popular Tetris repositories written in assembly code, your query might look like this:
   *
   * `q=tetris+language:assembly&sort=stars&order=desc`
   *
   * This query searches for repositories with the word `tetris` in the name, the description, or the README. The results are limited to repositories where the primary language is assembly. The results are sorted by stars in descending order, so that the most popular repositories appear first in the search results.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `searchRepos()` instead.
   *
   * This method doesn't expect any request body.
   */
  searchRepos$Response(params: SearchRepos$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'total_count': number;
'incomplete_results': boolean;
'items': Array<RepoSearchResultItem>;
}>> {
    return searchRepos(this.http, this.rootUrl, params, context);
  }

  /**
   * Search repositories.
   *
   * Find repositories via various criteria. This method returns up to 100 results [per page](https://docs.github.com/rest/overview/resources-in-the-rest-api#pagination).
   *
   * When searching for repositories, you can get text match metadata for the **name** and **description** fields when you pass the `text-match` media type. For more details about how to receive highlighted search results, see [Text match metadata](https://docs.github.com/rest/search/search#text-match-metadata).
   *
   * For example, if you want to search for popular Tetris repositories written in assembly code, your query might look like this:
   *
   * `q=tetris+language:assembly&sort=stars&order=desc`
   *
   * This query searches for repositories with the word `tetris` in the name, the description, or the README. The results are limited to repositories where the primary language is assembly. The results are sorted by stars in descending order, so that the most popular repositories appear first in the search results.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `searchRepos$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  searchRepos(params: SearchRepos$Params, context?: HttpContext): Observable<{
'total_count': number;
'incomplete_results': boolean;
'items': Array<RepoSearchResultItem>;
}> {
    return this.searchRepos$Response(params, context).pipe(
      map((r: StrictHttpResponse<{
'total_count': number;
'incomplete_results': boolean;
'items': Array<RepoSearchResultItem>;
}>): {
'total_count': number;
'incomplete_results': boolean;
'items': Array<RepoSearchResultItem>;
} => r.body)
    );
  }

  /** Path part for operation `searchTopics()` */
  static readonly SearchTopicsPath = '/search/topics';

  /**
   * Search topics.
   *
   * Find topics via various criteria. Results are sorted by best match. This method returns up to 100 results [per page](https://docs.github.com/rest/overview/resources-in-the-rest-api#pagination). See "[Searching topics](https://docs.github.com/articles/searching-topics/)" for a detailed list of qualifiers.
   *
   * When searching for topics, you can get text match metadata for the topic's **short\_description**, **description**, **name**, or **display\_name** field when you pass the `text-match` media type. For more details about how to receive highlighted search results, see [Text match metadata](https://docs.github.com/rest/search/search#text-match-metadata).
   *
   * For example, if you want to search for topics related to Ruby that are featured on https://github.com/topics. Your query might look like this:
   *
   * `q=ruby+is:featured`
   *
   * This query searches for topics with the keyword `ruby` and limits the results to find only topics that are featured. The topics that are the best match for the query appear first in the search results.
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `searchTopics()` instead.
   *
   * This method doesn't expect any request body.
   */
  searchTopics$Response(params: SearchTopics$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'total_count': number;
'incomplete_results': boolean;
'items': Array<TopicSearchResultItem>;
}>> {
    return searchTopics(this.http, this.rootUrl, params, context);
  }

  /**
   * Search topics.
   *
   * Find topics via various criteria. Results are sorted by best match. This method returns up to 100 results [per page](https://docs.github.com/rest/overview/resources-in-the-rest-api#pagination). See "[Searching topics](https://docs.github.com/articles/searching-topics/)" for a detailed list of qualifiers.
   *
   * When searching for topics, you can get text match metadata for the topic's **short\_description**, **description**, **name**, or **display\_name** field when you pass the `text-match` media type. For more details about how to receive highlighted search results, see [Text match metadata](https://docs.github.com/rest/search/search#text-match-metadata).
   *
   * For example, if you want to search for topics related to Ruby that are featured on https://github.com/topics. Your query might look like this:
   *
   * `q=ruby+is:featured`
   *
   * This query searches for topics with the keyword `ruby` and limits the results to find only topics that are featured. The topics that are the best match for the query appear first in the search results.
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `searchTopics$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  searchTopics(params: SearchTopics$Params, context?: HttpContext): Observable<{
'total_count': number;
'incomplete_results': boolean;
'items': Array<TopicSearchResultItem>;
}> {
    return this.searchTopics$Response(params, context).pipe(
      map((r: StrictHttpResponse<{
'total_count': number;
'incomplete_results': boolean;
'items': Array<TopicSearchResultItem>;
}>): {
'total_count': number;
'incomplete_results': boolean;
'items': Array<TopicSearchResultItem>;
} => r.body)
    );
  }

  /** Path part for operation `searchUsers()` */
  static readonly SearchUsersPath = '/search/users';

  /**
   * Search users.
   *
   * Find users via various criteria. This method returns up to 100 results [per page](https://docs.github.com/rest/overview/resources-in-the-rest-api#pagination).
   *
   * When searching for users, you can get text match metadata for the issue **login**, public **email**, and **name** fields when you pass the `text-match` media type. For more details about highlighting search results, see [Text match metadata](https://docs.github.com/rest/search/search#text-match-metadata). For more details about how to receive highlighted search results, see [Text match metadata](https://docs.github.com/rest/search/search#text-match-metadata).
   *
   * For example, if you're looking for a list of popular users, you might try this query:
   *
   * `q=tom+repos:%3E42+followers:%3E1000`
   *
   * This query searches for users with the name `tom`. The results are restricted to users with more than 42 repositories and over 1,000 followers.
   *
   * This endpoint does not accept authentication and will only include publicly visible users. As an alternative, you can use the GraphQL API. The GraphQL API requires authentication and will return private users, including Enterprise Managed Users (EMUs), that you are authorized to view. For more information, see "[GraphQL Queries](https://docs.github.com/graphql/reference/queries#search)."
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `searchUsers()` instead.
   *
   * This method doesn't expect any request body.
   */
  searchUsers$Response(params: SearchUsers$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'total_count': number;
'incomplete_results': boolean;
'items': Array<UserSearchResultItem>;
}>> {
    return searchUsers(this.http, this.rootUrl, params, context);
  }

  /**
   * Search users.
   *
   * Find users via various criteria. This method returns up to 100 results [per page](https://docs.github.com/rest/overview/resources-in-the-rest-api#pagination).
   *
   * When searching for users, you can get text match metadata for the issue **login**, public **email**, and **name** fields when you pass the `text-match` media type. For more details about highlighting search results, see [Text match metadata](https://docs.github.com/rest/search/search#text-match-metadata). For more details about how to receive highlighted search results, see [Text match metadata](https://docs.github.com/rest/search/search#text-match-metadata).
   *
   * For example, if you're looking for a list of popular users, you might try this query:
   *
   * `q=tom+repos:%3E42+followers:%3E1000`
   *
   * This query searches for users with the name `tom`. The results are restricted to users with more than 42 repositories and over 1,000 followers.
   *
   * This endpoint does not accept authentication and will only include publicly visible users. As an alternative, you can use the GraphQL API. The GraphQL API requires authentication and will return private users, including Enterprise Managed Users (EMUs), that you are authorized to view. For more information, see "[GraphQL Queries](https://docs.github.com/graphql/reference/queries#search)."
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `searchUsers$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  searchUsers(params: SearchUsers$Params, context?: HttpContext): Observable<{
'total_count': number;
'incomplete_results': boolean;
'items': Array<UserSearchResultItem>;
}> {
    return this.searchUsers$Response(params, context).pipe(
      map((r: StrictHttpResponse<{
'total_count': number;
'incomplete_results': boolean;
'items': Array<UserSearchResultItem>;
}>): {
'total_count': number;
'incomplete_results': boolean;
'items': Array<UserSearchResultItem>;
} => r.body)
    );
  }

}
