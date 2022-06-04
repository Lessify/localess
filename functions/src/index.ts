import * as functions from "firebase-functions";
import {App, initializeApp} from 'firebase-admin/app'
import {FieldValue, Firestore, getFirestore, WriteBatch} from 'firebase-admin/firestore'
import {getStorage, Storage} from 'firebase-admin/storage'
import {Space} from './models/space.model';
import {Translation, TranslationType} from './models/translation.model';
import * as express from "express";
import * as cors from "cors"

// Start writing Firebase Functions
// https://firebase.google.com/docs/functions/typescript

//Const
const BATCH_MAX = 500

//Init
const app: App = initializeApp()
const firestore: Firestore = getFirestore(app)
const storage: Storage = getStorage(app)
const bucket = storage.bucket()

//API V1
const expressV1 = express()
expressV1.use(cors({origin: true}))
expressV1.get("/api/v1/spaces/:spaceId/translations/:locale.json", async (req, res) => {
  const spaceId = req.params.spaceId
  let locale = req.params.locale
  functions.logger.info("v1 spaces : " + JSON.stringify(req.params));
  const spaceRef = await firestore.doc(`spaces/${spaceId}`).get()
  if (!spaceRef.exists) {
    res.status(404).send(new functions.https.HttpsError('not-found', 'Space not found'))
  }
  const space = spaceRef.data() as Space
  if (!space.locales.some(it => it.id === locale)) {
    locale = space.localeFallback.id
  }
  bucket.file(`spaces/${spaceId}/translations/${locale}.json`).download()
  .then((content) => {
    res.contentType("application/json").send(content.toString())
  })
})
export const v1 = functions.https.onRequest(expressV1);

// Publish
export const publishTranslations = functions.https.onCall((data, context) => {
  functions.logger.info("publishTranslations : " + JSON.stringify(data));
  const spaceId: string = data.spaceId
  return Promise.all([
    firestore.doc(`spaces/${spaceId}`).get(),
    firestore.collection(`spaces/${spaceId}/translations`).get()
  ])
  .then(([spaceRef, translationsRef]) => {
    if (spaceRef.exists && !translationsRef.empty) {
      const space: Space = spaceRef.data() as Space
      const translations = translationsRef.docs.filter(it => it.exists)//.map(it => it.data() as Translation)

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
        functions.logger.info(`Save file to spaces/${spaceId}/translations/${locale.id}.json`)
        bucket.file(`spaces/${spaceId}/translations/${locale.id}.json`)
        .save(
          JSON.stringify(localeJson),
          (err?: Error | null) => {
            if (err) {
              functions.logger.error(`Can not save file for Space(${spaceId}) and Locale(${locale})`)
              functions.logger.error(err)
            }
          }
        )
      })
      return
    } else {
      functions.logger.warn(`Space ${spaceId} does not exist.`)
      return new functions.https.HttpsError('not-found', 'Space not found')
    }
  })
})

//Import JSON
export const importLocaleJson = functions.https.onCall(async (data, context) => {
  functions.logger.info("importLocaleJson : " + JSON.stringify(data));
  const spaceId: string = data.spaceId
  const locale: string = data.locale
  const importT: { [key: string]: string } = data.translations
  let totalChanges: number = 0;

  const spaceRef = await firestore.doc(`spaces/${spaceId}`).get()
  const translationsRef = await firestore.collection(`spaces/${spaceId}/translations`).get()

  if (spaceRef.exists && !translationsRef.empty) {
    //const space: Space = spaceRef.data() as Space
    const origTransMap = new Map<string, Translation>()
    const origTransIdMap = new Map<string, string>()
    translationsRef.docs.filter(it => it.exists)
    .forEach(it => {
      const tr = it.data() as Translation
      origTransMap.set(tr.name, tr)
      origTransIdMap.set(tr.name, it.id)
    })

    const batches: WriteBatch[] = []

    Object.getOwnPropertyNames(importT).forEach((name, idx) => {
      const batchIdx = Math.round(idx / BATCH_MAX)
      if (batches.length < batchIdx + 1) {
        batches.push(firestore.batch())
      }
      const ot = origTransMap.get(name)
      const oid = origTransIdMap.get(name)
      if (ot && oid) {
        //update
        if (ot.locales[locale] !== importT[name]) {
          // update if locale values are different
          let update: any = {
            updatedOn: FieldValue.serverTimestamp()
          }
          update[`locales.${locale}`] = importT[name]
          batches[batchIdx].update(firestore.doc(`spaces/${spaceId}/translations/${oid}`), update)
          totalChanges++
        }
      } else {
        //add
        let addEntity: any = {
          name: name,
          type: TranslationType.STRING,
          locales: {},
          labels: [],
          description: '',
          createdOn: FieldValue.serverTimestamp(),
          updatedOn: FieldValue.serverTimestamp()
        }
        addEntity.locales[locale] = importT[name]
        batches[batchIdx].set(firestore.collection(`spaces/${spaceId}/translations`).doc(), addEntity)
        totalChanges++
      }
    })
    console.log("Batch size : " + (batches.length + 1))
    console.log("Batch total changes : " + totalChanges)
    return await Promise.all(batches.map(it => it.commit()))
  } else {
    functions.logger.warn(`Space ${spaceId} does not exist.`)
    return new functions.https.HttpsError('not-found', 'Space not found')
  }

})
