<p align="center">
  <img src="https://github.com/user-attachments/assets/179d2416-89ce-49c3-ab68-ad88beb870d9" height="455" alt="Expinance Logo" />
</p>

# Expinance

Expinance is a modern, privacy-first personal finance application that helps users track their spending, manage subscriptions, and analyze their financial habits. Built entirely with local-first principles, it leverages AI for intelligent receipt scanning and voice commands without forcing data to the cloud.


### Screenshots


<p align="center">
  <img src="https://github.com/user-attachments/assets/c6ea21bc-5b64-4793-b471-fbfd55ffc03c" height="400" />
  <img src="https://github.com/user-attachments/assets/39b7de42-5cae-46e6-9193-fdd0b8f4dfdb" height="400" />
  <img src="https://github.com/user-attachments/assets/95f1346d-a92f-4c88-860c-8429c62fb40a" height="400" />
  <img src="https://github.com/user-attachments/assets/c8f33c0b-fc28-4377-9479-3071d6b62e99" height="400" />
  <img src="https://github.com/user-attachments/assets/af9429f6-edc9-499f-a77c-95951769f289" height="400" />
  <img src="https://github.com/user-attachments/assets/cb13c23e-1d0e-4ad3-a4bc-13f680d73f51" height="400" />
  <img src="https://github.com/user-attachments/assets/63d2c6fc-7592-43c3-bd52-43fdc45df15d" height="400" />
</p>


### Key Features
* **Privacy-First & Secure:** All financial data is stored locally on your device via SQLite. Includes built-in App Locking with Biometric (Face ID/Fingerprint) and custom PIN protection.
* **AI-Powered Insights:** Users can enter their personal Google Gemini API key to unlock smart features like voice-command transaction logging and automated receipt scanning.
* **Interactive Visualizations:** High-performance, animated charts using `@shopify/react-native-skia` and `victory-native`.
* **Comprehensive Tracking:** Track multiple accounts, categorize transactions, and seamlessly manage recurring subscriptions.
* **Offline Capable:** The core app functions perfectly without an internet connection.

### Tech Stack
* **Framework:** React Native (v0.83) / Expo SDK 55
* **State Management:** Zustand
* **Storage:** Expo SQLite & Expo File System
* **Navigation:** React Navigation v7
* **Animations:** React Native Reanimated v4 & Shopify Skia
* **AI:** Google Generative AI (`@google/generative-ai`)

### Getting Started

**For Users:**
1. Go to the [Releases](https://github.com/ASIFxRAHMAN/Expinance/releases) page.
2. Download the latest `.apk` file.
3. Install it on your Android device (ensure "Install from Unknown Sources" is enabled).
4. (Optional) To use Voice Commands and Reciept Scanning, enter your personal API key from (https://aistudio.google.com/) in the settings. (Internet access is required when using this feature)

**For Developers:**

**Prerequisites:**
* Node.js (v18+)
* Android Studio (SDK 34+)

**Installation:**
1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/ASIFxRAHMAN/expinance.git](https://github.com/ASIFxRAHMAN/expinance.git)
    cd expinance
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Build and launch (Android):**
    ```bash
    npx expo run:android
    ```

### Configuration
**API Keys:** No keys are required to build. The Gemini API key is opt-in and entered by the user within the app's Settings screen at runtime.

### License
Distributed under the MIT License. See `LICENSE` for more information.
