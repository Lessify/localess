/* tslint:disable */
/* eslint-disable */

/**
 * A diff of the dependencies between two commits.
 */
export type DependencyGraphDiff = Array<{
'change_type': 'added' | 'removed';
'manifest': string;
'ecosystem': string;
'name': string;
'version': string;
'package_url': string | null;
'license': string | null;
'source_repository_url': string | null;
'vulnerabilities': Array<{
'severity': string;
'advisory_ghsa_id': string;
'advisory_summary': string;
'advisory_url': string;
}>;

/**
 * Where the dependency is utilized. `development` means that the dependency is only utilized in the development environment. `runtime` means that the dependency is utilized at runtime and in the development environment.
 */
'scope': 'unknown' | 'runtime' | 'development';
}>;
