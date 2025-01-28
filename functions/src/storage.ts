import { logger } from 'firebase-functions/v2';
import { onObjectFinalized } from 'firebase-functions/v2/storage';
import { FieldValue, UpdateData } from 'firebase-admin/firestore';
import sharp from 'sharp';
import { bucket, firestoreService } from './config';
import { AssetFile } from './models';

const onFileUpload = onObjectFinalized(async event => {
  logger.info(`[Storage::onFileUpload] name : ${event.data.name}`);
  logger.info(event.data);
  const { name, contentType } = event.data;
  // Spaces Assets
  // spaces/eo42RwNL8XHD7Cdvd8eO/assets/RpMDPKkmDM66Vc1jgDpo/original
  if (name && name.startsWith('spaces/') && name.includes('assets') && name.endsWith('/original')) {
    const assetPath = name.slice(0, -9); // remove '/original'
    const assetRef = firestoreService.doc(assetPath);
    const update: UpdateData<AssetFile> = {
      inProgress: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (contentType && contentType.startsWith('image/')) {
      const [file] = await bucket.file(name).download();
      const { size, width, height, format } = await sharp(file).metadata();
      if (size) {
        update.size = size;
      }
      update.metadata = {
        format: format,
        height: height,
        width: width,
      };
      // calculate orientation
      if (width && height) {
        if (width > height) {
          update.metadata.orientation = 'landscape';
        } else if (height > width) {
          update.metadata.orientation = 'portrait';
        } else {
          update.metadata.orientation = 'squarish';
        }
      }
    }
    await assetRef.update(update);
  }
  return;
});

export const storage = {
  onupload: onFileUpload,
};
