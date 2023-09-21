export interface CustomSnackBarModel {
  message: string;
  actions?: ActionRoute[];
}

export interface ActionRoute {
  label: string;
  link: string;
}
