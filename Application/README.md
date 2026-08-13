# SomAI mobile (user role)

Flutter app for **users only**. Admin and Doctor accounts use the web app.

## Run

1. Start Flask: `cd Backend && python app.py` (port `5000`).
2. From this folder:

```bash
flutter pub get
flutter run
```

API URLs:

| Device | Base URL |
| --- | --- |
| iOS simulator / macOS | `http://127.0.0.1:5000` |
| Android emulator | `http://10.0.2.2:5000` |
| Physical phone | your computer’s LAN IP, e.g. `http://192.168.1.10:5000` |

Override with:

```bash
flutter run --dart-define=API_BASE_URL=http://192.168.1.10:5000
```

## Layout

Only `lib/main.dart` sits at the Dart root. Everything else is under `lib/app/` (Provider structure: `core`, `models`, `providers`, `services`, `screens`, `widgets`).
