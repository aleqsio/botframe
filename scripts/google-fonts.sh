#!/usr/bin/env bash
set -euo pipefail

REPO_URL="https://github.com/google/fonts.git"
OUTPUT="src/renderer/fonts/googleFonts.json"
WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT

git clone --quiet --depth 1 --filter=blob:none --no-checkout "$REPO_URL" "$WORK_DIR"
git -C "$WORK_DIR" sparse-checkout set --no-cone '/*/*/METADATA.pb'
git -C "$WORK_DIR" checkout --quiet main

entry() {
	awk '
		/^name: "/ { split($0, part, "\""); name = part[2] }
		/^category: "/ { split($0, part, "\""); category = tolower(part[2]); gsub("_", "-", category) }
		/^  style: "/ { split($0, part, "\""); style = part[2] }
		/^  weight: / { if (style == "normal") weights[$2] = 1; if (style == "italic") italic = 1 }
		/^  tag: "wght"/ { axis = 1 }
		/^  min_value: / && axis == 1 { low = $2 + 0 }
		/^  max_value: / && axis == 1 { high = $2 + 0; axis = 2 }
		END {
			if (name == "" || category == "") exit
			if (axis == 2) { list = low "," high; variable = 1 }
			else {
				count = 0
				for (weight in weights) sorted[++count] = weight + 0
				for (i = 1; i <= count; i++) for (j = i + 1; j <= count; j++) if (sorted[j] < sorted[i]) { t = sorted[i]; sorted[i] = sorted[j]; sorted[j] = t }
				list = ""
				for (i = 1; i <= count; i++) list = list (i > 1 ? "," : "") sorted[i]
				if (count == 0) exit
				variable = 0
			}
			printf "[\"%s\",\"%s\",[%s],%d,%d]\n", name, category, list, italic + 0, variable
		}
	' "$1"
}

mkdir -p "$(dirname "$OUTPUT")"
{
	printf '['
	for file in "$WORK_DIR"/*/*/METADATA.pb; do entry "$file"; done | LC_ALL=C sort -u -t'"' -k2,2 | paste -sd, -
	printf ']\n'
} > "$OUTPUT"
bunx oxfmt "$OUTPUT" >/dev/null
echo "Wrote $(grep -c '^[[:space:]]*\["' "$OUTPUT") families to $OUTPUT"
