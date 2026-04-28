# BCCWJ Frequency Dictionary Generator for Yomitan/Yomichan

Generate a Yomitan/Yomichan-compatible frequency dictionary from the official **Balanced Corpus of Contemporary Written Japanese (BCCWJ)** frequency lists.

This repository is a small Node.js converter. It does **not** contain the BCCWJ source data or a prebuilt dictionary archive. You download the official BCCWJ word-list data yourself, run the generator, and then zip the generated JSON files for import into Yomitan or Yomichan.

## What this generates

The script converts a BCCWJ TSV frequency list into a dictionary archive containing:

- `index.json` — dictionary metadata.
- `term_meta_bank_1.json`, `term_meta_bank_2.json`, ... — frequency metadata split into 10,000-entry chunks.

Each generated entry has the shape:

```json
["表記", "freq", {"reading": "よみ", "frequency": 123}]
```

In the generated dictionary, `frequency` is the BCCWJ **rank**, not the raw occurrence count. Lower numbers mean more frequent words.

## Data source

Download the source frequency list from NINJAL:

- [BCCWJ overview](https://clrd.ninjal.ac.jp/bccwj/en/)
- [BCCWJ Word List / frequency-list downloads](https://clrd.ninjal.ac.jp/bccwj/en/freq-list.html)
- [BCCWJ paper: “Balanced corpus of contemporary written Japanese”](https://link.springer.com/article/10.1007/s10579-013-9261-0)

The official BCCWJ word-list page provides several downloads, including Short Unit Word (SUW) and Long Unit Word (LUW) lists. This generator expects the extracted TSV to contain these columns:

- `lemma` — used as the term expression.
- `lForm` — used as the reading source.
- `rank` — written to the Yomitan/Yomichan frequency field.
- `frequency` — used only for optional minimum-occurrence filtering.

Please review NINJAL's terms before redistributing generated dictionaries. The generator preserves the attribution text from `attribution.txt` in the generated `index.json`.

## SUW or LUW?

BCCWJ provides both Short Unit Word and Long Unit Word frequency lists.

Use **SUW** for the usual Yomitan/Yomichan lookup experience. SUW entries are closer to individual lookup terms.

Use **LUW** when you intentionally want longer lexical units. LUW can be useful for compounds and multiword expressions, but it is usually less convenient as a default frequency dictionary.

The `[long-unit-words]` command-line flag does not change parsing behavior. It only changes the generated dictionary title and description from `BCCWJ-SUW` to `BCCWJ-LUW`. Make sure the flag matches the source file you downloaded.

## Requirements

- Node.js 24.2 or newer is recommended.
  - The current script uses ES modules, `import.meta.dirname`, and `import.meta.main`.
  - If you run an older Node.js version and the command exits without generating files, update Node.js first.
- A zip tool, such as `7z`, `zip`, or another archive manager.
- `bash` and `curl` only if you want to refresh the vendored Yomitan language files.
- `npm` only if you want to run the maintenance scripts or ESLint.

The generator itself uses Node.js built-ins plus the vendored Yomitan language files under `vendor/yomitan/ext/js/language/`.

## Setup

```sh
git clone https://github.com/Dvasq1995/yomichan-bccwj-frequency-dictionary.git
cd yomichan-bccwj-frequency-dictionary
npm install
```

`npm install` is mainly for linting and maintenance. It is still recommended because it makes the repository scripts available and keeps the development environment reproducible.

## Optional: update the vendored Yomitan language files

This fork no longer requires manually copying Yomichan's old `japanese-util.js`. Instead, it imports the needed helpers from vendored Yomitan language files.

To refresh those vendored files from the Yomitan repository:

```sh
npm run update:yomitan
npm run lint
```

The update script downloads:

- `vendor/yomitan/ext/js/language/CJK-util.js`
- `vendor/yomitan/ext/js/language/ja/japanese.js`

## Generate a dictionary

Download and extract one of the official BCCWJ frequency-list zip files, then run:

```sh
node main.js <tsv-input-file> <output-directory> [long-unit-words] [min-frequency]
```

Arguments:

| Argument | Required | Description |
| --- | --- | --- |
| `<tsv-input-file>` | Yes | Path to the extracted BCCWJ TSV frequency list. |
| `<output-directory>` | Yes | Directory where `index.json` and `term_meta_bank_*.json` will be written. This directory is deleted and recreated on each run. |
| `[long-unit-words]` | No | Use `true` when generating from an LUW list. Use `false` or omit it for SUW. This affects metadata only. |
| `[min-frequency]` | No | Minimum raw occurrence count to include. Omit it to keep all rows with a valid rank. |

### Examples

Generate a Short Unit Word dictionary:

```sh
node main.js ./data/path-to-suw-list.tsv ./output-suw false
```

Generate a Long Unit Word dictionary:

```sh
node main.js ./data/path-to-luw-list.tsv ./output-luw true
```

Generate a Short Unit Word dictionary while excluding rows with fewer than 50 raw occurrences:

```sh
node main.js ./data/path-to-suw-list.tsv ./output-suw false 50
```

## Create the importable zip

Yomitan/Yomichan expects the dictionary JSON files to be at the root of the zip file, not nested inside the output directory.

Using 7-Zip:

```sh
cd output-suw
7z a -tzip -mx=9 -mm=Deflate -mtc=off -mcu=on ../BCCWJ-SUW.zip ./*.json
cd ..
```

Using Info-ZIP:

```sh
cd output-suw
zip -r -9 ../BCCWJ-SUW.zip ./*.json
cd ..
```

For LUW, change the output directory and archive name accordingly:

```sh
cd output-luw
7z a -tzip -mx=9 -mm=Deflate -mtc=off -mcu=on ../BCCWJ-LUW.zip ./*.json
cd ..
```

## Import into Yomitan

1. Open Yomitan settings.
2. Go to **Dictionaries**.
3. Choose **Import**.
4. Select the generated `BCCWJ-SUW.zip` or `BCCWJ-LUW.zip` file.
5. Enable the dictionary after import if it is not enabled automatically.
6. Refresh any browser tabs where you want the dictionary to appear.

Yomichan users can import the same zip through Yomichan's dictionary import settings.

## How the generator works

For each row in the input TSV, `main.js`:

1. Reads the header row and locates `lemma`, `lForm`, `rank`, and `frequency`.
2. Uses `lemma` as the displayed expression.
3. Converts the `lForm` reading from katakana to hiragana where Yomitan's furigana distribution identifies a reading segment.
4. Parses `rank` and `frequency` as integers.
5. Skips rows without a valid rank.
6. If `[min-frequency]` is set, skips rows whose raw occurrence count is below that threshold.
7. Deduplicates by expression plus reading.
8. If duplicate expression/reading pairs exist, keeps the row with the better rank.
9. Writes `term_meta_bank_*.json` files in chunks of 10,000 entries.
10. Writes `index.json` with dictionary metadata and BCCWJ attribution.

## Limitations

- This is a frequency dictionary generator, not a definition dictionary generator.
- It does not include glosses, examples, pitch accent, or part-of-speech data.
- It does not download BCCWJ data for you.
- It assumes the BCCWJ TSV header names listed above.
- It does not auto-detect whether the source file is SUW or LUW.
- It does not validate the generated zip after packaging.

## Troubleshooting

### The command exits but no output files are created

Check your Node.js version:

```sh
node --version
```

Use Node.js 24.2 or newer. Older versions may not support `import.meta.main`, which this script uses to detect direct execution.

### `ERR_MODULE_NOT_FOUND` for a file under `vendor/yomitan`

Refresh the vendored Yomitan language files:

```sh
npm run update:yomitan
```

Then rerun the generator.

### The generated dictionary imports, but no frequency data appears

Check that:

- The zip contains `index.json` and `term_meta_bank_*.json` at the root.
- You zipped the JSON files themselves, not the parent output folder.
- The dictionary is enabled in Yomitan/Yomichan.
- The term you are checking appears in the BCCWJ list you used.

### The output is unexpectedly small

Check your `[min-frequency]` value. This option filters by raw occurrence count before writing entries. A high value can remove most rows.

Also confirm that the source TSV uses the expected column names: `lemma`, `lForm`, `rank`, and `frequency`.

### The generated title says `BCCWJ-SUW` when you expected `BCCWJ-LUW`

Pass `true` as the third argument after the output directory:

```sh
node main.js ./data/path-to-luw-list.tsv ./output-luw true
```

## Development commands

```sh
npm run lint
npm run lint:fix
npm run update:yomitan
```

`npm run update:latest` upgrades npm dependencies, refreshes the vendored Yomitan language files, and runs linting.

## License and attribution

The converter code is distributed under the MIT License. See `LICENSE.md`.

The BCCWJ source data is provided by the National Institute for Japanese Language and Linguistics (NINJAL). Generated dictionaries should retain the BCCWJ attribution and must follow the applicable BCCWJ usage terms.
