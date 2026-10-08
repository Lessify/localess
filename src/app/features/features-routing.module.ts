import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { permissionGuard } from '@shared/guards/permission.guard';
import { spaceSelectionGuard } from '@shared/guards/space-selection.guard';
import { BreadcrumbItem } from '@shared/models/breadcrumb.model';
import { UserPermission } from '@shared/models/user.model';

import { FeaturesComponent } from './features.component';

const routes: Routes = [
  {
    path: '',
    component: FeaturesComponent,
    children: [
      // Without this, /features renders the shell around an empty outlet. The setup wizard used to
      // hide that by navigating to /features/welcome itself; it no longer exists.
      {
        path: '',
        redirectTo: 'welcome',
        pathMatch: 'full',
      },
      {
        path: 'me',
        title: 'Me',
        loadChildren: () => import('./me/me.module').then(m => m.MeModule),
      },
      {
        path: 'welcome',
        title: 'Welcome',
        loadComponent: () => import('./welcome/welcome.component').then(m => m.WelcomeComponent),
        data: {
          breadcrumb: {
            label: 'Welcome',
            route: '/welcome',
          } satisfies BreadcrumbItem,
        },
      },
      {
        // Componentless on purpose: the child routes inherit `spaceId` from it, which is how their
        // components receive it as an input.
        path: 'spaces/:spaceId',
        canActivate: [spaceSelectionGuard],
        children: [
          {
            path: '',
            redirectTo: 'dashboard',
            pathMatch: 'full',
          },
          {
            path: 'dashboard',
            title: 'Dashboard',
            loadChildren: () => import('./spaces/dashboard/dashboard.module').then(m => m.DashboardModule),
          },
          {
            path: 'translations',
            title: 'Translations',
            loadChildren: () => import('./spaces/translations/translations.module').then(m => m.TranslationsModule),
            canActivate: [permissionGuard(UserPermission.TRANSLATION_READ)],
            data: {
              breadcrumb: {
                label: 'Translations',
                helpUrl: 'https://localess.org/docs/translations',
              } satisfies BreadcrumbItem,
            },
          },
          {
            path: 'contents',
            title: 'Contents',
            loadChildren: () => import('./spaces/contents/contents.module').then(m => m.ContentsModule),
            canActivate: [permissionGuard(UserPermission.CONTENT_READ)],
            data: {
              breadcrumb: {
                label: 'Contents',
                helpUrl: 'https://localess.org/docs/content',
              } satisfies BreadcrumbItem,
            },
          },
          {
            path: 'assets',
            title: 'Assets',
            loadChildren: () => import('./spaces/assets/assets.module').then(m => m.AssetsModule),
            canActivate: [permissionGuard(UserPermission.ASSET_READ)],
            data: {
              breadcrumb: {
                label: 'Assets',
                helpUrl: 'https://localess.org/docs/assets',
              } satisfies BreadcrumbItem,
            },
          },
          {
            path: 'schemas',
            title: 'Schemas',
            loadChildren: () => import('./spaces/schemas/schemas.module').then(m => m.SchemasModule),
            canActivate: [permissionGuard(UserPermission.SCHEMA_READ)],
            data: {
              breadcrumb: {
                label: 'Schemas',
                helpUrl: 'https://localess.org/docs/schemas',
              } satisfies BreadcrumbItem,
            },
          },
          {
            path: 'tasks',
            title: 'Tasks',
            loadChildren: () => import('./spaces/tasks/tasks.module').then(m => m.TasksModule),
            canActivate: [
              permissionGuard(
                UserPermission.ASSET_EXPORT,
                UserPermission.ASSET_IMPORT,
                UserPermission.CONTENT_EXPORT,
                UserPermission.CONTENT_IMPORT,
                UserPermission.SCHEMA_EXPORT,
                UserPermission.SCHEMA_IMPORT,
                UserPermission.TRANSLATION_EXPORT,
                UserPermission.TRANSLATION_IMPORT,
              ),
            ],
            data: {
              breadcrumb: {
                label: 'Tasks',
              } satisfies BreadcrumbItem,
            },
          },
          {
            path: 'developers',
            title: 'Developers',
            loadChildren: () => import('./spaces/developers/developers.module').then(m => m.DevelopersModule),
            data: {
              breadcrumb: {
                label: 'Developers',
              } satisfies BreadcrumbItem,
            },
          },
          {
            path: 'settings',
            title: 'Settings',
            loadChildren: () => import('./spaces/settings/settings.module').then(m => m.SettingsModule),
            canActivate: [permissionGuard(UserPermission.SPACE_MANAGEMENT)],
            data: {
              breadcrumb: {
                label: 'Settings',
              } satisfies BreadcrumbItem,
            },
          },
        ],
      },
      {
        path: 'admin/users',
        title: 'Users',
        loadChildren: () => import('./admin/users/users.module').then(m => m.UsersModule),
        canActivate: [permissionGuard(UserPermission.USER_MANAGEMENT)],
        data: {
          breadcrumb: {
            label: 'Users',
          } satisfies BreadcrumbItem,
        },
      },
      {
        path: 'admin/spaces',
        title: 'Spaces',
        loadChildren: () => import('./admin/spaces/spaces.module').then(m => m.SpacesModule),
        canActivate: [permissionGuard(UserPermission.SPACE_MANAGEMENT)],
        data: {
          breadcrumb: {
            label: 'Spaces',
          } satisfies BreadcrumbItem,
        },
      },
      {
        path: 'admin/settings',
        title: 'Settings',
        loadChildren: () => import('./admin/settings/settings.module').then(m => m.SettingsModule),
        canActivate: [permissionGuard(UserPermission.SETTINGS_MANAGEMENT)],
        data: {
          breadcrumb: {
            label: 'Settings',
          } satisfies BreadcrumbItem,
        },
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class FeaturesRoutingModule {}
