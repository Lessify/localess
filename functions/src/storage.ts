import { logger } from 'firebase-functions/v2';
import { onObjectFinalized } from 'firebase-functions/v2/storage';
import { FieldValue, UpdateData } from 'firebase-admin/firestore';
import sharp from 'sharp';
import { bucket, firestoreService } from './config';
import { AssetFile } from './models';
import { extractMetadata } from './services';
import os from 'os';

const onFileUpload = onObjectFinalized(async event => {
  logger.info(`[Storage::onFileUpload] name : ${event.data.name}`);
  // logger.info(event.data);
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
    if (contentType) {
      if (contentType.startsWith('image/')) {
        const [file] = await bucket.file(name).download();
        const { size, width, height, format, pages, isProgressive } = await sharp(file).metadata();
        if (size) {
          update.size = size;
        }
        update.metadata = {
          type: 'image',
          format: format,
          height: height,
          width: width,
          animated: pages !== undefined,
          progressive: isProgressive,
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
      } else if (contentType.startsWith('video/')) {
        const tempFilePath = `${os.tmpdir()}/assets-tmp`;
        await bucket.file(name).download({ destination: tempFilePath });
        const metadata = await extractMetadata(tempFilePath);
        update.metadata = {
          type: 'video',
          format: metadata.format.format_name,
          formatLong: metadata.format.format_long_name,
          duration: metadata.format.duration,
          bitRate: metadata.format.bit_rate,
        };
        if (metadata.streams.length > 0) {
          const video = metadata.streams[0];
          update.metadata.height = video.height;
          update.metadata.width = video.width;
          // calculate orientation
          const { width, height } = video;
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
      }
    }
    await assetRef.update(update);
  }
  return;
});

export const storage = {
  onupload: onFileUpload,
};
