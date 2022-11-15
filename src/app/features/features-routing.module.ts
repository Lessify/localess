import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {FeaturesComponent} from './features.component';
import {AuthGuard, customClaims} from '@angular/fire/auth-guard';
import {pipe} from 'rxjs';
import {map} from 'rxjs/operators';

const ROLE_READ = 'read'
const ROLE_EDIT = 'edit'
const ROLE_WRITE = 'write'
const ROLE_ADMIN = 'admin'

const hasRoleAdmin = () =>
  pipe(
    customClaims,
    map((claims) => claims.role === ROLE_ADMIN)
  );

const hasRoleWrite = () =>
  pipe(
    customClaims,
    map((claims) => [ROLE_WRITE, ROLE_ADMIN].includes(claims.role))
  );

const hasRoleRead = () =>
  pipe(
    customClaims,
    map((claims) => [ROLE_READ, ROLE_EDIT, ROLE_WRITE, ROLE_ADMIN].includes(claims.role))
  );

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
          authGuardPipe: hasRoleAdmin
        }
      },
      {
        path: 'spaces',
        title: 'Spaces',
        loadChildren: () => import('./spaces/spaces.module').then(m => m.SpacesModule),
        canActivate: [AuthGuard],
        data: {
          authGuardPipe: hasRoleAdmin
        }
      },
      {
        path: 'translations',
        title: 'Translations',
        loadChildren: () => import('./translations/translations.module').then(m => m.TranslationsModule),
        canActivate: [AuthGuard],
        data: {
          authGuardPipe: hasRoleRead
        }
      },
      {
        path: 'locales',
        title: 'Locales',
        loadChildren: () => import('./locales/locales.module').then(m => m.LocalesModule),
        canActivate: [AuthGuard],
        data: {
          authGuardPipe: hasRoleAdmin
        }
      },
      {
        path: 'schematics',
        title: 'Schematics',
        loadChildren: () => import('./schematics/schematics.module').then(m => m.SchematicsModule),
        canActivate: [AuthGuard],
        data: {
          authGuardPipe: hasRoleAdmin
        }
      },
      {
        path: 'pages',
        title: 'Pages',
        loadChildren: () => import('./pages/pages.module').then(m => m.PagesModule),
        canActivate: [AuthGuard],
        data: {
          authGuardPipe: hasRoleRead
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
