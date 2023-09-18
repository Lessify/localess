/* tslint:disable */
/* eslint-disable */

/**
 * A schema for the SPDX JSON format returned by the Dependency Graph.
 */
export interface DependencyGraphSpdxSbom {
  sbom: {

/**
 * The SPDX identifier for the SPDX document.
 */
'SPDXID': string;

/**
 * The version of the SPDX specification that this document conforms to.
 */
'spdxVersion': string;
'creationInfo': {

/**
 * The date and time the SPDX document was created.
 */
'created': string;

/**
 * The tools that were used to generate the SPDX document.
 */
'creators': Array<string>;
};

/**
 * The name of the SPDX document.
 */
'name': string;

/**
 * The license under which the SPDX document is licensed.
 */
'dataLicense': string;

/**
 * The name of the repository that the SPDX document describes.
 */
'documentDescribes': Array<string>;

/**
 * The namespace for the SPDX document.
 */
'documentNamespace': string;
'packages': Array<{

/**
 * A unique SPDX identifier for the package.
 */
'SPDXID'?: string;

/**
 * The name of the package.
 */
'name'?: string;

/**
 * The version of the package. If the package does not have an exact version specified,
 * a version range is given.
 */
'versionInfo'?: string;

/**
 * The location where the package can be downloaded,
 * or NOASSERTION if this has not been determined.
 */
'downloadLocation'?: string;

/**
 * Whether the package's file content has been subjected to
 * analysis during the creation of the SPDX document.
 */
'filesAnalyzed'?: boolean;

/**
 * The license of the package as determined while creating the SPDX document.
 */
'licenseConcluded'?: string;

/**
 * The license of the package as declared by its author, or NOASSERTION if this information
 * was not available when the SPDX document was created.
 */
'licenseDeclared'?: string;

/**
 * The distribution source of this package, or NOASSERTION if this was not determined.
 */
'supplier'?: string;
'externalRefs'?: Array<{

/**
 * The category of reference to an external resource this reference refers to.
 */
'referenceCategory': string;

/**
 * A locator for the particular external resource this reference refers to.
 */
'referenceLocator': string;

/**
 * The category of reference to an external resource this reference refers to.
 */
'referenceType': string;
}>;
}>;
};
}
