import { Routes } from '@angular/router';
import { guestGuard } from '@core/guards/guest.guard';

import { AuthComponent } from './auth.component';
import { LoginComponent } from './login/login.component';
import { ResetComponent } from './reset/reset.component';
import { ResetConfirmComponent } from './reset-confirm/reset-confirm.component';

export const routs: Routes = [
  {
    path: '',
    component: AuthComponent,
    children: [
      {
        path: 'login',
        title: 'Login',
        component: LoginComponent,
        canActivate: [guestGuard],
      },
      {
        path: 'reset',
        title: 'Forgot Password',
        component: ResetComponent,
      },
      {
        path: 'reset/confirm',
        title: 'New Password',
        component: ResetConfirmComponent,
      },
    ],
  },
];
