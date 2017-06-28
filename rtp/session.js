/*
 * +===============================================
 * | Author:        Parham Alvani (parham.alvani@gmail.com)
 * |
 * | Creation Date: 01-06-2017
 * |
 * | File Name:     session.js
 * +===============================================
 */
const crypto = require('crypto')
const dgram = require('dgram')
const events = require('events')

const RTPPacket = require('./packet')

const RTPControlSR = require('./control').RTPControlSR

/**
 * RTP session: An association among a set of participants
 * communicating with RTP.
 */
class RTPSession extends events.EventEmitter {
  /**
   * Creates a RTP session
   * @param {number} port - RTP port
   * @param {number} packetType - RTP packet type
   */
  constructor (port, packetType) {
    super()

    /** @member {number} */
    this.timestamp = Date.now() / 1000 | 0

    /** @member {number} */
    this.port = port

    /**
     * @member {number} - The sequence number increments by one for each
     * RTP data packet sent, and may be used by the receiver to detect
     * packet loss and to restore packet sequence.
     */
    this.sequenceNumber = crypto.randomBytes(2).readUInt16BE()

    /**
     * @member {number} - This field identifies the format of the RTP
     * payload and determines its interpretation by the application.
     */
    this.packetType = packetType

    /**
     * @member {Buffer} - The SSRC field identifies
     * the synchronization source
     */
    this.ssrc = crypto.randomBytes(4).readUInt32BE()

    /** @member {number} - The total number of RTP data packets */
    this.packetCount = 0

    /** @member {number} - The total number of payload octets */
    this.octetCount = 0

    /**
     * @member {dgram.Socket} - socket for data communication in session
     */
    this.socket = dgram.createSocket('udp4')
    this.socket.on('message', (msg, rinfo) => {
      const packet = RTPPacket.deserialize(msg)
      this.emit('message', packet, rinfo)
    })
    this.socket.bind(this.port)

    /**
     * @member {dgram.Socket} - socket for control communication in session
     */
    this.controlSocket = dgram.createSocket('udp4')
    this.controlSocket.bind(this.port + 1)
  }

  sendSR (address, timestamp) {
    let ts = 0
    if (timestamp) {
      ts = timestamp
    } else {
      ts = (Date.now() / 1000 | 0) - this.timestamp
    }

    const packet = new RTPControlSR(this.packetCount, this.octetCount,
      this.ssrc, ts)

    const promise = new Promise((resolve, reject) => {
      this.controlSocket.send(packet.serialize(), this.port + 1,
        address, (err) => {
          if (err) {
            return reject(err)
          }
          return resolve()
        }
      )
    })

    return promise
  }

  send (payload, address, timestamp) {
    let ts = 0
    if (timestamp) {
      ts = timestamp
    } else {
      ts = (Date.now() / 1000 | 0) - this.timestamp
    }

    const packet = new RTPPacket(payload, this.sequenceNumber,
      this.ssrc, ts)

    const promise = new Promise((resolve, reject) => {
      this.socket.send(packet.serialize(), this.port, address, (err) => {
        if (err) {
          return reject(err)
        }
        this.sequenceNumber = (this.sequenceNumber + 1) % (1 << 16)
        this.packetCount++
        this.octetCount += payload.length
        return resolve()
      })
    })

    return promise
  }

  close () {
    this.socket.close()
    this.controlSocket.close()
  }
}

module.exports = RTPSession
