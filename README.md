# Hermitage House Chicago, guest phone app

A Capacitor shell around https://hermitagehousechicago.com/ with native features added in stages.
Free to guests; nothing is sold in the app. US only on both stores.

- App id: com.hermitagehousechicago.app
- `www/` holds the offline page shown when the site cannot be reached.
- Never commit signing keys, passwords, door codes, Wi-Fi passwords or the street address.
  The address, door code and Wi-Fi appear only behind a guest's own private stay link.
- Builds: GitHub Actions (iPhone simulator build, Android debug build). Store signing comes later.
