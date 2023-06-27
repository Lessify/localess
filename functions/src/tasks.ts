import {logger} from 'firebase-functions';
import {onDocumentCreated} from "firebase-functions/v2/firestore";
import {Task, TaskKind, TaskStatus, TaskUpdate} from "./models/task.model";
import {FieldValue, UpdateData} from "firebase-admin/firestore";


// Firestore events
export const onTaskCreate = onDocumentCreated('spaces/{spaceId}/tasks/{taskId}', async (event) => {
  logger.info(`[Task::onTaskCreate] eventId='${event.id}'`);
  logger.info(`[Task::onTaskCreate] params='${event.params}'`);
  const {} = event.params
  // No Data
  if (!event.data) return
  const task = event.data.data() as Task
  // Proceed only with INITIATED Tasks
  if (task.status !== TaskStatus.INITIATED) return

  const updateToInProgress: UpdateData<TaskUpdate> = {
    status: TaskStatus.IN_PROGRESS,
    updatedAt: FieldValue.serverTimestamp()
  }
  // Update to IN_PROGRESS
  await event.data.ref.update(updateToInProgress)

  switch (task.kind) {
    case TaskKind.ASSET_EXPORT: {
      assetExport()
      break;
    }
    case TaskKind.ASSET_IMPORT: {
      assetImport()
      break;
    }
    case TaskKind.CONTENT_EXPORT: {
      contentExport()
      break;
    }
    case TaskKind.CONTENT_IMPORT: {
      contentImport()
      break;
    }
  }

})

function assetExport() {

}

function assetImport() {

}

function contentExport() {

}

function contentImport() {

}
