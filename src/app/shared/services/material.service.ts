import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { MaterialIcons } from '@shared/models/material.model';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class MaterialService {
  constructor(private readonly httpClient: HttpClient) {}

  findAllIcons(): Observable<MaterialIcons> {
    return this.httpClient.get<MaterialIcons>(`/assets/material-icons.json`);
  }
}
