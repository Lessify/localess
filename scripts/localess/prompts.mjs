/**
 * Interactive prompts for the setup wizard.
 *
 * The list-building and validation logic is kept pure and exported separately from the
 * prompts themselves, so the interesting behaviour is unit-testable without a TTY. Each
 * prompt also forwards an optional `context` ({ input, output }) so the rendered flow can
 * be driven by a test with simulated keystrokes.
 *
 * Uses `@inquirer/prompts`, declared as a direct devDependency. A copy is also present
 * transitively - `@angular/cli` pins its own 7.x - but relying on that would break the
 * wizard whenever the CLI moved, so this depends on it explicitly.
 */
import { confirm, input, search, select } from '@inquirer/prompts';

import { DEFAULT_REGION } from './config.mjs';
import { toRegionChoices, toZoneChoices, zoneOf } from './regions.mjs';

/** Sentinel choice value meaning "none of the above, create a new project". */
export const CREATE_NEW = '__create_new__';

/** Above this many projects an arrow-key list stops being usable, so we filter instead. */
const FILTER_THRESHOLD = 12;

export function shouldFilter(count) {
  return count > FILTER_THRESHOLD;
}

/**
 * Google Cloud project id rules. Validating here turns a failed `projects:create`
 * round-trip into immediate feedback in the prompt.
 */
export function validateProjectId(value) {
  const id = (value ?? '').trim();
  if (id === '') return 'A project id is required.';
  if (id.length < 6 || id.length > 30) return 'A project id must be 6 to 30 characters.';
  if (!/^[a-z0-9-]+$/.test(id)) return 'Use lowercase letters, digits and hyphens only.';
  if (!/^[a-z]/.test(id)) return 'A project id must start with a letter.';
  if (id.endsWith('-')) return 'A project id cannot end with a hyphen.';
  return true;
}

/**
 * Choices for the project picker: existing projects by id, then "create new" LAST.
 * Last matters - the first choice is the one highlighted by default, and pressing Enter
 * on it should adopt an existing project (idempotent) rather than create one (a side
 * effect). It also stops a filtered search from selecting "create" when the user types a
 * project name and hits Enter.
 */
export function toProjectChoices(projects, annotations = {}, { allowCreate = true } = {}) {
  const existing = (Array.isArray(projects) ? projects : [])
    // `projects:list` also returns projects that are pending deletion; they cannot be used.
    .filter(project => project?.projectId && (project.state ?? 'ACTIVE') === 'ACTIVE')
    .map(project => {
      const { note, priority = false } = annotations[project.projectId] ?? {};
      const base = project.displayName ? `${project.displayName} (${project.projectId})` : project.projectId;
      return { name: note ? `${base} — ${note}` : base, value: project.projectId, priority };
    })
    // Recognised projects first: they are what the user almost always wants, and putting
    // them on top means the default highlight is a project already known to be Localess.
    .sort((a, b) => (a.priority === b.priority ? a.value.localeCompare(b.value) : a.priority ? -1 : 1))
    .map(({ name, value }) => ({ name, value }));

  return allowCreate ? [...existing, { name: 'Create a new project...', value: CREATE_NEW }] : existing;
}

/** Substring match on the rendered label. "Create new" always stays reachable. */
export function filterProjectChoices(choices, term) {
  const needle = (term ?? '').trim().toLowerCase();
  if (needle === '') return choices;
  return choices.filter(choice => choice.value === CREATE_NEW || choice.name.toLowerCase().includes(needle));
}

/** `listOpenBillingAccounts` returns `billingAccounts/<id>`; show the readable tail. */
export function toBillingChoices(accounts) {
  return accounts.map(account => ({
    name: `${account.displayName} (${account.name.split('/').pop()})`,
    value: account.name,
  }));
}

/**
 * Asks which project to set up. Returns a project id, or `CREATE_NEW`.
 * Skips straight to creation when the account has no projects yet.
 */
export async function chooseProject(projects, annotations, context, { allowCreate = true } = {}) {
  const choices = toProjectChoices(projects, annotations, { allowCreate });
  const existingCount = allowCreate ? choices.length - 1 : choices.length;

  if (existingCount === 0) {
    if (allowCreate) return CREATE_NEW;
    throw new Error('No accessible Firebase projects were found.');
  }

  const message = 'Select a Firebase project';
  if (!shouldFilter(existingCount)) {
    return select({ message, choices, pageSize: FILTER_THRESHOLD + 1 }, context);
  }
  return search({
    message: `${message} (type to filter)`,
    source: term => filterProjectChoices(choices, term),
  }, context);
}

/** Asks for the id and display name of a project to create. */
export async function askNewProject(defaultDisplayName, context) {
  const projectId = await input({ message: 'New project id:', validate: validateProjectId }, context);
  const displayName = await input({ message: 'Display name:', default: defaultDisplayName }, context);
  return { projectId: projectId.trim(), displayName: displayName.trim() || defaultDisplayName };
}

/** Asks which billing account to link. Returns a `billingAccounts/<id>` resource name. */
export async function chooseBillingAccount(accounts, context) {
  return select(
    {
      message: 'Link which billing account?',
      choices: toBillingChoices(accounts),
    },
    context,
  );
}

/**
 * Asks for a region in two steps: zone first, then the exact region within it.
 *
 * A flat list of 40 regions is unreadable, and the zone is the decision most people
 * actually care about. Both steps preselect whatever covers `DEFAULT_REGION`, so accepting
 * the defaults twice reproduces the previous behaviour.
 */
export async function chooseRegion(context) {
  const zone = await select(
    {
      message: 'Which zone should Firestore, Storage and Cloud Functions live in?',
      choices: toZoneChoices(),
      default: zoneOf(DEFAULT_REGION),
      pageSize: 10,
    },
    context,
  );

  return select(
    {
      message: `Which ${zone} region?`,
      choices: toRegionChoices(zone),
      default: zoneOf(DEFAULT_REGION) === zone ? DEFAULT_REGION : undefined,
      pageSize: 14,
    },
    context,
  );
}

/**
 * Confirms provisioning into a project that shows no sign of Localess. Defaults to no:
 * the changes it guards are irreversible.
 */
export async function confirmProvision(projectId, context) {
  return confirm({ message: `Provision Localess into ${projectId} anyway?`, default: false }, context);
}

/**
 * Confirms a deploy about to happen, spelling out what it will touch. Defaults to no: this
 * pushes code to a live project, and the targets are easy to get wrong.
 */
export async function confirmDeployPlan({ projectId, region, targets }, context) {
  return confirm({ message: `Deploy to ${projectId} (${region}) - ${targets.join(', ')}?`, default: false }, context);
}

/**
 * Asks whether to deploy now. Defaults to no: setup provisions infrastructure, and
 * shipping an application is a separate decision the user has to make explicitly.
 */
export async function confirmDeploy(projectId, context) {
  return confirm({ message: `Deploy Localess to ${projectId} now?`, default: false }, context);
}

/** True when the user aborted a prompt with Ctrl-C, which should exit quietly. */
export function isPromptAbort(error) {
  return error?.name === 'ExitPromptError';
}
