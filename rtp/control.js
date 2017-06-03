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
  constructor(packetCount, octetCount, ssrc) {
    this.packetCount = packetCount;
    this.octetCount = octetCount;
    this.ssrc = ssrc;
    this.rc = 0;
  }

  serialize() {
    const buff = Buffer.alloc(8 + 20);

    /* buff[0] = (V << 6 | P << 5 | RC) */
    buff[0] = (2 << 6 | 0 << 5 | this.rc);
    /* buff[1] = PT */
    buff[1] = 200;
    /* buff[2, 3] = length */
    /* buff[4, 5, 6, 7] */
    buff.writeUInt32BE(this.ssrc, 4);
  }
}

module.exports = {
  RTPControlSR
};
