/**
 * Deciding which Firebase project a command is about, and whether Localess owns it.
 *
 * All three commands need the same answer, from the same three signals, so the logic lives
 * here rather than in any one command:
 *
 *   - the `localess-managed` GCP label - authoritative, and one Cloud Resource Manager call
 *     returns it for every project at once;
 *   - a web app named `Localess` - a weak fallback for projects provisioned before markers
 *     existed, costing one call per project;
 *   - a local `.env.<project-id>` - one machine's opinion, never trusted on its own.
 */
import { cli } from './firebase-cli.mjs';
import { listProjectConfigs } from './config.mjs';
import { listAllProjectLabels, readProjectLabels } from './firebase-gaps.mjs';
import { WEB_APP_NAME, describeProject, hasMarker, markerRegion, markerVersion } from './markers.mjs';

/**
 * Picker annotations for every project.
 *
 * The web-app fallback is only consulted where it can change the answer - a locally
 * configured project carrying no label - because it costs a round trip each.
 */
export async function annotateProjects(root, projects) {
  const configured = new Set(listProjectConfigs(root));
  const labelsByProject = await listAllProjectLabels();

  const annotations = {};
  await Promise.all(
    projects.map(async project => {
      const projectId = project.projectId;
      const configuredLocally = configured.has(projectId);
      const labels = labelsByProject?.get(projectId);

      if (!configuredLocally && !hasMarker(labels)) return;

      if (labelsByProject === null && !configuredLocally) return;
      if (labelsByProject === null) {
        annotations[projectId] = describeProject({ configuredLocally, remote: { reachable: false } });
        return;
      }

      const needsFallback = configuredLocally && !hasMarker(labels);
      const apps = needsFallback ? await cli.listWebApps(projectId).catch(() => null) : null;

      annotations[projectId] = describeProject({
        configuredLocally,
        remote: {
          reachable: true,
          labels: labels ?? {},
          hasLocalessWebApp: Boolean(apps?.some(app => app.displayName === WEB_APP_NAME)),
        },
      });
    }),
  );

  return annotations;
}

/** The remote signals for one project. Never throws: an unreachable API reads as unmarked. */
export async function identifyProject(projectId) {
  const labels = await readProjectLabels(projectId);
  const managed = hasMarker(labels);

  // Only worth a round trip when the authoritative signal is absent.
  const apps = managed ? null : await cli.listWebApps(projectId).catch(() => null);

  return {
    managed,
    version: markerVersion(labels),
    region: markerRegion(labels),
    hasLocalessWebApp: Boolean(apps?.some(app => app.displayName === WEB_APP_NAME)),
  };
}

/**
 * The deploy and sync gate.
 *
 * Adoption is setup's job, not this one's: setup is idempotent and re-checks the
 * infrastructure before writing the label, so pointing at it costs one command and cannot
 * leave anyone stuck. Deploying into an unmarked project is the mistake worth preventing -
 * a mistyped project id would otherwise install a CMS over something unrelated.
 */
export function assertManaged(projectId, identity) {
  if (identity.managed) return;

  const reason = identity.hasLocalessWebApp
    ? `${projectId} has a Localess web app but no localess-managed label.`
    : `${projectId} is not a Localess project - it carries no localess-managed label.`;

  throw new Error(
    `${reason}\n\n  Adopt it first - setup is idempotent and will not change existing infrastructure:\n\n    npm run setup:firebase -- --project ${projectId}\n`,
  );
}
