import { ChangeDetectionStrategy, Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { ExportDialogModel } from './export-dialog.model';
import { AssetService } from '@shared/services/asset.service';
import { debounceTime, Observable, of, startWith, switchMap } from 'rxjs';
import { Asset } from '@shared/models/asset.model';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { AsyncPipe, NgForOf } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { MatButton, MatIconButton } from '@angular/material/button';

@Component({
  selector: 'll-asset-export-dialog',
  standalone: true,
  templateUrl: './export-dialog.component.html',
  styleUrls: ['./export-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInput,
    MatAutocompleteModule,
    AsyncPipe,
    NgForOf,
    MatIcon,
    MatIconButton,
    MatButton,
  ],
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
    @Inject(MAT_DIALOG_DATA) public data: ExportDialogModel,
  ) {}

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
