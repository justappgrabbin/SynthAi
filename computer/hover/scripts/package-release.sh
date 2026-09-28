#!/usr/bin/env bash
set -euo pipefail

package_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
package_name="$(basename "$package_dir")"
parent_dir="$(dirname "$package_dir")"
output_dir="${1:-$parent_dir}"
profile="${2:-full}"

case "$profile" in
  full)
    archive="$output_dir/$package_name.zip"
    ;;
  public)
    archive="$output_dir/$package_name-PUBLIC.zip"
    ;;
  *)
    echo "profile must be 'full' or 'public'" >&2
    exit 1
    ;;
esac

command -v zip >/dev/null 2>&1 || {
  echo "zip is required" >&2
  exit 1
}

mkdir -p "$output_dir"
cd "$package_dir"
npm test
npm run verify >/dev/null

cd "$parent_dir"
rm -f "$archive"

exclude=(
  "$package_name/node_modules/*"
  "$package_name/.git/*"
  "$package_name/.synthia-state/*"
  "$package_name/deliverables/*"
  "$package_name/.DS_Store"
)

if [[ "$profile" == "public" ]]; then
  # The public distribution retains the integrated vendor trees but omits the
  # immutable donor ZIPs and user-supplied Black Book image/PDF references.
  # Their names, hashes, and provenance remain in text manifests.
  exclude+=("$package_name/authorities/originals/*")
  exclude+=("$package_name/authorities/black-book-dimension-perspectives/*.png")
  exclude+=("$package_name/authorities/black-book-dimension-perspectives/*.pdf")
  exclude+=("$package_name/backups/*")
fi

zip -q -r "$archive" "$package_name" -x "${exclude[@]}"

sha256sum "$archive" | tee "$archive.sha256"
unzip -t "$archive" >/dev/null
echo "Verified release: $archive"
