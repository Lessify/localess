/* tslint:disable */
/* eslint-disable */
export type SecurityAndAnalysis = ({
'advanced_security'?: {
'status'?: 'enabled' | 'disabled';
};

/**
 * Enable or disable Dependabot security updates for the repository.
 */
'dependabot_security_updates'?: {

/**
 * The enablement status of Dependabot security updates for the repository.
 */
'status'?: 'enabled' | 'disabled';
};
'secret_scanning'?: {
'status'?: 'enabled' | 'disabled';
};
'secret_scanning_push_protection'?: {
'status'?: 'enabled' | 'disabled';
};
}) | null;
