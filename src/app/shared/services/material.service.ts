import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { MaterialIcons } from '@shared/models/material.model';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class MaterialService {
  private readonly httpClient = inject(HttpClient);

  findAllIcons(): Observable<MaterialIcons> {
    return this.httpClient.get<MaterialIcons>(`/assets/material-icons.json`);
  }
}
