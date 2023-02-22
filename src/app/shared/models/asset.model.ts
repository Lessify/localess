import {Timestamp} from '@angular/fire/firestore';

export interface Asset {
  id: string,
  name: string,


  createdAt: Timestamp;
  updatedAt: Timestamp;
}
