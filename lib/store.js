import path from 'path';
import { fileURLToPath } from 'url';
import { promises as fs } from 'fs';
import { getHeapCodeStatistics } from 'v8';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default class Store {
  constructor(name = 'store') {
    this.name = name;
    this.filepath = path.normalize(`${__dirname}/../db/${name}.json`);
    this.data = null;
  }

  async has(key) {
    await loadData(this);

    return this.data[key] !== undefined;
  }

  async get(key) {
    await loadData(this);

    if(this.data[key] === undefined) {
      return null;
    } else {
      return this.data[key];
    }
  }

  async set(key, value) {
    await loadData(this);

    this.data[key] = value;
    await storeData(this);
  }
}

async function loadData(store) {
  if(store.data !== null) {
    return;
  }

  // first, make sure the file actually exists
  if(! await doesStoreFileExist(store.filepath)) {
    console.warn(`Store file ${store.filepath} doesn't exist yet. Creating it...`);
    store.data = {};
    await storeData(store);
  }

  let rawData;
  try {
    rawData = await fs.readFile(store.filepath, { encoding: 'utf8' });
  } catch(err) {
    throw new Error(`Could not read from ${store.filepath}: ${err.message}`);
  }

  let data;
  try {
    data = JSON.parse(rawData);
  } catch(err) {
    throw new Error(`Could not parse data from ${store.filepath} as JSON: ${err.message}`);
  }

  store.data = data;
}

async function doesStoreFileExist(filepath) {
  let storeFileExists;
  try {
    await fs.access(filepath);
    storeFileExists = true;
  } catch(err) {
    storeFileExists = false;
  }

  return storeFileExists;
}

async function storeData(store) {
  const rawData = JSON.stringify(store.data);

  try {
    fs.writeFile(store.filepath, rawData, { encoding: 'utf8' });
  } catch(err) {
    throw new Error(`Could not write back to ${store.filepath}: ${err.message}`);
  }
}
