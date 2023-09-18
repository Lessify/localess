import {NgModule} from '@angular/core';

import {SharedModule} from '@shared/shared.module';
import {TasksComponent} from './tasks.component';
import {TasksRoutingModule} from './tasks-routing.module';
import {TaskService} from '@shared/services/task.service';

@NgModule({
    declarations: [TasksComponent],
    imports: [SharedModule, TasksRoutingModule],
    providers: [TaskService]
})
export class TasksModule {
}
