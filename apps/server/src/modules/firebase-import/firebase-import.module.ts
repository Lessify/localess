import { Module } from '@nestjs/common';
import { FirebaseImportController } from './firebase-import.controller.js';
import { FirebaseImportRunner } from './firebase-import.runner.js';
import { FirebaseImportService } from './firebase-import.service.js';

@Module({
  controllers: [FirebaseImportController],
  providers: [FirebaseImportRunner, FirebaseImportService],
  exports: [FirebaseImportRunner],
})
export class FirebaseImportModule {}
