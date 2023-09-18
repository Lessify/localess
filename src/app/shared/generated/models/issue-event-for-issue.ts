/* tslint:disable */
/* eslint-disable */
import { AddedToProjectIssueEvent } from '../models/added-to-project-issue-event';
import { AssignedIssueEvent } from '../models/assigned-issue-event';
import { ConvertedNoteToIssueIssueEvent } from '../models/converted-note-to-issue-issue-event';
import { DemilestonedIssueEvent } from '../models/demilestoned-issue-event';
import { LabeledIssueEvent } from '../models/labeled-issue-event';
import { LockedIssueEvent } from '../models/locked-issue-event';
import { MilestonedIssueEvent } from '../models/milestoned-issue-event';
import { MovedColumnInProjectIssueEvent } from '../models/moved-column-in-project-issue-event';
import { RemovedFromProjectIssueEvent } from '../models/removed-from-project-issue-event';
import { RenamedIssueEvent } from '../models/renamed-issue-event';
import { ReviewDismissedIssueEvent } from '../models/review-dismissed-issue-event';
import { ReviewRequestRemovedIssueEvent } from '../models/review-request-removed-issue-event';
import { ReviewRequestedIssueEvent } from '../models/review-requested-issue-event';
import { UnassignedIssueEvent } from '../models/unassigned-issue-event';
import { UnlabeledIssueEvent } from '../models/unlabeled-issue-event';

/**
 * Issue Event for Issue
 */
export type IssueEventForIssue = (LabeledIssueEvent | UnlabeledIssueEvent | AssignedIssueEvent | UnassignedIssueEvent | MilestonedIssueEvent | DemilestonedIssueEvent | RenamedIssueEvent | ReviewRequestedIssueEvent | ReviewRequestRemovedIssueEvent | ReviewDismissedIssueEvent | LockedIssueEvent | AddedToProjectIssueEvent | MovedColumnInProjectIssueEvent | RemovedFromProjectIssueEvent | ConvertedNoteToIssueIssueEvent);
