/*
 * +===============================================
 * | Author:        Parham Alvani (parham.alvani@gmail.com)
 * |
 * | Creation Date: 01-06-2017
 * |
 * | File Name:     index.js
 * +===============================================
 */
const RTPWriteStream = require('./rtp/streams').RTPWriteStream;

module.exports = {
  RTPSession: require('./rtp/session'),
  RTPPacket: require('./rtp/packet'),
  createWriteStream(timediff, port, address, bind) {
    return new RTPWriteStream(timediff, port, address, bind);
  }
};
