# Localess

The **Localess** helps to store internationalization in form of key-values.
The application is design to be deployed in **Firebase**. 

## Firebase
Create firebase project

## Deployment

### IAM rights
Add IAM rights to Cloud Builder. Article from official site [here](https://cloud.google.com/build/docs/deploying-builds/deploy-firebase#before_you_begin). 

### Create Firebase Community Builder image
You will need first to create a **Firebase Community Builder**.
Details how to do that you can find [here](https://cloud.google.com/build/docs/deploying-builds/deploy-firebase#using_the_firebase_community_builder) on official GCP site. 

### Configuration
The ``cloudbuild.yaml`` is already preconfigured in the source code.

### Cloud Build
To automatically deploy the latest changes, you will need to create *Cloud Build Trigger* :
- Open Cloud Build Triggers
- On the Create trigger page, enter the following settings:
  - Enter a name for your trigger.
  - Select the repository event : *Push to a branch*.
  - Select the repository : https://github.com/Lessify/localess
  - Specify the `main` branch that will start your trigger. 
  - Select next for Configuration:
    - Type : *Cloud Build configuration file (YAML or JSON)*
    - Location: *Repository*
  - In Advanced you will need to add next Environment variables, with their related Firebase values:
    - **LOCALESS_FIREBASE_PROJECT_ID**
    - **LOCALESS_FIREBASE_APP_ID**
    - **LOCALESS_FIREBASE_STORAGE_BUCKET**
    - **LOCALESS_FIREBASE_LOCATION_ID**
    - **LOCALESS_FIREBASE_API_KEY**
    - **LOCALESS_FIREBASE_AUTH_DOMAIN**
    - **LOCALESS_FIREBASE_MESSAGING_SENDER_ID**
- Click Create to save your build trigger.

## Utils Commands

Kill app
````shell
netstat -ano | findstr :8080
taskkill /PID 10652 /F
````
