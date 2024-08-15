import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { MaterialIcons } from '@shared/models/material.model';

@Injectable()
export class MaterialService {
  constructor(private readonly httpClient: HttpClient) {}

  findAllIcons(): Observable<MaterialIcons> {
    return this.httpClient.get<MaterialIcons>(`/assets/material-icons.json`);
  }
}
