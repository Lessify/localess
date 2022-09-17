<h1 align="center">
<br/>
  <img width="200" src="src/android-chrome-512x512.png" alt="Localess"/>
  <br/>
  Localess
<br/>
</h1>

[![Twitter URL](https://img.shields.io/twitter/url?label=Share%20on%20Twitter&style=social&url=https%3A%2F%2Fgithub.com%2FLessify%2Flocaless)](https://twitter.com/intent/tweet?text=Easy%20way%20to%20manage%20your%20app%20localisation&url=https://github.com/Lessify/localess&hashtags=i18n,internationalization,localization)
[![Twitter Follow](https://img.shields.io/twitter/follow/Lessifyio?style=social)](https://twitter.com/intent/follow?screen_name=lessifyio)


The **Localess** helps to store internationalization in form of key-values.
The application is design to be deployed in **Firebase**. 

![Localess Video](https://github.com/Lessify/localess/wiki/img/app_animation.gif)

## Supporting Localess & Lessify Project
**Localess** is part of the **Lessify Project**, is an open source project with its ongoing development made possible entirely by the support of Sponsors.
If you would like to become a sponsor, please consider:

## Key Features

- Edit your localisation content in real time
- Translate with Google Translate
- No application build required anymore
- Publish your changes (instant update)
- Google CDN Integration (very fast response time, about 300ms for 125kb of 5000 translations)
- Import / Export content between environments and applications
- User Management. with different roles : VIEW, EDIT, WRITE, ADMIN
- Integration with any programming language
- Few lines of integration with your project

## Documentation
1. [Overview](https://github.com/Lessify/localess/wiki)
2. [Setup](https://github.com/Lessify/localess/wiki/Setup)
3. [Integration](https://github.com/Lessify/localess/wiki/Integration)

## How it works
**Localess** is using Firebase products to run the application.

![System Design](https://github.com/Lessify/localess/wiki/img/system-design.png)

Lessify UI is design to manage data in firestore, authentication and storage via Firebase SDK.
Generated data used by exposed API's is store in Storage to make it even faster to access and GCP CDN will cache it for even faster response.
