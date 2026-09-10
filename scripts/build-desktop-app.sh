#!/usr/bin/env bash
set -euo pipefail

REPO_URL="git@github.com:aleqsio/botframe.git"
BUILD_DIR="$HOME/Library/Caches/botframe-build"
APP_NAME="Botframe"
DEST_APP="$HOME/Desktop/$APP_NAME.app"

if [[ "$(uname -s)" != "Darwin" ]]; then
	echo "This script builds a macOS .app. Run it on macOS." >&2
	exit 1
fi

if ! command -v bun >/dev/null 2>&1; then
	echo "bun is not installed. Install it from https://bun.sh first." >&2
	exit 1
fi

if [[ -d "$BUILD_DIR/.git" ]]; then
	git -C "$BUILD_DIR" fetch origin main
	git -C "$BUILD_DIR" reset --hard origin/main
	git -C "$BUILD_DIR" clean -fdx -e node_modules
else
	rm -rf "$BUILD_DIR"
	git clone --branch main "$REPO_URL" "$BUILD_DIR"
fi

COMMIT="$(git -C "$BUILD_DIR" rev-parse --short HEAD)"
echo "Building botframe @ $COMMIT"

cd "$BUILD_DIR"
bun install --frozen-lockfile
bun run build

ELECTRON_APP="$BUILD_DIR/node_modules/electron/dist/Electron.app"
if [[ ! -d "$ELECTRON_APP" ]]; then
	# bun can mark electron as installed without its postinstall download
	# having finished. Run the download directly as a repair step.
	node node_modules/electron/install.js
fi
if [[ ! -d "$ELECTRON_APP" ]]; then
	echo "Electron.app not found at $ELECTRON_APP" >&2
	exit 1
fi

STAGING="$(mktemp -d)"
trap 'rm -rf "$STAGING"' EXIT
STAGED_APP="$STAGING/$APP_NAME.app"

cp -R "$ELECTRON_APP" "$STAGED_APP"

# No electron-builder/forge config exists, so pack by hand: swap Electron's
# own prebuilt shell's default resources for our built out/ folder.
RESOURCES="$STAGED_APP/Contents/Resources"
rm -f "$RESOURCES/default_app.asar"
rm -rf "$RESOURCES/app"
mkdir -p "$RESOURCES/app"
cp "$BUILD_DIR/package.json" "$RESOURCES/app/package.json"
cp -R "$BUILD_DIR/out" "$RESOURCES/app/out"

PLIST="$STAGED_APP/Contents/Info.plist"
/usr/libexec/PlistBuddy -c "Set :CFBundleName $APP_NAME" "$PLIST"
/usr/libexec/PlistBuddy -c "Set :CFBundleDisplayName $APP_NAME" "$PLIST"
/usr/libexec/PlistBuddy -c "Set :CFBundleIdentifier design.aleqsio.botframe" "$PLIST" 2>/dev/null \
	|| /usr/libexec/PlistBuddy -c "Add :CFBundleIdentifier string design.aleqsio.botframe" "$PLIST"

# Re-sign ad hoc: editing Resources invalidates Electron's original signature,
# and an unsigned app will not launch on Apple Silicon.
codesign --force --deep --sign - "$STAGED_APP"

rm -rf "$DEST_APP"
cp -R "$STAGED_APP" "$DEST_APP"

echo "Built $DEST_APP from main @ $COMMIT"
open -R "$DEST_APP"
