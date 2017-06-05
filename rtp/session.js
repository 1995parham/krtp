/*
 * +===============================================
 * | Author:        Parham Alvani (parham.alvani@gmail.com)
 * |
 * | Creation Date: 01-06-2017
 * |
 * | File Name:     session.js
 * +===============================================
 */
const crypto = require('crypto');
const dgram = require('dgram');
const EventEmitter = require('events').EventEmitter;

const RTPPacket = require('./packet');

/**
 * RTP session: An association among a set of participants
 * communicating with RTP.
 */
class RTPSession extends EventEmitter {
  /**
   * Creates a RTP session
   * @param {number} port - RTP port
   * @param {number} packetType - RTP packet type
   */
  constructor(port, packetType) {
    super();

    /** @member {number} */
    this.timestamp = Date.now() / 1000 | 0;

    /** @member {number} */
    this.port = port;

    /** @member {number} */
    this.sequenceNumber = crypto.randomBytes(2).readUInt16BE();

    /** @member {number} */
    this.packetType = packetType;

    /**
     * @member {Buffer} - The SSRC field identifies
     * the synchronization source
     */
    this.ssrc = crypto.randomBytes(4).readUInt32BE();

    /** @member {number} - The total number of RTP data packets */
    this.packetCount = 0;

    /** @member {number} - The total number of payload octets */
    this.octetCount = 0;

    /**
     * @member {dgram.Socket} - socket for data communication in session
     */
    this.socket = dgram.createSocket('udp4');
    this.socket.on('message', (msg, rinfo) => {
      const packet = RTPPacket.deserialize(msg);
      this.emit('message', packet, rinfo);
    });
    this.socket.bind(this.port);
  }

  send(payload, address) {
    const packet = new RTPPacket(payload, this.sequenceNumber,
      this.ssrc, (Date.now() / 1000 | 0) - this.timestamp);

    const promise = new Promise((resolve, reject) => {
      this.socket.send(packet.serialize(), this.port, address, (err) => {
        if (err) {
          return reject(err);
        }
        this.sequenceNumber = (this.sequenceNumber + 1) % (1 << 16);
        this.packetCount++;
        this.octetCount += payload.length;
        return resolve();
      });
    });

    return promise;
  }

  close() {
    this.socket.close();
  }
}

module.exports = RTPSession;
