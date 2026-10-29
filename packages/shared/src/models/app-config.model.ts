/** The colors an instance label can take (the badge variants of the UI). */
export const INSTANCE_COLORS = ['primary', 'secondary', 'outline', 'destructive'] as const;
export type InstanceColor = (typeof INSTANCE_COLORS)[number];

/**
 * The label that tells installations apart (for example production and test), from `LOCALESS_INSTANCE_NAME` and
 * `LOCALESS_INSTANCE_COLOR`: deployment configuration, so a database copied from one installation to another keeps the
 * label of the installation it runs on.
 */
export interface InstanceLabel {
  name: string;
  color: InstanceColor;
}

/** Runtime settings the SPA loads from `GET /api/config` before it renders (public: the login page needs them). */
export interface PublicAppConfig {
  auth: {
    /** OAuth providers the login page offers, in the Firebase-era names. */
    providers: ('GOOGLE' | 'MICROSOFT')[];
    loginMessage: string;
    passwordResetByEmail: boolean;
  };
  plugins: { unsplash: boolean };
  /** The locales the connected providers can translate from and to (empty when none is connected). */
  translate: { enabled: boolean; sourceLocales: string[]; targetLocales: string[] };
  /** Absent when the instance is not named. */
  instance?: InstanceLabel;
}
