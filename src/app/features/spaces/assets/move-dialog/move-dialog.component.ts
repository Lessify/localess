import { ChangeDetectionStrategy, Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MoveDialogModel } from './move-dialog.model';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { debounceTime, Observable, of, startWith, switchMap } from 'rxjs';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { AssetService } from '@shared/services/asset.service';
import { AssetFolder } from '@shared/models/asset.model';

@Component({
  selector: 'll-asset-move-dialog',
  templateUrl: './move-dialog.component.html',
  styleUrls: ['./move-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
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
