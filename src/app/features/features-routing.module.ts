import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FeaturesComponent } from './features.component';
import { AngularFireAuthGuard, customClaims, redirectUnauthorizedTo } from '@angular/fire/compat/auth-guard';
import { pipe } from 'rxjs';
import { map } from 'rxjs/operators';

const adminOnly = () =>
  pipe(
    customClaims,
    map((claims) => claims.role === 'admin')
  );

const routes: Routes = [
  {
    path: '',
    component: FeaturesComponent,
    // children: [
    //   {
    //     path: 'products',
    //     loadChildren: () => import('./products/products.module').then((m) => m.ProductsModule),
    //     canActivate: [AngularFireAuthGuard],
    //     data: {
    //       authGuardPipe: adminOnly
    //     }
    //   },
    //   {
    //     path: 'variant-attributes',
    //     loadChildren: () =>
    //       import('./variant-attributes/variant-attributes.module').then((m) => m.VariantAttributesModule),
    //     canActivate: [AngularFireAuthGuard],
    //     data: {
    //       authGuardPipe: adminOnly
    //     }
    //   },
    //   {
    //     path: 'categories',
    //     loadChildren: () => import('./categories/categories.module').then((m) => m.CategoriesModule),
    //     canActivate: [AngularFireAuthGuard],
    //     data: {
    //       authGuardPipe: adminOnly
    //     }
    //   },
    //   {
    //     path: 'settings',
    //     loadChildren: () => import('./settings/settings.module').then((m) => m.SettingsModule)
    //   }
    // ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FeaturesRoutingModule {}
