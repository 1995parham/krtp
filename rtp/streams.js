/*
 * +===============================================
 * | Author:        Parham Alvani (parham.alvani@gmail.com)
 * |
 * | Creation Date: 11-06-2017
 * |
 * | File Name:     streams.js
 * +===============================================
 */

const stream = require('stream');
const dgram = require('dgram');
const crypto = require('crypto');

const RTPPacket = require('./packet');

/**
 * RTP write stream: write stream of data as a sequence of
 * RTP packets.
 */
class RTPWriteStream extends stream.Writable {
  constructor(address, port, timediff) {
    super({
      objectMode: false
    });

    /** @member {String} */
    this.address = address;

    /** @member {number} */
    this.port = port;

    /** @member {number} */
    this.timestamp = 0;

    /** @member {number} */
    this.timediff = timediff;

    /**
     * @member {number} - The sequence number increments by one for each
     * RTP data packet sent, and may be used by the receiver to detect
     * packet loss and to restore packet sequence.
     */
    this.sequenceNumber = crypto.randomBytes(2).readUInt16BE();

    /**
     * @member {Buffer} - The SSRC field identifies
     * the synchronization source
     */
    this.ssrc = crypto.randomBytes(4).readUInt32BE();

    /**
     * @member {dgram.Socket} - socket for data communication in session
     */
    this.socket = dgram.createSocket('udp4');
    this.socket.bind(this.port);
  }

  _write(chunk, encoding, callback) {
    const packet = new RTPPacket(chunk, this.sequenceNumber,
      this.ssrc, this.timestamp);

    this.socket.send(packet.serialize(), this.port, this.address, (err) => {
      if (err) {
        return callback(err);
      }
      this.sequenceNumber = (this.sequenceNumber + 1) % (1 << 16);
      this.timestamp += this.timediff;
    });

  }

  _final(callback) {
    this.socket.close();
    callback();
  }
}

module.exports = {
  RTPWriteStream
};
