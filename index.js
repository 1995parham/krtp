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

const session = new RTPSession(1373);

console.log(session);
