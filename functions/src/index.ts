import {https, logger} from "firebase-functions";
import {initializeApp} from 'firebase-admin/app'
import {firestore, storage} from 'firebase-admin';
import {Space} from './models/space.model';
import {Translation} from './models/translation.model';
import * as express from "express";
import * as cors from "cors"

// Start writing Firebase Functions
// https://firebase.google.com/docs/functions/typescript

initializeApp()
//API V1
const app = express()
app.use(cors({origin: true}))
app.get("/api/v1/spaces/:spaceId/translations/:locale.json", async (req, res) => {
  const bucket = storage().bucket()
  const spaceId = req.params.spaceId
  let locale = req.params.locale
  logger.info("v1 spaces : " + JSON.stringify(req.params));
  const spaceRef = await firestore().doc(`spaces/${spaceId}`).get()
  const space = spaceRef.data() as Space
  if(!space.locales.some(it => it.id === locale)) {
    locale = space.localeFallback.id
  }
  bucket.file(`spaces/${spaceId}/translations/${locale}.json`).download()
  .then((content) => {
    res.contentType("application/json").send(content.toString())
  })
})
export const v1 = https.onRequest(app);

// Publish
export const publishTranslations = https.onCall((data, context) => {
  logger.info("publishTranslations : " + JSON.stringify(data));
  const spaceId: string = data.spaceId
  return Promise.all([
    firestore().doc(`spaces/${spaceId}`).get(),
    firestore().collection(`spaces/${spaceId}/translations`).get()
  ])
  .then(([spaceRef, translationsRef]) => {
    if (spaceRef.exists && !translationsRef.empty) {
      const space: Space = spaceRef.data() as Space
      const translations = translationsRef.docs.filter(it => it.exists)//.map(it => it.data() as Translation)
      const bucket = storage().bucket()

      space.locales.forEach((locale) => {
        const localeJson: { [key: string]: string } = {}
        translations.forEach(trRef => {
          const tr = trRef.data() as Translation
          let value = tr.locales[locale.id]
          if (!value) {
            value = tr.locales[space.localeFallback.id]
          }
          localeJson[trRef.id] = value
        })
        //Save generated JSON
        logger.info(`Save file to spaces/${spaceId}/translations/${locale.id}.json`)
        bucket.file(`spaces/${spaceId}/translations/${locale.id}.json`)
        .save(
          JSON.stringify(localeJson),
          (err?: Error | null) => {
            if (err) {
              logger.error(`Can not save file for Space(${spaceId}) and Locale(${locale})`)
              logger.error(err)
            }
          }
        )
      })

      return
    } else {
      logger.warn(`Space ${spaceId} does not exist.`)
      return new https.HttpsError('not-found', 'Space not found')
    }

  })

})
