/*
 * +===============================================
 * | Author:        Parham Alvani (parham.alvani@gmail.com)
 * |
 * | Creation Date: 03-06-2017
 * |
 * | File Name:     control.js
 * +===============================================
 */

class RTPControlSR {
  constructor (packetCount, octetCount, ssrc, timestamp, ntpTimestamp) {
    this.packetCount = packetCount
    this.octetCount = octetCount
    this.timestamp = timestamp
    if (ntpTimestamp) {
      this.ntpTimestamp = ntpTimestamp
    } else {
      this.ntpTimestamp = Date.now()
    }
    this.ssrc = ssrc
    this.rc = 0
  }

  serialize () {
    const buff = Buffer.alloc(8 + 20)

    /* header */

    /* buff[0] = (V << 6 | P << 5 | RC) */
    buff[0] = (2 << 6 | 0 << 5 | this.rc)
    /* buff[1] = PT */
    buff[1] = 200
    /* buff[2, 3] = length */
    buff.writeUInt16BE((buff.length / 4 | 0) - 1, 2)
    /* buff[4, 5, 6, 7] = SSRC */
    buff.writeUInt32BE(this.ssrc, 4)

    /* sender info */

    /* buff[8, 9, 10, 11] = ntpTS */
    buff.writeUInt32BE(this.ntpTimestamp / 1000 | 0, 8)
    /* buff[12, 13, 14, 15] = ntpTS */
    buff.writeUInt32BE(this.ntpTimestamp % 1000, 12)
    /* buff[16, 17, 18, 19] = TS */
    buff.writeUInt32BE(this.timestamp, 16)
    /* buff[20, 21, 22, 23] = packetCount */
    buff.writeUInt32BE(this.packetCount, 20)
    /* buff[24, 25, 26, 27] = octetCount */
    buff.writeUInt32BE(this.octetCount, 24)

    return buff
  }

  static deserialize (buff) {
    /* header */

    /* buff[0] = (V << 6 | P << 5 | RC) */
    if (buff[0] & 0xC0 >> 6 !== 2) {
      return null
    }
    /* buff[1] = PT */
    if (buff[1] !== 200) {
      return null
    }
    /* buff[2, 3] = length */
    const length = (buff.readUInt16BE(2) + 1) * 4
    if (buff.length !== length) {
      return null
    }
    /* buff[4, 5, 6, 7] = SSRC */
    const ssrc = buff.readUInt32BE(4)

    /* sender info */

    /* buff[8, 9, 10, 11] = ntpTS */
    /* buff[12, 13, 14, 15] = ntpTS */
    const ntpTimestamp = buff.readUInt32BE(8) * 1000 + buff.readUInt32BE(12)
    /* buff[16, 17, 18, 19] = TS */
    const timestamp = buff.readUInt32BE(16)
    /* buff[20, 21, 22, 23] = packetCount */
    const packetCount = buff.readUInt32BE(20)
    /* buff[24, 25, 26, 27] = octetCount */
    const octetCount = buff.readUInt32BE(24)

    const packet = new RTPControlSR(packetCount, octetCount, ssrc,
      timestamp, ntpTimestamp)

    return packet
  }
}

module.exports = {
  RTPControlSR
}
