'use strict';

const storage = require('./storage.js');

const TOKEN_LENGTH = 32;
const ALPHA_UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const ALPHA_LOWER = 'abcdefghijklmnopqrstuvwxyz';
const ALPHA = ALPHA_UPPER + ALPHA_LOWER;
const DIGIT = '0123456789';
const ALPHA_DIGIT = ALPHA + DIGIT;

const generateToken = () => {
  const base = ALPHA_DIGIT.length;
  let key = '';
  for (let i = 0; i < TOKEN_LENGTH; i++) {
    const index = Math.floor(Math.random() * base);
    key += ALPHA_DIGIT[index];
  }
  return key;
};

class Session extends Map {
  constructor(token) {
    super();
    this.token = token;
  }

  static start(client) {
    if (client.session) return client.session;
    const token = generateToken();
    client.token = token;
    const session = new Session(token);
    client.session = session;
    client.setCookie('token', token);
    storage.set(token, session);
    return session;
  }

  static async restore(client) {
    const { cookie } = client;
    if (!cookie) throw new Error('No session');
    const sessionToken = cookie.token;
    if (!sessionToken) throw new Error('No session');
    try {
      const session = await storage.get(sessionToken);
      Object.setPrototypeOf(session, Session.prototype);
      client.token = sessionToken;
      client.session = session;
      return session;
    } catch (err) {
      throw new Error('No session');
    }
  }

  static async delete(client) {
    const { token } = client;
    if (!token) return false;
    client.deleteCookie('token');
    client.token = undefined;
    client.session = null;
    try {
      await storage.delete(token);
      return { token };
    } catch (err) {
      return { token: undefined };
    }
  }

  save() {
    storage.save(this.token);
  }
}

module.exports = Session;
