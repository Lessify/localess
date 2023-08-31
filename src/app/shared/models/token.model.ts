import {FieldValue} from "@angular/fire/firestore";

export interface Token {
  id: string
  name: string
  createdAt: FieldValue;
  updatedAt: FieldValue;
}

export interface TokenCreateFS {
  name: string
  createdAt: FieldValue;
  updatedAt: FieldValue;
}
