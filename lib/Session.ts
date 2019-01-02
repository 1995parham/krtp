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
import { RTPControlSR } from './Control';

export declare interface RTPSession {
    on(event: 'message', listener: (msg: RTPPacket, rinfo: any) => void): this;
    on(event: string, listener: Function): this;
}

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
  private _sequenceNumber: number;
  public get sequenceNumber(): number {
    return this._sequenceNumber;
  }

  /*
   * The SSRC field identifies
   * the synchronization source
   */
  readonly ssrc: number;

  /* The total number of RTP data packets */
  private _packetCount: number;
  public get packetCount(): number {
    return this._packetCount;
  }

  /* The total number of payload octets */
  private _octetCount: number;
  public get octetCount(): number {
    return this._octetCount;
  }

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
    private packetType: number = 95,
  ) {
    super()

    this.timestamp = Date.now() / 1000 | 0;

    this._sequenceNumber = crypto.randomBytes(2).readUInt16BE(0);

    this.ssrc = crypto.randomBytes(4).readUInt32BE(0);

    this._packetCount = 0;

    this._octetCount = 0;

    this.socket = dgram.createSocket('udp4');

    this.socket.on('message', (msg, rinfo) => {
      const packet = RTPPacket.deserialize(msg);
      this.emit('message', packet, rinfo);
    })
    this.socket.bind(this.port);

    this.controlSocket = dgram.createSocket('udp4');
    this.controlSocket.bind(this.port + 1);
  }

  public sendSR (address: string = '127.0.0.1', timestamp: number = (Date.now() / 1000 | 0) - this.timestamp): Promise<void> {

    const packet = new RTPControlSR(this.packetCount, this.octetCount,
      this.ssrc, timestamp);

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

  public send (payload: Buffer, address: string = '127.0.0.1', timestamp: number = (Date.now() / 1000 | 0) - this.timestamp): Promise<void> {

    const packet = new RTPPacket(payload, this.sequenceNumber,
      this.ssrc, timestamp, this.packetType);

    return new Promise<void>((resolve, reject) => {
      this.socket.send(packet.serialize(), this.port, address, (err) => {
        if (err) {
          return reject(err);
        }
        this._sequenceNumber = (this._sequenceNumber + 1) % (1 << 16);
        this._packetCount++;
        this._octetCount += payload.length;
        return resolve();
      })
    });
  }

  public close (): void {
    this.socket.close();
    this.controlSocket.close();
  }
}
