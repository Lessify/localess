import { ChangeDetectionStrategy, Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ExportDialogModel } from './export-dialog.model';
import { AssetService } from '@shared/services/asset.service';
import { debounceTime, Observable, of, startWith, switchMap } from 'rxjs';
import { Asset } from '@shared/models/asset.model';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';

@Component({
  selector: 'll-asset-export-dialog',
  templateUrl: './export-dialog.component.html',
  styleUrls: ['./export-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExportDialogComponent implements OnInit {
  form: FormGroup = this.fb.group({
    path: this.fb.control(undefined),
  });

  //Search
  searchCtrl: FormControl = new FormControl();
  filteredAsset: Observable<Asset[]> = of([]);

  constructor(
    private readonly fb: FormBuilder,
    private readonly assetService: AssetService,
    @Inject(MAT_DIALOG_DATA) public data: ExportDialogModel
  ) {}

  ngOnInit(): void {
    this.filteredAsset = this.searchCtrl.valueChanges.pipe(
      startWith(''),
      debounceTime(500),
      switchMap(it => {
        return this.assetService.findAllByName(this.data.spaceId, it, 5);
      })
    );
  }

  displayContent(asset?: Asset): string {
    return asset ? asset.name : '';
  }

  contentSelected(event: MatAutocompleteSelectedEvent): void {
    const asset = event.option.value as Asset;
    this.form?.controls['path'].setValue(asset.id);
  }

  contentReset(): void {
    this.searchCtrl.setValue('');
    this.form?.controls['path'].setValue(null);
  }
}
