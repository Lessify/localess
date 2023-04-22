import {EventContext, logger, storage} from 'firebase-functions';
import {ObjectMetadata} from 'firebase-functions/lib/v1/providers/storage';
import * as sharp from 'sharp';
import {bucket, firestoreService} from './config';
import {FieldValue, UpdateData} from 'firebase-admin/firestore';
import {UpdateAssetUpload} from './models/asset.model';

export const onFileUpload = storage.object()
  .onFinalize(async (object: ObjectMetadata, context: EventContext) => {
    logger.info(`[Storage::onFileUpload] name : ${object.name}`);
    logger.info(object);
    const {name, contentType} = object;
    // Spaces Assets
    // spaces/eo42RwNL8XHD7Cdvd8eO/assets/RpMDPKkmDM66Vc1jgDpo/original
    if (name && name.startsWith('spaces/') && name.includes('assets') && name.endsWith('/original')) {
      const assetPath = name.slice(0, -9); // remove '/original'
      const assetSnapshot = await firestoreService.doc(assetPath).get();
      const update: UpdateData<UpdateAssetUpload> = {
        uploaded: true,
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (contentType && contentType.startsWith('image/')) {
        const [file] = await bucket.file(name).download();
        const {size, width, height, format} = await sharp(file).metadata();
        if (size) {
          update.size = size;
        }
        if (width && height) {
          update.metadata = {
            format: format,
            height: height,
            width: width,
          };
        }
      }
      await assetSnapshot.ref.update(update);
    }

    return;
  });
