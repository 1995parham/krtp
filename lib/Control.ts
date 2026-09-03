/*
 * +===============================================
 * | Author:        Parham Alvani (parham.alvani@gmail.com)
 * |
 * | Creation Date: 03-06-2017
 * |
 * | File Name:     Control.ts
 * +===============================================
 */

/** RTCP packet type of a sender report (RFC 3550 6.4.1). */
const PT_SR = 200;

/** Length of an SR without any reception report blocks: 8 header + 20 sender info. */
const SR_LENGTH = 28;

/** Seconds between the NTP epoch (1900-01-01) and the Unix epoch (1970-01-01). */
const NTP_UNIX_OFFSET = 2208988800;

/**
 * Converts a Unix timestamp in milliseconds into the 64-bit NTP timestamp
 * format used on the wire: 32 bits of seconds since 1900 and 32 bits of
 * fractional second.
 */
export function toNTP(unixMilliseconds: number): {
  seconds: number;
  fraction: number;
} {
  const seconds = Math.floor(unixMilliseconds / 1000) + NTP_UNIX_OFFSET;
  const fraction = Math.round(((unixMilliseconds % 1000) / 1000) * 0x1_0000_0000);
  return { seconds: seconds >>> 0, fraction: fraction >>> 0 };
}

/** Converts a 64-bit NTP timestamp back into Unix milliseconds. */
export function fromNTP(seconds: number, fraction: number): number {
  return Math.round(
    (seconds - NTP_UNIX_OFFSET) * 1000 + (fraction / 0x1_0000_0000) * 1000,
  );
}

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
  /** Wall-clock time of this report as Unix milliseconds; encoded as NTP on the wire. */
  public readonly ntpTimestamp: number;

  private rc: number = 0; // Reception report count

  constructor(
    packetCount: number,
    octetCount: number,
    ssrc: number,
    timestamp: number,
    ntpTimestamp: number = Date.now(),
  ) {
    this.packetCount = packetCount;
    this.octetCount = octetCount;
    this.ssrc = ssrc;
    this.timestamp = timestamp;
    this.ntpTimestamp = ntpTimestamp;
  }

  public static deserialize(buff: Buffer): ControlSR {
    if (buff.length < SR_LENGTH) {
      throw new Error("invalid rtcp packet: too short");
    }
    // header

    // buff[0] = (V << 6 | P << 5 | RC)
    const version = (buff[0]! & 0xc0) >> 6;
    if (version !== 2) {
      throw new Error(`invalid rtcp packet: unsupported version ${version}`);
    }
    // buff[1] = PT
    if (buff[1]! !== PT_SR) {
      throw new Error(`invalid rtcp packet: unsupported packet type ${buff[1]}`);
    }
    // buff[2, 3] = length in 32-bit words minus one
    const length: number = (buff.readUInt16BE(2) + 1) * 4;
    if (buff.length !== length) {
      throw new Error("invalid rtcp packet: length mismatch");
    }
    // buff[4, 5, 6, 7] = SSRC
    const ssrc: number = buff.readUInt32BE(4);

    // sender info

    // buff[8, 9, 10, 11] = NTP timestamp, seconds
    // buff[12, 13, 14, 15] = NTP timestamp, fraction
    const ntpTimestamp: number = fromNTP(
      buff.readUInt32BE(8),
      buff.readUInt32BE(12),
    );
    // buff[16, 17, 18, 19] = RTP timestamp
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
      ntpTimestamp,
    );
  }

  public serialize(): Buffer {
    const buff: Buffer = Buffer.alloc(SR_LENGTH);

    // header

    // buff[0] = (V << 6 | P << 5 | RC)
    buff[0] = (2 << 6) | (0 << 5) | this.rc;
    // buff[1] = PT
    buff[1] = PT_SR;
    // buff[2, 3] = length in 32-bit words minus one
    buff.writeUInt16BE(buff.length / 4 - 1, 2);
    // buff[4, 5, 6, 7] = SSRC
    buff.writeUInt32BE(this.ssrc, 4);

    // sender info

    const ntp = toNTP(this.ntpTimestamp);
    // buff[8, 9, 10, 11] = NTP timestamp, seconds
    buff.writeUInt32BE(ntp.seconds, 8);
    // buff[12, 13, 14, 15] = NTP timestamp, fraction
    buff.writeUInt32BE(ntp.fraction, 12);
    // buff[16, 17, 18, 19] = RTP timestamp
    buff.writeUInt32BE(this.timestamp, 16);
    // buff[20, 21, 22, 23] = packetCount
    buff.writeUInt32BE(this.packetCount, 20);
    // buff[24, 25, 26, 27] = octetCount
    buff.writeUInt32BE(this.octetCount, 24);

    return buff;
  }
}
