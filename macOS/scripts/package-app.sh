#!/bin/zsh

set -euo pipefail

script_dir="${0:A:h}"
macos_dir="${script_dir:h}"
configuration="${1:-debug}"
package_tmp="$(mktemp -d)"
trap 'rm -rf "$package_tmp"' EXIT

cd "$macos_dir"
node "$script_dir/generate-programme-catalog.mjs" >/dev/null
if [[ -n "${BINARY_PATH:-}" ]]; then
  binary_path="$BINARY_PATH"
elif [[ "${SKIP_BUILD:-0}" != "1" ]]; then
  swift build -c "$configuration"
  binary_path="$(swift build -c "$configuration" --show-bin-path)/MathStudyPlanner"
else
  binary_path="$macos_dir/.build/debug/MathStudyPlanner"
fi

bundle_dir="$package_tmp/Math Study Planner.app"
contents_dir="$bundle_dir/Contents"
output_dir="$macos_dir/build"
output_bundle="$output_dir/Math Study Planner.app"
output_archive="$output_dir/Math Study Planner.zip"

mkdir -p "$contents_dir/MacOS" "$contents_dir/Resources"
cp "$binary_path" "$contents_dir/MacOS/MathStudyPlanner"
cp "$macos_dir/../icon-512.png" "$contents_dir/Resources/AppIcon.png"
resource_bundle="$(dirname "$binary_path")/MathStudyPlanner_MathStudyPlannerApp.bundle"
if [[ ! -d "$resource_bundle" ]]; then
  echo "Resource bundle missing: $resource_bundle" >&2
  exit 1
fi
ditto "$resource_bundle" "$contents_dir/Resources/MathStudyPlanner_MathStudyPlannerApp.bundle"
cp "$macos_dir/Sources/MathStudyPlannerApp/Resources/programme-catalog.json" \
  "$contents_dir/Resources/MathStudyPlanner_MathStudyPlannerApp.bundle/programme-catalog.json"
cp "$macos_dir/Sources/MathStudyPlannerApp/Resources/programme-catalog.json" \
  "$contents_dir/Resources/programme-catalog.json"

plutil -create xml1 "$contents_dir/Info.plist"
plutil -insert CFBundleDisplayName -string "Math Study Planner" "$contents_dir/Info.plist"
plutil -insert CFBundleExecutable -string "MathStudyPlanner" "$contents_dir/Info.plist"
plutil -insert CFBundleIdentifier -string "com.janslou.mathstudyplanner.macos" "$contents_dir/Info.plist"
plutil -insert CFBundleIconFile -string "AppIcon.png" "$contents_dir/Info.plist"
plutil -insert CFBundleName -string "Math Study Planner" "$contents_dir/Info.plist"
plutil -insert CFBundlePackageType -string "APPL" "$contents_dir/Info.plist"
plutil -insert CFBundleShortVersionString -string "0.11.3" "$contents_dir/Info.plist"
plutil -insert CFBundleVersion -string "18" "$contents_dir/Info.plist"
plutil -insert LSMinimumSystemVersion -string "14.0" "$contents_dir/Info.plist"
plutil -insert NSHighResolutionCapable -bool true "$contents_dir/Info.plist"
plutil -insert NSPrincipalClass -string "NSApplication" "$contents_dir/Info.plist"

xattr -cr "$bundle_dir"
codesign --force --deep --sign - "$bundle_dir"
codesign --verify --deep --strict "$bundle_dir"

mkdir -p "$output_dir"
rm -rf "$output_bundle"
rm -f "$output_archive"
ditto "$bundle_dir" "$output_bundle"
# File Provider may attach Finder metadata while copying into Desktop/iCloud.
# Clean and sign the delivered bundle itself so its signature remains valid.
xattr -cr "$output_bundle"
codesign --force --deep --sign - "$output_bundle"
codesign --verify --deep --strict "$output_bundle"
(
  cd "$package_tmp"
  COPYFILE_DISABLE=1 /usr/bin/zip -qry -X "$output_archive" "Math Study Planner.app"
)

echo "$output_bundle"
echo "$output_archive"
