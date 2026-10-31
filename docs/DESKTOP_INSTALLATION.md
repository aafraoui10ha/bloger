# Installing Toolbox Desktop (Windows)

**Supported:** Windows 10 (version 1809 or later) and Windows 11, 64-bit (x64).

The app needs the Microsoft Edge WebView2 runtime. It is already installed on Windows 11 and on up-to-date Windows 10. If it is missing, the installer downloads it, which needs an internet connection.

Phase 2 builds have been tested on GitHub's Windows Server runners and in Chromium. They have **not yet been tested on a range of real PCs**. Hardware requirements will be published after that testing.

## 1. Download the build

1. Open the repository on GitHub, then go to **Actions → Desktop (Windows)**.
2. Open the latest successful run.
3. Under **Artifacts**, download `toolbox-desktop-1.0.0-windows-x64-build-<n>`. It is a ZIP file.
4. Extract the ZIP. It contains:
   - `Toolbox_1.0.0_x64-setup.exe`: the recommended installer. It installs for the current user, with no administrator rights needed.
   - `Toolbox_1.0.0_x64_en-US.msi`: an MSI installer. It installs for all users and needs administrator rights.
   - `SHA256SUMS.txt`: the checksums of both files.

## 2. Check the file (recommended)

In PowerShell, in the extracted folder:

```powershell
Get-FileHash .\Toolbox_1.0.0_x64-setup.exe -Algorithm SHA256
Get-Content .\SHA256SUMS.txt
```

The hash must match the line for that file. If it doesn't, do not run the file.

## 3. Install

1. Double-click `Toolbox_1.0.0_x64-setup.exe`.
2. **Windows SmartScreen** may show "Windows protected your PC". This happens because development builds are **not yet code-signed**. The app is not known to be harmful.
   - Only continue if you downloaded the file from this repository's Actions page and the checksum matched.
   - Then click **More info → Run anyway**.
   - If the warning names an unknown publisher or the file came from anywhere else, do not continue.
3. Choose the installer language (English, Français or العربية) and follow the steps.
4. Start **Toolbox** from the Start menu, or from the desktop shortcut if you created one.

The MSI works the same way. Double-click it and approve the administrator prompt.

## 4. First launch

- The app opens in your Windows display language if it is English, French or Arabic, and in English otherwise. You can change it in **Settings**.
- No account is needed.
- The background remover downloads its AI model once on first use (up to about 135 MB). After that it works from the saved copy.
- When you save a result, Windows asks where to save it.

## 5. Upgrading

Install a newer build over the existing one. Your designs, uploads, favourites and settings are kept: they live in `%LOCALAPPDATA%\com.toolbox.desktop`, which the installer does not touch. Automatic updates are planned for a later phase.

## 6. Uninstalling

Go to **Settings → Apps → Installed apps**, find **Toolbox**, and choose **Uninstall**.

The uninstaller removes the program. With the NSIS installer, the "Delete the application data" box is unchecked by default, so your designs stay unless you tick it. To remove them by hand later, delete `%LOCALAPPDATA%\com.toolbox.desktop`.

## Troubleshooting

| Problem | What to do |
|---|---|
| SmartScreen warning | See step 3. It goes away once installers are code-signed. |
| "WebView2 Runtime" error | Connect to the internet and run the installer again, or install WebView2 from Microsoft. |
| A blank window | Update Windows and your graphics driver. Then start the app once with Windows' "Run as administrator" off. |
| The background remover says "model could not be downloaded" | Check your internet connection or firewall. After the first successful download, it works offline. |
| The app doesn't open a second window | Only one copy runs at a time. Starting it again brings the open window to the front. |
