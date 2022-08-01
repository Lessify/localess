import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {FeaturesComponent} from './features.component';
import {AuthGuard, customClaims} from '@angular/fire/auth-guard';
import {pipe} from 'rxjs';
import {map} from 'rxjs/operators';

const ROLE_READ = 'read'
const ROLE_WRITE = 'write'
const ROLE_ADMIN = 'admin'

const hasRoleAdmin = () =>
  pipe(
    customClaims,
    map((claims) => claims.role === ROLE_ADMIN)
  );

const hasAnyRole = (roles: string[]) =>
  pipe(
    customClaims,
    map((claims) => {
      debugger
      roles.includes(claims.role)
    })
  );

const routes: Routes = [
  {
    path: '',
    component: FeaturesComponent,
    children: [
      {
        path: 'spaces',
        loadChildren: () => import('./spaces/spaces.module').then(m => m.SpacesModule),
        canActivate: [AuthGuard],
        data: {
          authGuardPipe: hasRoleAdmin
        }
      },
      {
        path: 'translations',
        loadChildren: () => import('./translations/translations.module').then(m => m.TranslationsModule),
        // canActivate: [AuthGuard],
        // data: {
        //   authGuardPipe: hasAnyRole([ROLE_READ, ROLE_WRITE, ROLE_ADMIN])
        // }
      },
      {
        path: 'locales',
        loadChildren: () => import('./locales/locales.module').then(m => m.LocalesModule),
        canActivate: [AuthGuard],
        // data: {
        //   authGuardPipe: hasAnyRole([ROLE_WRITE, ROLE_ADMIN])
        // }
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
