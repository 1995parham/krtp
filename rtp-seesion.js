/*
 * +===============================================
 * | Author:        Parham Alvani (parham.alvani@gmail.com)
 * |
 * | Creation Date: 01-06-2017
 * |
 * | File Name:     rtp-seesion.js
 * +===============================================
 */
const crypto = require('crypto');


/**
 * RTP session: An association among a set of participants
 * communicating with RTP.
 */
class RTPSession {
  /**
   * Creates a RTP session
   */
  constructor() {
    /** @member {int} */
    this.squenceNumber = crypto.randomBytes(2).readInt16BE();
    /** @member {buffer} */
    this.ssrc = crypto.randomBytes(4);
  }
}

module.exports = RTPSession;
