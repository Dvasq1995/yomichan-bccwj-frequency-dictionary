#!/usr/bin/env bash
set -euo pipefail

YOMITAN_REF="master"
YOMITAN_RAW_BASE="https://raw.githubusercontent.com/yomidevs/yomitan/${YOMITAN_REF}"

LANGUAGE_DIR="vendor/yomitan/ext/js/language"
JAPANESE_DIR="${LANGUAGE_DIR}/ja"

download_file() {
    local url="$1"
    local output_path="$2"
    local temporary_path="${output_path}.tmp"

    mkdir -p "$(dirname "${output_path}")"

    curl \
        --fail \
        --location \
        --silent \
        --show-error \
        --output "${temporary_path}" \
        "${url}"

    mv "${temporary_path}" "${output_path}"
}

download_file \
    "${YOMITAN_RAW_BASE}/ext/js/language/CJK-util.js" \
    "${LANGUAGE_DIR}/CJK-util.js"

download_file \
    "${YOMITAN_RAW_BASE}/ext/js/language/ja/japanese.js" \
    "${JAPANESE_DIR}/japanese.js"

printf 'Downloaded latest Yomitan language files:\n'
printf '  %s\n' "${LANGUAGE_DIR}/CJK-util.js"
printf '  %s\n' "${JAPANESE_DIR}/japanese.js"