'use strict';

const fsp = require('node:fs/promises');
const path = require('node:path');
const v8 = require('node:v8');

const PATH = `${__dirname}/sessions`;

const exist = async (file) => {
  const toBool = [() => true, () => false];
  const isExist = await fsp.access(file).then(...toBool);
  return isExist;
};

const safePath = (fn) => async (token, ...args) => {
  if (typeof token !== 'string') {
    throw new Error('Invalid session token');
  }
  const fileName = path.join(PATH, token);
  if (!fileName.startsWith(PATH)) {
    throw new Error('Invalid session token');
  }
  if (!exist(fileName)) {
    console.log('Token not found!');
    throw new Error('Invalid session token');
  }
  return await fn(fileName, ...args);
};

const readSession = safePath(fsp.readFile);
const writeSession = safePath(fsp.writeFile);
const deleteSession = safePath(fsp.unlink);

class Storage extends Map {
  async get(key) {
    const value = super.get(key);
    if (value) return value;
    const data = await readSession(key);
    console.log(`Session loaded: ${key}`);
    const session = v8.deserialize(data);
    super.set(key, session);
    return session;
  }

  async save(key) {
    const value = super.get(key);
    if (value) {
      const data = v8.serialize(value);
      await writeSession(key, data);
      console.log(`Session saved: ${key}`);
    }
  }

  async delete(key) {
    console.log('Delete: ', key);
    return await deleteSession(key);
  }
}

module.exports = new Storage();
