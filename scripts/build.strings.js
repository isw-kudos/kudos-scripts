/* eslint-disable import/no-nodejs-modules */
/* eslint-disable import/no-namespace */
import * as fs from 'fs';
import * as p from 'path';
import {sync as globSync} from 'glob';
import {sync as mkdirpSync} from 'mkdirp';

const MESSAGES_PATTERN = './strings/*.json';
const TRANSLATIONS_DIR = './strings/translations';
const LANG_DIR = './public/lang/';
const CONFIG_PATH = './public/config.json';

function parseJSONFile(path) {
  const raw = fs.readFileSync(path, 'utf8');
  if (!raw) {
    console.log('json file not found', path);
    return {};
  }
  return JSON.parse(raw);
}

export default function buildStrings(done) {
  const strings = globSync(MESSAGES_PATTERN)
  .map((filename) => fs.readFileSync(filename, 'utf8'))
  .map((file) => JSON.parse(file))
  .reduce((coll, out) => {
    out = {
      ...out,
      ...coll,
    }
    return out;
  }, {});

  const config = parseJSONFile(CONFIG_PATH);

  const {lang} = config;
  if (!lang || !lang.default) {
    console.log('config does not contain lang', config);
    return done();
  }

  const defaultLangFile = p.join(LANG_DIR, `${lang.default}.json`);
  mkdirpSync(p.dirname(defaultLangFile));
  fs.writeFileSync(defaultLangFile, JSON.stringify(strings, null, 2));

  Object.keys(lang.supported).forEach((baseLocale) => {
    // console.log('updating translations for', baseLocale);
    let base = strings;

    if (baseLocale !== lang.default) {
      base = parseJSONFile(`${TRANSLATIONS_DIR}/${baseLocale}.json`)
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
    })

  })
  return done();
}


    // .reduce((collections, descriptors) => {
    //     descriptors.forEach(({id, defaultMessage}) => {
    //         const namespace  = id.split('.')[0];
    //         let collection = collections[namespace];
    //
    //         if (!collection) {
    //             collection = collections[namespace] = {};
    //         }
    //
    //         if (collection.hasOwnProperty(id)) {
    //             throw new Error(`Duplicate message id: ${id}`);
    //         }
    //
    //         collection[id] = defaultMessage;
    //     });
    //
    //     return collections;
    // }, {});

// Object.keys(namespacedMessages).forEach((namespace) => {
//     const collection = namespacedMessages[namespace];
//     const filename   = p.join(LANG_DIR, namespace, 'en-US.json');
//
//     mkdirpSync(p.dirname(filename));
//     fs.writeFileSync(filename, JSON.stringify(collection, null, 2));
// });
