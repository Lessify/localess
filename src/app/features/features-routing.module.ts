import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {FeaturesComponent} from './features.component';
import {AuthGuard, customClaims} from '@angular/fire/auth-guard';
import {pipe} from 'rxjs';
import {map} from 'rxjs/operators';
import {UserPermission} from '@shared/models/user.model';

const ROLE_ADMIN = 'admin'
const ROLE_CUSTOM = 'custom'

const hasRoleAdmin = () => {
  console.log('hasRoleAdmin')
  return pipe(
    customClaims,
    map((claims) => claims.role === ROLE_ADMIN)
  )
};

const hasPermissionUserManagement = () => {
  console.log('hasPermissionUserManagement')
  return pipe(
    customClaims,
    map((claims) => claims.role === ROLE_CUSTOM && claims.permissions?.includes(UserPermission.USER_MANAGEMENT) || false)
  )
};

const hasPermissionSpaceManagement = () => {
  console.log('hasPermissionSpaceManagement')
  return pipe(
    customClaims,
    map((claims) => claims.role === ROLE_CUSTOM && claims.permissions?.includes(UserPermission.SPACE_MANAGEMENT) || false)
  )
};

const hasPermissionTranslationRead = () => {
  console.log('hasPermissionTranslationRead')
  return pipe(
    customClaims,
    map((claims) => claims.role === ROLE_CUSTOM && claims.permissions?.includes(UserPermission.TRANSLATION_READ) || false)
  )
};

const hasPermissionSchemaRead = () => {
  console.log('hasPermissionSchemaRead')
  return pipe(
    customClaims,
    map((claims) => claims.role === ROLE_CUSTOM && claims.permissions?.includes(UserPermission.SCHEMATIC_READ) || false)
  )
};

const hasPermissionContentRead = () => {
  console.log('hasPermissionContentRead')
  return pipe(
    customClaims,
    map((claims) => claims.role === ROLE_CUSTOM && claims.permissions?.includes(UserPermission.CONTENT_READ) || false)
  )
};

const routes: Routes = [
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
        path: 'users',
        title: 'Users',
        loadChildren: () => import('./users/users.module').then(m => m.UsersModule),
        canActivate: [AuthGuard],
        data: {
          authGuardPipe: hasRoleAdmin || hasPermissionUserManagement
        }
      },
      {
        path: 'spaces',
        title: 'Spaces',
        loadChildren: () => import('./spaces/spaces.module').then(m => m.SpacesModule),
        canActivate: [AuthGuard],
        data: {
          authGuardPipe: hasRoleAdmin || hasPermissionSpaceManagement
        }
      },
      {
        path: 'translations',
        title: 'Translations',
        loadChildren: () => import('./translations/translations.module').then(m => m.TranslationsModule),
        canActivate: [AuthGuard],
        data: {
          authGuardPipe: hasRoleAdmin || hasPermissionTranslationRead
        }
      },
      {
        path: 'locales',
        title: 'Locales',
        loadChildren: () => import('./locales/locales.module').then(m => m.LocalesModule),
        canActivate: [AuthGuard],
        data: {
          authGuardPipe: hasRoleAdmin || hasPermissionSpaceManagement
        }
      },
      {
        path: 'schematics',
        title: 'Schematics',
        loadChildren: () => import('./schematics/schematics.module').then(m => m.SchematicsModule),
        canActivate: [AuthGuard],
        data: {
          authGuardPipe: hasRoleAdmin || hasPermissionSchemaRead
        }
      },
      {
        path: 'pages',
        title: 'Pages',
        loadChildren: () => import('./pages/pages.module').then(m => m.PagesModule),
        canActivate: [AuthGuard],
        data: {
          authGuardPipe: hasRoleAdmin || hasPermissionContentRead
        }
      },
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FeaturesRoutingModule {
}
