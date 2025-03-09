import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { AssetFolder } from '@shared/models/asset.model';
import { AssetService } from '@shared/services/asset.service';
import { debounceTime, Observable, of, startWith, switchMap } from 'rxjs';
import { MoveDialogModel } from './move-dialog.model';

@Component({
  selector: 'll-asset-move-dialog',
  standalone: true,
  templateUrl: './move-dialog.component.html',
  styleUrls: ['./move-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatAutocompleteModule,
    MatInputModule,
    CommonModule,
    MatButtonModule,
    MatIconModule,
  ],
})
export class MoveDialogComponent implements OnInit {
  form: FormGroup = this.fb.group({
    path: this.fb.control(null, Validators.required),
  });

  //Search
  searchCtrl: FormControl = new FormControl();
  filteredFolders: Observable<AssetFolder[]> = of([]);

  constructor(
    private readonly fb: FormBuilder,
    private readonly assetService: AssetService,
    readonly fe: FormErrorHandlerService,
    @Inject(MAT_DIALOG_DATA)
    public data: MoveDialogModel,
  ) {}

  ngOnInit(): void {
    this.filteredFolders = this.searchCtrl.valueChanges.pipe(
      startWith(''),
      debounceTime(500),
      switchMap(it => this.assetService.findAllFoldersByName(this.data.spaceId, it, 5)),
    );
  }

  displayContent(content?: AssetFolder): string {
    if (content?.parentPath === '~') return `${content.name} | ${content.parentPath}`;
    return content?.name || '';
  }

  contentSelected(event: MatAutocompleteSelectedEvent): void {
    const folder = event.option.value as AssetFolder;
    let parentPath = '~';
    if (folder.parentPath !== '~') {
      parentPath = folder.parentPath ? `${folder.parentPath}/${folder.id}` : folder.id;
    }
    this.form?.controls['path'].setValue(parentPath);
  }

  contentReset() {
    this.searchCtrl.setValue('');
    this.form?.controls['path'].setValue(null);
  }
}
