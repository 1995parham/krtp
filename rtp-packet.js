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
    this.csrc = [];
  }

  addCSRC(csrc) {
    if (csrc.length > 31) {
      return;
    }
    this.csrc.append(csrc);
  }

  serialize() {
    const buff = Buffer.alloc(12 + 4 * this.csrc.length + this.payload.length);

    /* buff[0] = (V << 6 | P << 5 | X << 4 | CC) */
    buff[0] = (2 << 6 | 0 << 5 | 0 << 4 | this.csrc.length);
    /* buff[1] = (M << 7 | PT) */
    buff[1] = (0 << 7 | this.payloadType);
    /* buff[2, 3] = SN */
    buff.writeUInt16BE(this.sequenceNumber, 2);
    /* buff[4, 5, 6, 7] = TS */
    buff.writeUInt32BE(this.timestamp, 4);
    /* buff[8, 9, 10, 11] = SSRC */
    buff.write(this.ssrc, 8, 4);

    /* CSRC section */
    for (let i = 0; i < this.csrc.length; i++) {
      buff.write(this.csrc[i], 12 + i * 4, 4);
    }

    this.payload.copy(buff, 12, 0);

    return buff;
  }

}

module.exports = RTPPacket;
