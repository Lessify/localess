/* tslint:disable */
/* eslint-disable */
import { PagesHttpsCertificate } from '../models/pages-https-certificate';
import { PagesSourceHash } from '../models/pages-source-hash';

/**
 * The configuration for GitHub Pages for a repository.
 */
export interface Page {

  /**
   * The process in which the Page will be built.
   */
  build_type?: ('legacy' | 'workflow') | null;

  /**
   * The Pages site's custom domain
   */
  cname: string | null;

  /**
   * Whether the Page has a custom 404 page.
   */
  custom_404: boolean;

  /**
   * The web address the Page can be accessed from.
   */
  html_url?: string;
  https_certificate?: PagesHttpsCertificate;

  /**
   * Whether https is enabled on the domain
   */
  https_enforced?: boolean;

  /**
   * The timestamp when a pending domain becomes unverified.
   */
  pending_domain_unverified_at?: string | null;

  /**
   * The state if the domain is verified
   */
  protected_domain_state?: ('pending' | 'verified' | 'unverified') | null;

  /**
   * Whether the GitHub Pages site is publicly visible. If set to `true`, the site is accessible to anyone on the internet. If set to `false`, the site will only be accessible to users who have at least `read` access to the repository that published the site.
   */
  public: boolean;
  source?: PagesSourceHash;

  /**
   * The status of the most recent build of the Page.
   */
  status: ('built' | 'building' | 'errored') | null;

  /**
   * The API address for accessing this Page resource.
   */
  url: string;
}
