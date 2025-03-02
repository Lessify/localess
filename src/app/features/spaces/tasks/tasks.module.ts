import { NgModule } from '@angular/core';

import { SharedModule } from '@shared/shared.module';
import { TasksRoutingModule } from './tasks-routing.module';
import { TaskService } from '@shared/services/task.service';

@NgModule({
  declarations: [],
  imports: [SharedModule, TasksRoutingModule],
  providers: [TaskService],
})
export class TasksModule {}
