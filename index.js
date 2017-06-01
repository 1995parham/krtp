/*
 * +===============================================
 * | Author:        Parham Alvani (parham.alvani@gmail.com)
 * |
 * | Creation Date: 01-06-2017
 * |
 * | File Name:     index.js
 * +===============================================
 */

const RTPSession = require('./rtp-session');

const s = new RTPSession(1373);
s.send(Buffer.from('hello world'), '192.168.73.100').then(() => {
  console.log('message send');
  s.close();
});
