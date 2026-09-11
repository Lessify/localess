import { test } from 'node:test';
import assert from 'node:assert/strict';

import { deployFunctionFailures, isCleanupPolicyOnlyFailure } from './deploy.mjs';

/**
 * Real output from a first deploy to a freshly provisioned project. `firebase deploy`
 * printed these as warnings and still exited 0, which is the whole reason the exit code
 * cannot be trusted here.
 */
const FIRST_DEPLOY_OUTPUT = `
i  functions: preparing functions directory for uploading...
!  functions: Request to https://cloudfunctions.googleapis.com/v2/projects/demo/locations/europe-west6/functions?functionId=publicv1 had HTTP Error: 409, Could not create bucket gcf-v2-sources-445907840924-europe-west6.
!  functions:  failed to create function projects/demo/locations/europe-west6/functions/publicv1
!  functions: Request to https://cloudfunctions.googleapis.com/v2/projects/demo/locations/europe-west6/functions?functionId=content-onwrite had HTTP Error: 400, Validation failed for trigger: Permission denied while using the Eventarc Service Agent.
!  functions:  failed to create function projects/demo/locations/europe-west6/functions/content-onwrite
Failed to create function projects/demo/locations/europe-west6/functions/content-onwrite
+  functions[content-unpublish(europe-west6)] Successful create operation.
+  Deploy complete!
`;

test('deployFunctionFailures names the functions a reported-successful deploy failed to create', () => {
  assert.deepEqual(deployFunctionFailures(FIRST_DEPLOY_OUTPUT), ['publicv1', 'content-onwrite']);
});

test('deployFunctionFailures finds nothing in a clean deploy', () => {
  const output = `
i  functions: preparing functions directory for uploading...
+  functions[publicv1(europe-west6)] Successful create operation.
+  functions[content-onwrite(europe-west6)] Successful create operation.
+  Deploy complete!
`;
  assert.deepEqual(deployFunctionFailures(output), []);
});

test('deployFunctionFailures also catches update failures', () => {
  const output = '!  functions:  failed to update function projects/demo/locations/europe-west6/functions/publicv1';
  assert.deepEqual(deployFunctionFailures(output), ['publicv1']);
});

test('deployFunctionFailures does not mistake the cleanup-policy error for a function failure', () => {
  // This one exits 1 while every function deployed, so it must not be reported as a failure.
  const output = 'Error: Functions successfully deployed but could not set up cleanup policy in location europe-west6.';
  assert.deepEqual(deployFunctionFailures(output), []);
});

test('isCleanupPolicyOnlyFailure recognises the exit-1 that actually deployed everything', () => {
  const output = 'Error: Functions successfully deployed but could not set up cleanup policy in location europe-west6.';
  assert.equal(isCleanupPolicyOnlyFailure(output), true);
});

test('isCleanupPolicyOnlyFailure does not excuse an ordinary failure', () => {
  assert.equal(isCleanupPolicyOnlyFailure('Error: HTTP Error: 403, Permission denied'), false);
});
