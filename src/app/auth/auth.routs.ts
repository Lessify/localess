import { Routes } from '@angular/router';

import { AuthComponent } from './auth.component';
import { LoginComponent } from './login/login.component';
import { ResetComponent } from './reset/reset.component';

export const routs: Routes = [
  {
    path: '',
    component: AuthComponent,
    children: [
      {
        path: 'login',
        title: 'Login',
        component: LoginComponent,
      },
      {
        path: 'reset',
        title: 'Forgot Password',
        component: ResetComponent,
      },
    ],
  },
];
