/* eslint-disable import/no-nodejs-modules */
/* eslint-disable import/no-namespace */
/* eslint-disable no-console */
import * as fs from 'fs';
import * as p from 'path';
import {sync as globSync} from 'glob';
import {sync as mkdirpSync} from 'mkdirp';

const JS_SOURCE = './src/**/*.js';
const DEFAULT_FILE = './strings/default.json';
const LANG_DIR = './public/lang/';
const TRANSLATIONS_DIR = './strings/translations';
const CONFIG_PATH = './public/config.json';

// const translationKeyRE = /translate\('(.+)'\s*(,\s*(({.*})|([\w\d_]+)))?\s*\)/gi;
const translationKeyRE = /translate\('(.+?)'\)/gi;
const translateVarRE = /(translate\([^'].+\))/gi;

const skipFiles = ['./src/util/dates.js'];

function parseJSONFile(path) {
  const raw = fs.readFileSync(path, 'utf8');
  if (!raw) {
    console.log('json file not found', path);
    return {};
  }
  return JSON.parse(raw);
}

function fileExists(path) {
  return new Promise((resolve, reject) => {
    fs.access(path, (err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

function compareTranslation(defaultStrings, translation, locale) {
  const missing = {};
  for (const key in defaultStrings) {
    if (!translation.hasOwnProperty(key)) {
      missing[key] = '';
    }
  }
  for (const key in translation) {
    if (!defaultStrings.hasOwnProperty(key)) {
      console.error(`ERROR: found ${locale} translation for NON-EXISTING key:`, key);
    }
  }
  return missing;
}

function matchAll(str, re) {
  const arr = [];
  let match = re.exec(str);
  while (match) {
    if (match.length === 2) {
      arr.push(match[1]);
    }
    match = re.exec(str);
  }
  return arr;
}

(function() {
  const strings = globSync(JS_SOURCE)
  .map((name) => ({name, contents: fs.readFileSync(name, 'utf8')}))
  .reduce((allStrings, file) => {
    if (skipFiles.indexOf(file.name) !== -1) {
      return allStrings;
    }
    const matches = matchAll(file.contents, translationKeyRE);
    const errors = matchAll(file.contents, translateVarRE);
    if (errors.length) {
      console.error('\x1b[41m',
` ERROR: translate called in a manner that may create errors
  in file: ${file.name}
    - do not pass a variable as key to translate,
    - basically you should only be passing a string to translate... keep it simple`
    );
      console.log('errors', errors);
    }
    // remove escape slashes (these get added back where required by JSON.stringify)
    return allStrings.concat(matches.map(match => match.replace(/\\(.)/g, '$1')));
  }, [])
  .sort((a, b) => {
    const aLower = a.toLowerCase();
    const bLower = b.toLowerCase();
    if (aLower < bLower) return -1;
    if (bLower < aLower) return 1;
    return 0;
  })
  .reduce((obj, str) => {
    obj[str] = '';
    return obj;
  }, {});

  const config = parseJSONFile(CONFIG_PATH);

  const {lang} = config;
  if (!lang || !lang.default) {
    console.log('config does not contain lang', config);
    return;
  }

  mkdirpSync(p.dirname(DEFAULT_FILE));
  fs.writeFileSync(DEFAULT_FILE, JSON.stringify(strings, null, 2));


  Object.keys(lang.supported).forEach((baseLocale) => {
    console.log('updating translations for', baseLocale);
    let base = strings;

    if (baseLocale !== lang.default) {
      base = parseJSONFile(`${TRANSLATIONS_DIR}/${baseLocale}.json`);

      const missing = compareTranslation(strings, base, baseLocale);

      if (Object.keys(missing).length) {
        const missingTranslationsFile = p.join(TRANSLATIONS_DIR, `${baseLocale}-needs-translation.json`);
        fileExists(missingTranslationsFile)
        .then(() => parseJSONFile(missingTranslationsFile))
        .catch(() => ({}))
        .then((alreadyMissing) => {
          fs.writeFileSync(missingTranslationsFile, JSON.stringify({...alreadyMissing, ...missing}, null, 2));
          console.log(`WARNING: saved ${Object.keys(missing).length} missing translations to: ${missingTranslationsFile}`);
        });
      }

      const baseLangFile = p.join(LANG_DIR, `${baseLocale}.json`);
      mkdirpSync(p.dirname(baseLangFile));
      fs.writeFileSync(baseLangFile, JSON.stringify({...strings, ...base}, null, 2));
    }


    lang.supported[baseLocale].forEach((subLocale) => {
      const locale = `${baseLocale}-${subLocale}`;
      console.log(locale);
      const translation = parseJSONFile(`${TRANSLATIONS_DIR}/${locale}.json`);
      const langFile = p.join(LANG_DIR, `${locale}.json`);
      mkdirpSync(p.dirname(langFile));
      fs.writeFileSync(langFile, JSON.stringify({...strings, ...base, ...translation}, null, 2));
    });

  });

})();
