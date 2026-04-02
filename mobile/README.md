# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.

## EAS Update

`safadd-mobile` quedó preparado para usar `expo-updates` con EAS Update en Android.

Instalación desde el root del monorepo:

```bash
cd /home/adro/vsc
pnpm install --no-frozen-lockfile
```

Variables necesarias:

- `EXPO_PUBLIC_EAS_PROJECT_ID`: project id de Expo/EAS.
- `EXPO_PUBLIC_PRO_YEARLY_URL`: checkout externo para Safadd+ anual.
- `EXPO_PUBLIC_PRO_LIFETIME_URL`: checkout externo para Safadd+ lifetime.

Builds y updates:

```bash
pnpm --filter safadd-mobile eas:build:android:preview
pnpm --filter safadd-mobile eas:build:android:production
pnpm --filter safadd-mobile eas:update:preview -- --message "preview update"
pnpm --filter safadd-mobile eas:update:production -- --message "production update"
```

Notas:

- `app.config.ts` arma `updates.url` con `https://u.expo.dev/<project-id>`.
- El runtime version usa la policy `appVersion`, así que cada release nativa nueva debe acompañarse con un bump de `version`.
- Si falta `EXPO_PUBLIC_EAS_PROJECT_ID`, la build sigue funcionando pero OTA queda deshabilitado.
