# Localess

The **Localess** helps to store internationalization in form of key-values.
The application is design to be deployed in **Firebase**. 

## Firebase

### Create Project
Open Firebase and create a new project

### Create Web App connection
- Open **Firebase Settings**
- Go to **Your apps** section
- Select **Web App** icon
  - Fill the **App nickname** field
  - Check **Also set up Firebase Hosting for this app** checkbox
  - Press **Register app**
  - Copy **firebaseConfig** values , as they will be required in [Cloud Build](#cloud-build) section
  - Press **Next**
  - Press **Next** again
  - Copy the **Hosting Site ID**, as it will be required in [Cloud Build](#cloud-build) section
  - Press **Continue to console**

### Authentication
**Firebase** makes Authentication easier for **Localess**. Localess needs to identify identity of the users to provide custom experience and keep the data secure.

#### Email/Password

#### Identity Providers
You can connect with next Identity providers:
- Google
- Microsoft
- Facebook
- Apple
- Twitter
- GitHub

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
  - In Advanced you will need to add next Substitution variables, with their related Firebase values:
    - **_LOCALESS_FIREBASE_PROJECT_ID** - firebase project id
    - **_LOCALESS_FIREBASE_APP_ID** - firebase app id
    - **_LOCALESS_FIREBASE_STORAGE_BUCKET** - firebase storage bucket
    - **_LOCALESS_FIREBASE_LOCATION_ID** - firebase location id (at the moment it should be always )
    - **_LOCALESS_FIREBASE_API_KEY** - firebase api key
    - **_LOCALESS_FIREBASE_AUTH_DOMAIN** - firebase auth domain
    - **_LOCALESS_FIREBASE_MESSAGING_SENDER_ID** - firebase messaging sender id
    - **_LOCALESS_FIREBASE_HOST_SITE_ID** - firebase host site id
- Click Create to save your build trigger.

## Utils Commands

Kill app
````shell
netstat -ano | findstr :8080
taskkill /PID 10652 /F
````
