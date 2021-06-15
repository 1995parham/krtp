/*
 * +===============================================
 * | Author:        Parham Alvani (parham.alvani@gmail.com)
 * |
 * | Creation Date: 03-06-2017
 * |
 * | File Name:     Control.ts
 * +===============================================
 */

/**
 * ControlSR implements sender report message of real-time control protocol.
 * The sender report is sent periodically by the active senders in a conference to report transmission
 * and reception statistics for all RTP packets sent during the interval.
 */
export class ControlSR {
  public readonly packetCount: number;
  public readonly octetCount: number;
  public readonly ssrc: number;
  public readonly timestamp: number;
  public readonly ntpTimestamp: number;

  private rc: number = 0; // Reception report count

  constructor(
    packetCount: number,
    octetCount: number,
    ssrc: number,
    timestamp: number,
    ntpTimestamp: number = Date.now()
  ) {
    this.packetCount = packetCount;
    this.octetCount = octetCount;
    this.ssrc = ssrc;
    this.timestamp = timestamp;
    this.ntpTimestamp = ntpTimestamp;
  }

  public static deserialize(buff: Buffer): ControlSR {
    // header

    // buff[0] = (V << 6 | P << 5 | RC)
    if ((buff[0] & (0xc0 >> 6)) !== 2) {
      throw new Error("Invalid RTCP packet");
    }
    // buff[1] = PT
    if (buff[1] !== 200) {
      throw new Error("Invalid RTCP packet");
    }
    // buff[2, 3] = length
    const length: number = (buff.readUInt16BE(2) + 1) * 4;
    if (buff.length !== length) {
      throw new Error("Invalid RTCP packet");
    }
    // buff[4, 5, 6, 7] = SSRC
    const ssrc: number = buff.readUInt32BE(4);

    // sender info

    // buff[8, 9, 10, 11] = ntpTS
    // buff[12, 13, 14, 15] = ntpTS
    const ntpTimestamp: number =
      buff.readUInt32BE(8) * 1000 + buff.readUInt32BE(12);
    // buff[16, 17, 18, 19] = TS
    const timestamp: number = buff.readUInt32BE(16);
    // buff[20, 21, 22, 23] = packetCount
    const packetCount: number = buff.readUInt32BE(20);
    // buff[24, 25, 26, 27] = octetCount
    const octetCount: number = buff.readUInt32BE(24);

    return new ControlSR(
      packetCount,
      octetCount,
      ssrc,
      timestamp,
      ntpTimestamp
    );
  }

  public serialize(): Buffer {
    const buff: Buffer = Buffer.alloc(8 + 20);

    // header

    // buff[0] = (V << 6 | P << 5 | RC)
    buff[0] = (2 << 6) | (0 << 5) | this.rc;
    // buff[1] = PT
    // Sender Report Packet Type
    buff[1] = 200;
    // buff[2, 3] = length
    buff.writeUInt16BE(((buff.length / 4) | 0) - 1, 2);
    // buff[4, 5, 6, 7] = SSRC
    buff.writeUInt32BE(this.ssrc, 4);

    // sender info

    // buff[8, 9, 10, 11] = ntpTS
    buff.writeUInt32BE((this.ntpTimestamp / 1000) | 0, 8);
    // buff[12, 13, 14, 15] = ntpTS
    buff.writeUInt32BE(this.ntpTimestamp % 1000, 12);
    // buff[16, 17, 18, 19] = TS
    buff.writeUInt32BE(this.timestamp, 16);
    // buff[20, 21, 22, 23] = packetCount
    buff.writeUInt32BE(this.packetCount, 20);
    // buff[24, 25, 26, 27] = octetCount
    buff.writeUInt32BE(this.octetCount, 24);

    return buff;
  }
}
