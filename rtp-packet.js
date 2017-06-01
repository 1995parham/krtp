/*
 * +===============================================
 * | Author:        Parham Alvani (parham.alvani@gmail.com)
 * |
 * | Creation Date: 01-06-2017
 * |
 * | File Name:     rtp-packet.js
 * +===============================================
 */


class RTPPacket {
  /**
   * @param {Buffer} payload
   * @param {number} sequenceNumber
   * @param {number} timestamp
   * @param {number} payloadType
   */
  constructor(payload, sequenceNumber, ssrc, timestamp = 0, payloadType = 95) {
    this.payload = payload;
    this.sequenceNumber = sequenceNumber;
    this.ssrc = ssrc;
    this.payloadType = payloadType;
    this.timestamp = timestamp;
  }

  serialize() {
    const buff = Buffer.alloc(12 + this.payload.length);

    /* buff[0] = (V << 6 | P << 5 | X << 4 | CC) */
    buff[0] = 0x80;
    /* buff[1] = (M << 7 | PT) */
    buff[1] = (0 << 7 | this.payloadType);
    /* buff[2, 3] = SN */
    buff.writeUInt16BE(this.sequenceNumber, 2);
    /* buff[4, 5, 6, 7] = TS */
    buff.writeUInt32BE(this.timestamp, 4);
    /* buff[8, 9, 10, 11] = SSRC */
    buff.write(this.ssrc, 8, 4);

    this.payload.copy(buff, 12, 0);

    return buff;
  }
}

module.exports = RTPPacket;
