import { Module } from '@nestjs/common';
import { AssetsModule } from '../assets/assets.module.js';
import { FirebaseImportController } from './firebase-import.controller.js';
import { FirebaseImportRunner } from './firebase-import.runner.js';
import { FirebaseImportService } from './firebase-import.service.js';

@Module({
  imports: [AssetsModule],
  controllers: [FirebaseImportController],
  providers: [FirebaseImportRunner, FirebaseImportService],
  exports: [FirebaseImportRunner],
})
export class FirebaseImportModule {}
