import fs from 'node:fs';
import path from 'node:path';

import {
    convertKatakanaToHiragana,
    distributeFurigana
} from './vendor/yomitan/ext/js/language/ja/japanese.js';

function convertReadingToHiragana(reading, expression) {
    const segments = distributeFurigana(expression, reading);
    let newReading = '';

    for (const {text, reading: furigana} of segments) {
        if (furigana.length > 0) {
            newReading += convertKatakanaToHiragana(furigana);
        } else {
            newReading += text;
        }
    }

    return newReading;
}

function main() {
    if (process.argv.length < 4) {
        process.stdout.write(`Usage:\n  node ${path.basename(process.argv[1])} <tsv-input-file> <output-directory> [long-unit-words] [min-frequency]\n`);
        return 1;
    }

    const inputFileName = process.argv[2];
    const outputDirectory = process.argv[3];
    const longUnitWords = process.argv[4] === 'true';

    let minFrequency = Number.parseInt(process.argv[5], 10);
    if (!Number.isFinite(minFrequency)) {
        minFrequency = null;
    }

    // Read input
    const mode = 'freq';
    const content = fs.readFileSync(inputFileName, {encoding: 'utf8'});
    const lines = content.trim().split(/\r?\n/);
    const separatorPattern = /\t/;

    const keys = lines[0].split(separatorPattern);
    const readingIndex = keys.indexOf('lForm');
    const termIndex = keys.indexOf('lemma');
    const rankIndex = keys.indexOf('rank');
    const frequencyIndex = keys.indexOf('frequency');

    const dataMap = new Map();

    for (let i = 1; i < lines.length; ++i) {
        const values = lines[i].split(separatorPattern);

        const expression = values[termIndex];
        const reading = convertReadingToHiragana(values[readingIndex], expression);
        const rank = Number.parseInt(values[rankIndex], 10);
        const frequency = Number.parseInt(values[frequencyIndex], 10);

        if (typeof rank !== 'number' || !Number.isFinite(rank)) {
            continue;
        }

        if (minFrequency !== null && (typeof frequency !== 'number' || !Number.isFinite(frequency) || frequency < minFrequency)) {
            continue;
        }

        const key = `${expression}\x00${reading}`;
        const current = dataMap.get(key);

        if (typeof current !== 'undefined') {
            if (rank >= current[2].frequency) {
                continue;
            }
        }

        const entry = [expression, mode, {reading, frequency: rank}];
        dataMap.set(key, entry);
    }

    // Convert to chunks
    const data = [...dataMap.values()];
    const dataChunks = [];
    const dataChunkSize = 10000;

    for (let i = 0; i < data.length; i += dataChunkSize) {
        dataChunks.push(data.slice(i, i + dataChunkSize));
    }

    const attribution = fs
        .readFileSync(path.join(import.meta.dirname, 'attribution.txt'), {encoding: 'utf8'})
        .replace(/\r\n/g, '\n');

    // Write
    const dirName = path.resolve(outputDirectory);

    try {
        fs.rmSync(dirName, {recursive: true, force: true});
    } catch {
        // NOP
    }

    try {
        fs.mkdirSync(dirName, {recursive: true});
    } catch {
        // NOP
    }

    for (let i = 0; i < dataChunks.length; ++i) {
        fs.writeFileSync(
            path.join(dirName, `term_meta_bank_${i + 1}.json`),
            JSON.stringify(dataChunks[i], null, 0),
            {encoding: 'utf8'}
        );
    }

    const indexData = {
        title: `BCCWJ-${longUnitWords ? 'LUW' : 'SUW'}`,
        format: 3,
        revision: '1',
        sequenced: false,
        author: 'toasted-nutbread',
        url: 'https://github.com/toasted-nutbread/yomichan-bccwj-frequency-dictionary',
        description: `${longUnitWords ? 'Long' : 'Short'} unit word frequencies from the Balanced Corpus of Contemporary Written Japanese (BCCWJ).`,
        attribution
    };

    fs.writeFileSync(
        path.join(dirName, 'index.json'),
        JSON.stringify(indexData, null, 0),
        {encoding: 'utf8'}
    );

    return 0;
}

if (import.meta.main) {
    process.exit(main());
}