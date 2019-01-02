/*
 * +===============================================
 * | Author:        Parham Alvani (parham.alvani@gmail.com)
 * |
 * | Creation Date: 01-06-2017
 * |
 * | File Name:     session.ts
 * +===============================================
 */
import * as crypto from 'crypto';
import * as dgram from 'dgram';
import EventEmitter from 'events';

import { RTPPacket } from './Packet';

const RTPControlSR = require('./control').RTPControlSR

/**
 * RTP session: An association among a set of participants
 * communicating with RTP.
 */
export class RTPSession extends EventEmitter {
  private timestamp: number;

  /*
   * The sequence number increments by one for each
   * RTP data packet sent, and may be used by the receiver to detect
   * packet loss and to restore packet sequence.
   */
  private sequenceNumber: number;

  /*
   * The SSRC field identifies
   * the synchronization source
   */
  private ssrc: number;

  /* The total number of RTP data packets */
  private packetCount: number;

  /* The total number of payload octets */
  private octetCount: number;

  /* socket for session's data communication */
  private socket: dgram.Socket;

  /* socket for session's control communication */
  private controlSocket: dgram.Socket;

  /**
   * Creates a RTP session
   * @param port - RTP port
   * @param packetType - RTP packet type: This field identifies the format of the RTP
   * payload and determines its interpretation by the application.
   */
  constructor (
    private port: number,
    private packetType: number,
  ) {
    super()

    this.timestamp = Date.now() / 1000 | 0;

    this.sequenceNumber = crypto.randomBytes(2).readUInt16BE(0);

    this.ssrc = crypto.randomBytes(4).readUInt32BE(0);

    this.packetCount = 0;

    this.octetCount = 0;

    this.socket = dgram.createSocket('udp4');

    this.socket.on('message', (msg, rinfo) => {
      const packet = RTPPacket.deserialize(msg);
      this.emit('message', packet, rinfo);
    })
    this.socket.bind(this.port);

    this.controlSocket = dgram.createSocket('udp4');
    this.controlSocket.bind(this.port + 1);
  }

  public sendSR (address: string, timestamp: number): Promise<void> {
    let ts = 0;
    if (timestamp) {
      ts = timestamp;
    } else {
      ts = (Date.now() / 1000 | 0) - this.timestamp;
    }

    const packet = new RTPControlSR(this.packetCount, this.octetCount,
      this.ssrc, ts);

    return new Promise<void>((resolve, reject) => {
      this.controlSocket.send(packet.serialize(), this.port + 1,
        address, (err) => {
          if (err) {
            return reject(err);
          }
          return resolve();
        }
      )
    })
  }

  public send (payload: Buffer, address: string, timestamp: number): Promise<void> {
    let ts = 0;
    if (timestamp) {
      ts = timestamp;
    } else {
      ts = (Date.now() / 1000 | 0) - this.timestamp;
    }

    const packet = new RTPPacket(payload, this.sequenceNumber,
      this.ssrc, ts, this.packetType);

    return new Promise<void>((resolve, reject) => {
      this.socket.send(packet.serialize(), this.port, address, (err) => {
        if (err) {
          return reject(err);
        }
        this.sequenceNumber = (this.sequenceNumber + 1) % (1 << 16);
        this.packetCount++;
        this.octetCount += payload.length;
        return resolve();
      })
    });
  }

  public close (): void {
    this.socket.close();
    this.controlSocket.close();
  }
}
