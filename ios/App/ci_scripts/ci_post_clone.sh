#!/bin/sh
set -eu

# Xcode Cloud calls this script from ci_scripts, not the repository root.
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPOSITORY_ROOT=${CI_PRIMARY_REPOSITORY_PATH:-$(CDPATH= cd -- "$SCRIPT_DIR/../../.." && pwd)}
cd "$REPOSITORY_ROOT"

# Capacitor 8 requires Node 22 or newer. Homebrew is available on Xcode Cloud.
if ! command -v node >/dev/null 2>&1 || ! node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 22 ? 0 : 1)'; then
    brew install node@22
    PATH="$(brew --prefix node@22)/bin:$PATH"
    export PATH
fi

# Install the locked packages, generate bundled app assets, and include native
# plugins (including Haptics) before Xcode reads the local Swift package.
npm ci --include=dev
npm run build
npx --no-install cap sync ios

# Cloud archives use strict resolution. Resolve after cap sync changes the
# manifest so Xcode itself refreshes Package.resolved and its originHash.
# Keep Apple's strict checks enabled during the actual archive.
xcodebuild -resolvePackageDependencies \
    -project "$REPOSITORY_ROOT/ios/App/App.xcodeproj" \
    -scheme "${CI_XCODE_SCHEME:-App}" \
    -disableAutomaticPackageResolution NO \
    -onlyUsePackageVersionsFromResolvedFile NO

test -s "$REPOSITORY_ROOT/ios/App/App.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved"
printf '%s\n' 'App assets, native plugins and Swift packages are ready for Xcode Cloud.'