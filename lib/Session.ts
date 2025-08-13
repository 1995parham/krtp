/*
 * +===============================================
 * | Author:        Parham Alvani (parham.alvani@gmail.com)
 * |
 * | Creation Date: 01-06-2017
 * |
 * | File Name:     session.ts
 * +===============================================
 */
import { randomBytes } from "crypto";
import * as dgram from "dgram";
import { EventEmitter } from "events";
import { Observable, fromEvent } from "rxjs";

import { Packet } from "./Packet.js";
import { ControlSR } from "./Control.js";
import { Readable, Writable } from "stream";

export class ReadRTPStream extends Readable {
  private onMessage: (msg: Packet) => void;

  constructor(private session: Session) {
    super();

    this.session.on("close", () => this.push(null));

    this.onMessage = (msg: Packet) => {
      if (!this.push(msg.payload)) {
        this.session.removeListener("message", this.onMessage);
      }
    };
  }

  _read() {
    if (this.session.listeners("message").indexOf(this.onMessage) === -1) {
      this.session.on("message", this.onMessage);
    }
  }
}

export class WriteRTPStream extends Writable {
  constructor(
    private session: Session,
    private destination: string,
  ) {
    super();
  }

  _write(chunk: Buffer, _encoding: string, callback: (err?: Error) => void) {
    this.session.send(chunk, this.destination).then(
      () => callback(),
      (err) => callback(err),
    );
  }

  _destroy(err: Error, callback: (err: Error) => void) {
    this.session.close();

    callback(err);
  }
}

/**
 * RTP session: an association among a set of participants
 * communicating with RTP.
 */
export class Session extends EventEmitter {
  public on(
    event: "message" | "close" | string,
    listener:
      | ((msg: Packet, rinfo: dgram.RemoteInfo) => void)
      | (() => void)
      | ((...args: unknown[]) => void),
  ): this {
    return super.on(event, listener as (...args: any[]) => void);
  }

  /*
   * The SSRC field identifies
   * the synchronization source
   */
  public readonly ssrc: number;

  public get sequenceNumber(): number {
    return this._sequenceNumber;
  }

  public get packetCount(): number {
    return this._packetCount;
  }

  public get octetCount(): number {
    return this._octetCount;
  }

  private timestamp: number;

  /*
   * The sequence number increments by one for each
   * RTP data packet sent, and may be used by the receiver to detect
   * packet loss and to restore packet sequence.
   */
  private _sequenceNumber: number;

  // the total number of RTP data packets
  private _packetCount: number;

  // the total number of payload octets
  private _octetCount: number;

  // socket for session's data communication
  private socket: dgram.Socket;

  // socket for session's control communication
  private controlSocket: dgram.Socket;

  /**
   * creates a RTP session with RTCP. please note that the port + 1 is used for rtcp communication.
   * @param port - RTP port
   * @param packetType - RTP packet type: This field identifies the format of the RTP
   * payload and determines its interpretation by the application.
   */
  constructor(
    private port: number,
    private packetType: number = 95,
  ) {
    super();

    this.timestamp = (Date.now() / 1000) | 0;

    this._sequenceNumber = randomBytes(2).readUInt16BE(0);

    this.ssrc = randomBytes(4).readUInt32BE(0);

    this._packetCount = 0;

    this._octetCount = 0;

    this.socket = dgram.createSocket("udp4");

    this.socket.on("message", (msg: Buffer, rinfo: dgram.RemoteInfo) => {
      const packet: Packet = Packet.deserialize(msg);
      this.emit("message", packet, rinfo);
    });
    this.socket.bind(this.port, "0.0.0.0");

    this.controlSocket = dgram.createSocket("udp4");
    this.controlSocket.bind(this.port + 1);
  }

  public sendSR(
    address: string = "127.0.0.1",
    timestamp: number = ((Date.now() / 1000) | 0) - this.timestamp,
  ): Promise<void> {
    const packet = new ControlSR(
      this._packetCount,
      this._octetCount,
      this.ssrc,
      timestamp,
    );

    return new Promise<void>((resolve, reject) => {
      this.controlSocket.send(
        packet.serialize(),
        this.port + 1,
        address,
        (err) => {
          if (err) {
            return reject(err);
          }
          return resolve();
        },
      );
    });
  }

  public send(
    payload: Buffer,
    address: string = "127.0.0.1",
    timestamp: number = ((Date.now() / 1000) | 0) - this.timestamp,
  ): Promise<void> {
    const packet = new Packet(
      payload,
      this._sequenceNumber,
      this.ssrc,
      timestamp,
      this.packetType,
    );
    this._sequenceNumber = (this._sequenceNumber + 1) % (1 << 16);
    this._packetCount += 1;
    this._octetCount += payload.length;

    return new Promise<void>((resolve, reject) => {
      this.socket.send(packet.serialize(), this.port, address, (err) => {
        if (err) {
          return reject(err);
        }
        return resolve();
      });
    });
  }

  public close(): void {
    this.socket.close(() => {
      this.emit("close");
    });
    this.controlSocket.close();
  }

  public get message$(): Observable<Packet> {
    return fromEvent(this, "message", (msg) => msg);
  }
}
