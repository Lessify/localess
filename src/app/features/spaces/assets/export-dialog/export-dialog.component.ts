import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Asset } from '@shared/models/asset.model';
import { AssetService } from '@shared/services/asset.service';
import { debounceTime, Observable, of, startWith, switchMap } from 'rxjs';
import { ExportDialogModel } from './export-dialog.model';

@Component({
  selector: 'll-asset-export-dialog',
  templateUrl: './export-dialog.component.html',
  styleUrls: ['./export-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    CommonModule,
    MatIconModule,
    MatButtonModule,
  ],
})
export class ExportDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly assetService = inject(AssetService);
  data = inject<ExportDialogModel>(MAT_DIALOG_DATA);

  form: FormGroup = this.fb.group({
    path: this.fb.control(undefined),
  });

  //Search
  searchCtrl: FormControl = new FormControl();
  filteredAsset: Observable<Asset[]> = of([]);

  ngOnInit(): void {
    this.filteredAsset = this.searchCtrl.valueChanges.pipe(
      startWith(''),
      debounceTime(500),
      switchMap(it => {
        return this.assetService.findAllByName(this.data.spaceId, it, 5);
      }),
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
