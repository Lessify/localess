import { NgModule } from '@angular/core';
import { AuthGuard, customClaims } from '@angular/fire/auth-guard';
import { RouterModule, Routes } from '@angular/router';
import { UserPermission } from '@shared/models/user.model';
import { pipe } from 'rxjs';
import { map } from 'rxjs/operators';
import { FeaturesComponent } from './features.component';

const ROLE_ADMIN = 'admin';
const ROLE_CUSTOM = 'custom';

// const hasRoleAdmin = () => {
//   return pipe(
//     customClaims,
//     map(claims => claims.role === ROLE_ADMIN)
//   );
// };

const hasPermissionUserManagement = () => {
  return pipe(
    customClaims,
    map(claims => {
      if (Array.isArray(claims)) {
        return false;
      } else if (claims['role'] && claims['role'] === ROLE_ADMIN) {
        return true;
      } else if (claims['role'] && claims['role'] === ROLE_CUSTOM && claims['permissions'] && Array.isArray(claims['permissions'])) {
        return claims['permissions']?.includes(UserPermission.USER_MANAGEMENT);
      } else {
        return false;
      }
    }),
  );
};

const hasPermissionSpaceManagement = () => {
  return pipe(
    customClaims,
    map(claims => {
      if (Array.isArray(claims)) {
        return false;
      } else if (claims['role'] && claims['role'] === ROLE_ADMIN) {
        return true;
      } else if (claims['role'] && claims['role'] === ROLE_CUSTOM && claims['permissions'] && Array.isArray(claims['permissions'])) {
        return claims['permissions']?.includes(UserPermission.SPACE_MANAGEMENT);
      } else {
        return false;
      }
    }),
  );
};

const hasPermissionSettingsManagement = () => {
  return pipe(
    customClaims,
    map(claims => {
      if (Array.isArray(claims)) {
        return false;
      } else if (claims['role'] && claims['role'] === ROLE_ADMIN) {
        return true;
      } else if (claims['role'] && claims['role'] === ROLE_CUSTOM && claims['permissions'] && Array.isArray(claims['permissions'])) {
        return claims['permissions']?.includes(UserPermission.SETTINGS_MANAGEMENT);
      } else {
        return false;
      }
    }),
  );
};

const hasPermissionTranslationRead = () => {
  return pipe(
    customClaims,
    map(claims => {
      if (Array.isArray(claims)) {
        return false;
      } else if (claims['role'] && claims['role'] === ROLE_ADMIN) {
        return true;
      } else if (claims['role'] && claims['role'] === ROLE_CUSTOM && claims['permissions'] && Array.isArray(claims['permissions'])) {
        return claims['permissions']?.includes(UserPermission.TRANSLATION_READ);
      } else {
        return false;
      }
    }),
  );
};

const hasPermissionSchemaRead = () => {
  return pipe(
    customClaims,
    map(claims => {
      if (Array.isArray(claims)) {
        return false;
      } else if (claims['role'] && claims['role'] === ROLE_ADMIN) {
        return true;
      } else if (claims['role'] && claims['role'] === ROLE_CUSTOM && claims['permissions'] && Array.isArray(claims['permissions'])) {
        return claims['permissions']?.includes(UserPermission.SCHEMA_READ);
      } else {
        return false;
      }
    }),
  );
};

const hasPermissionContentRead = () => {
  return pipe(
    customClaims,
    map(claims => {
      if (Array.isArray(claims)) {
        return false;
      } else if (claims['role'] && claims['role'] === ROLE_ADMIN) {
        return true;
      } else if (claims['role'] && claims['role'] === ROLE_CUSTOM && claims['permissions'] && Array.isArray(claims['permissions'])) {
        return claims['permissions']?.includes(UserPermission.CONTENT_READ);
      } else {
        return false;
      }
    }),
  );
};

const hasPermissionAssetRead = () => {
  return pipe(
    customClaims,
    map(claims => {
      if (Array.isArray(claims)) {
        return false;
      } else if (claims['role'] && claims['role'] === ROLE_ADMIN) {
        return true;
      } else if (claims['role'] && claims['role'] === ROLE_CUSTOM && claims['permissions'] && Array.isArray(claims['permissions'])) {
        return claims['permissions']?.includes(UserPermission.ASSET_READ);
      } else {
        return false;
      }
    }),
  );
};

const routes: Routes = [
  // {
  //   path: '',
  //   redirectTo: 'dashboard',
  //   pathMatch: 'full',
  // },
  {
    path: '',
    component: FeaturesComponent,
    children: [
      {
        path: 'me',
        title: 'Me',
        loadChildren: () => import('./me/me.module').then(m => m.MeModule),
      },
      {
        path: 'welcome',
        title: 'Welcome',
        loadComponent: () => import('./welcome/welcome.component').then(m => m.WelcomeComponent),
      },
      {
        path: 'spaces/:spaceId/dashboard',
        title: 'Dashboard',
        loadChildren: () => import('./spaces/dashboard/dashboard.module').then(m => m.DashboardModule),
      },
      {
        path: 'spaces/:spaceId/translations',
        title: 'Translations',
        loadChildren: () => import('./spaces/translations/translations.module').then(m => m.TranslationsModule),
        canActivate: [AuthGuard],
        data: {
          authGuardPipe: hasPermissionTranslationRead,
        },
      },
      {
        path: 'spaces/:spaceId/contents',
        title: 'Contents',
        loadChildren: () => import('./spaces/contents/contents.module').then(m => m.ContentsModule),
        canActivate: [AuthGuard],
        data: {
          authGuardPipe: hasPermissionContentRead,
        },
      },
      {
        path: 'spaces/:spaceId/assets',
        title: 'Assets',
        loadChildren: () => import('./spaces/assets/assets.module').then(m => m.AssetsModule),
        canActivate: [AuthGuard],
        data: {
          authGuardPipe: hasPermissionAssetRead,
        },
      },
      {
        path: 'spaces/:spaceId/schemas',
        title: 'Schemas',
        loadChildren: () => import('./spaces/schemas/schemas.module').then(m => m.SchemasModule),
        canActivate: [AuthGuard],
        data: {
          authGuardPipe: hasPermissionSchemaRead,
        },
      },
      {
        path: 'spaces/:spaceId/tasks',
        title: 'Tasks',
        loadChildren: () => import('./spaces/tasks/tasks.module').then(m => m.TasksModule),
        canActivate: [AuthGuard],
        data: {
          authGuardPipe: hasPermissionTranslationRead,
        },
      },
      {
        path: 'spaces/:spaceId/open-api',
        title: 'Open API',
        loadChildren: () => import('./spaces/open-api/open-api.module').then(m => m.OpenApiModule),
      },
      {
        path: 'spaces/:spaceId/settings',
        title: 'Settings',
        loadChildren: () => import('./spaces/settings/settings.module').then(m => m.SettingsModule),
        canActivate: [AuthGuard],
        data: {
          authGuardPipe: hasPermissionSpaceManagement,
        },
      },
      {
        path: 'admin/users',
        title: 'Users',
        loadChildren: () => import('./admin/users/users.module').then(m => m.UsersModule),
        canActivate: [AuthGuard],
        data: {
          authGuardPipe: hasPermissionUserManagement,
        },
      },
      {
        path: 'admin/spaces',
        title: 'Spaces',
        loadChildren: () => import('./admin/spaces/spaces.module').then(m => m.SpacesModule),
        canActivate: [AuthGuard],
        data: {
          authGuardPipe: hasPermissionSpaceManagement,
        },
      },
      {
        path: 'admin/settings',
        title: 'Settings',
        loadChildren: () => import('./admin/settings/settings.module').then(m => m.SettingsModule),
        canActivate: [AuthGuard],
        data: {
          authGuardPipe: hasPermissionSettingsManagement,
        },
      },
      {
        path: 'plugins',
        title: 'Plugins',
        loadChildren: () => import('./plugins/plugins.module').then(m => m.PluginsModule),
        canActivate: [AuthGuard],
        data: {
          authGuardPipe: hasPermissionSpaceManagement,
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
