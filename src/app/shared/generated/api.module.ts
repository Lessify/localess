/* tslint:disable */
/* eslint-disable */
import { NgModule, ModuleWithProviders, SkipSelf, Optional } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ApiConfiguration, ApiConfigurationParams } from './api-configuration';

import { MetaService } from './services/meta.service';
import { SecurityAdvisoriesService } from './services/security-advisories.service';
import { AppsService } from './services/apps.service';
import { ClassroomService } from './services/classroom.service';
import { CodesOfConductService } from './services/codes-of-conduct.service';
import { EmojisService } from './services/emojis.service';
import { DependabotService } from './services/dependabot.service';
import { SecretScanningService } from './services/secret-scanning.service';
import { ActivityService } from './services/activity.service';
import { GistsService } from './services/gists.service';
import { GitignoreService } from './services/gitignore.service';
import { IssuesService } from './services/issues.service';
import { LicensesService } from './services/licenses.service';
import { MarkdownService } from './services/markdown.service';
import { OrgsService } from './services/orgs.service';
import { ActionsService } from './services/actions.service';
import { OidcService } from './services/oidc.service';
import { CodeScanningService } from './services/code-scanning.service';
import { CodespacesService } from './services/codespaces.service';
import { CopilotService } from './services/copilot.service';
import { PackagesService } from './services/packages.service';
import { InteractionsService } from './services/interactions.service';
import { MigrationsService } from './services/migrations.service';
import { ProjectsService } from './services/projects.service';
import { ReposService } from './services/repos.service';
import { BillingService } from './services/billing.service';
import { TeamsService } from './services/teams.service';
import { ReactionsService } from './services/reactions.service';
import { RateLimitService } from './services/rate-limit.service';
import { ChecksService } from './services/checks.service';
import { DependencyGraphService } from './services/dependency-graph.service';
import { GitService } from './services/git.service';
import { PullsService } from './services/pulls.service';
import { SearchService } from './services/search.service';
import { UsersService } from './services/users.service';

/**
 * Module that provides all services and configuration.
 */
@NgModule({
  imports: [],
  exports: [],
  declarations: [],
  providers: [
    MetaService,
    SecurityAdvisoriesService,
    AppsService,
    ClassroomService,
    CodesOfConductService,
    EmojisService,
    DependabotService,
    SecretScanningService,
    ActivityService,
    GistsService,
    GitignoreService,
    IssuesService,
    LicensesService,
    MarkdownService,
    OrgsService,
    ActionsService,
    OidcService,
    CodeScanningService,
    CodespacesService,
    CopilotService,
    PackagesService,
    InteractionsService,
    MigrationsService,
    ProjectsService,
    ReposService,
    BillingService,
    TeamsService,
    ReactionsService,
    RateLimitService,
    ChecksService,
    DependencyGraphService,
    GitService,
    PullsService,
    SearchService,
    UsersService,
    ApiConfiguration
  ],
})
export class ApiModule {
  static forRoot(params: ApiConfigurationParams): ModuleWithProviders<ApiModule> {
    return {
      ngModule: ApiModule,
      providers: [
        {
          provide: ApiConfiguration,
          useValue: params
        }
      ]
    }
  }

  constructor( 
    @Optional() @SkipSelf() parentModule: ApiModule,
    @Optional() http: HttpClient
  ) {
    if (parentModule) {
      throw new Error('ApiModule is already loaded. Import in your base AppModule only.');
    }
    if (!http) {
      throw new Error('You need to import the HttpClientModule in your AppModule! \n' +
      'See also https://github.com/angular/angular/issues/20575');
    }
  }
}
