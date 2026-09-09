import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  CREATE_NEW,
  validateProjectId,
  toProjectChoices,
  filterProjectChoices,
  toBillingChoices,
  shouldFilter,
} from './prompts.mjs';

const projects = [
  { projectId: 'zeta-app', displayName: 'Zeta', state: 'ACTIVE' },
  { projectId: 'alpha-app', displayName: 'Alpha', state: 'ACTIVE' },
];

test('validateProjectId accepts a well-formed id', () => {
  assert.equal(validateProjectId('my-localess'), true);
});

test('validateProjectId rejects ids that are too short or too long', () => {
  assert.match(validateProjectId('abcde'), /6 to 30/);
  assert.match(validateProjectId('a'.repeat(31)), /6 to 30/);
});

test('validateProjectId rejects uppercase and underscores', () => {
  assert.match(validateProjectId('My-Localess'), /lowercase/);
  assert.match(validateProjectId('my_localess'), /lowercase/);
});

test('validateProjectId requires a leading letter', () => {
  assert.match(validateProjectId('1localess'), /start with a letter/);
});

test('validateProjectId rejects a trailing hyphen', () => {
  assert.match(validateProjectId('my-localess-'), /end with a hyphen/);
});

test('validateProjectId rejects blank input', () => {
  assert.match(validateProjectId('   '), /required/);
});

test('toProjectChoices puts create-new last so Enter never creates by accident', () => {
  const choices = toProjectChoices(projects);
  assert.equal(choices.at(-1).value, CREATE_NEW);
  assert.notEqual(choices[0].value, CREATE_NEW);
});

test('toProjectChoices sorts existing projects by id', () => {
  const ids = toProjectChoices(projects)
    .map(choice => choice.value)
    .filter(value => value !== CREATE_NEW);
  assert.deepEqual(ids, ['alpha-app', 'zeta-app']);
});

test('toProjectChoices labels a project with its display name and id', () => {
  const choice = toProjectChoices(projects).find(c => c.value === 'alpha-app');
  assert.equal(choice.name, 'Alpha (alpha-app)');
});

test('toProjectChoices falls back to the id when there is no display name', () => {
  const choice = toProjectChoices([{ projectId: 'bare-app' }]).find(c => c.value === 'bare-app');
  assert.equal(choice.name, 'bare-app');
});

test('toProjectChoices skips projects that are not active', () => {
  const values = toProjectChoices([{ projectId: 'gone-app', state: 'DELETE_REQUESTED' }]).map(c => c.value);
  assert.deepEqual(values, [CREATE_NEW]);
});

test('filterProjectChoices leaves a matching project highlighted, not create-new', () => {
  assert.equal(filterProjectChoices(toProjectChoices(projects), 'zeta')[0].value, 'zeta-app');
});

test('toProjectChoices tolerates a missing or non-array input', () => {
  assert.deepEqual(toProjectChoices(undefined).map(c => c.value), [CREATE_NEW]);
  assert.deepEqual(toProjectChoices(null).map(c => c.value), [CREATE_NEW]);
});

test('filterProjectChoices returns everything for an empty term', () => {
  const choices = toProjectChoices(projects);
  assert.deepEqual(filterProjectChoices(choices, ''), choices);
  assert.deepEqual(filterProjectChoices(choices, undefined), choices);
});

test('filterProjectChoices matches on id case-insensitively', () => {
  const values = filterProjectChoices(toProjectChoices(projects), 'ALPHA').map(c => c.value);
  assert.deepEqual(values, ['alpha-app', CREATE_NEW]);
});

test('filterProjectChoices keeps create-new reachable when nothing matches', () => {
  const values = filterProjectChoices(toProjectChoices(projects), 'nomatch').map(c => c.value);
  assert.deepEqual(values, [CREATE_NEW]);
});

test('shouldFilter switches to a searchable list only for long lists', () => {
  assert.equal(shouldFilter(5), false);
  assert.equal(shouldFilter(12), false);
  assert.equal(shouldFilter(13), true);
});

test('toBillingChoices labels an account with its display name and id', () => {
  const choices = toBillingChoices([{ name: 'billingAccounts/01ABCD', displayName: 'My Billing' }]);
  assert.equal(choices[0].value, 'billingAccounts/01ABCD');
  assert.equal(choices[0].name, 'My Billing (01ABCD)');
});

test('toProjectChoices appends an annotation note to the label', () => {
  const choices = toProjectChoices(projects, { 'alpha-app': { note: 'local config', priority: true } });
  assert.equal(choices[0].name, 'Alpha (alpha-app) — local config');
});

test('toProjectChoices sorts annotated projects to the top', () => {
  const values = toProjectChoices(projects, { 'zeta-app': { priority: true } }).map(c => c.value);
  assert.deepEqual(values, ['zeta-app', 'alpha-app', CREATE_NEW]);
});

test('toProjectChoices keeps create-new last even with annotations', () => {
  const choices = toProjectChoices(projects, { 'alpha-app': { priority: true } });
  assert.equal(choices.at(-1).value, CREATE_NEW);
});

test('toProjectChoices does not leak the priority flag into the choice', () => {
  const choice = toProjectChoices(projects, { 'alpha-app': { priority: true } })[0];
  assert.deepEqual(Object.keys(choice).sort(), ['name', 'value']);
});

test('toProjectChoices omits create-new when creation is not allowed', () => {
  const choices = toProjectChoices(projects, {}, { allowCreate: false });
  assert.equal(choices.length, 2);
  assert.equal(
    choices.some(choice => choice.value === CREATE_NEW),
    false,
  );
});
