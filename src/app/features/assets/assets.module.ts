import { NgModule } from '@angular/core';

import { SharedModule } from '@shared/shared.module';
import { AssetsComponent } from './assets.component';
import { AssetsRoutingModule } from './assets-routing.module';
import { SpaceService } from '@shared/services/space.service';
import { AssetService } from '@shared/services/asset.service';
import { AddFolderDialogComponent } from './add-folder-dialog/add-folder-dialog.component';
import { EditFolderDialogComponent } from './edit-folder-dialog/edit-folder-dialog.component';
import { ExportDialogComponent } from './export-dialog/export-dialog.component';
import { ImportDialogComponent } from './import-dialog/import-dialog.component';
import { TaskService } from '@shared/services/task.service';
import { EditFileDialogComponent } from './edit-file-dialog/edit-file-dialog.component';
import { MoveDialogComponent } from './move-dialog';

@NgModule({
  declarations: [
    AssetsComponent,
    AddFolderDialogComponent,
    EditFileDialogComponent,
    EditFolderDialogComponent,
    ExportDialogComponent,
    ImportDialogComponent,
    MoveDialogComponent,
  ],
  imports: [SharedModule, AssetsRoutingModule],
  providers: [SpaceService, AssetService, TaskService],
})
export class AssetsModule {}
