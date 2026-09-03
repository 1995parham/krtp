/*
 * +===============================================
 * | Author:        Parham Alvani (parham.alvani@gmail.com)
 * |
 * | Creation Date: 01-06-2017
 * |
 * | File Name:     packet.ts
 * +===============================================
 */

/** RTP header length in bytes without CSRC list and extension (RFC 3550 5.1). */
const HEADER_LENGTH = 12;

/** The CC field is 4 bits wide, so at most 15 CSRC identifiers fit in a packet. */
export const MAX_CSRC_COUNT = 15;

/**
 * RTP header extension (RFC 3550 5.3.1). `profile` is the 16-bit
 * profile-defined field and `data` is the extension payload, which must be
 * a multiple of 4 bytes long.
 */
export interface HeaderExtension {
  readonly profile: number;
  readonly data: Buffer;
}

function assertUInt(name: string, value: number, bits: number): void {
  const max = 2 ** bits - 1;
  if (!Number.isInteger(value) || value < 0 || value > max) {
    throw new RangeError(
      `${name} must be a ${bits}-bit unsigned integer (0 to ${max}), got ${value}`,
    );
  }
}

/**
 * Packet is an RTP data packet (RFC 3550 5.1).
 */
export class Packet {
  public readonly payload: Buffer;
  public readonly sequenceNumber: number;
  public readonly ssrc: number;
  public readonly timestamp: number;
  public readonly payloadType: number;
  public readonly marker: boolean;
  public readonly headerExtension: HeaderExtension | undefined;

  private csrc: number[] = [];

  constructor(
    payload: Buffer,
    sequenceNumber: number,
    ssrc: number,
    timestamp: number = 0,
    payloadType: number = 95,
    marker: boolean = false,
    headerExtension?: HeaderExtension,
  ) {
    assertUInt("sequence number", sequenceNumber, 16);
    assertUInt("ssrc", ssrc, 32);
    assertUInt("timestamp", timestamp, 32);
    assertUInt("payload type", payloadType, 7);
    if (headerExtension !== undefined) {
      assertUInt("extension profile", headerExtension.profile, 16);
      if (headerExtension.data.length % 4 !== 0) {
        throw new RangeError(
          "header extension data length must be a multiple of 4 bytes",
        );
      }
      assertUInt("extension length", headerExtension.data.length / 4, 16);
    }

    this.payload = payload;
    this.sequenceNumber = sequenceNumber;
    this.ssrc = ssrc;
    this.timestamp = timestamp;
    this.payloadType = payloadType;
    this.marker = marker;
    this.headerExtension = headerExtension;
  }

  /** Contributing source identifiers carried by this packet, in order. */
  public get csrcs(): readonly number[] {
    return this.csrc;
  }

  /**
   * Appends a contributing source identifier. A CSRC is a 32-bit unsigned
   * integer and at most 15 of them fit in a packet because the CC field is
   * only 4 bits wide.
   */
  public addCSRC(csrc: number): void {
    assertUInt("csrc", csrc, 32);
    if (this.csrc.length >= MAX_CSRC_COUNT) {
      throw new RangeError(
        `at most ${MAX_CSRC_COUNT} CSRC identifiers are allowed per packet`,
      );
    }
    this.csrc.push(csrc);
  }

  public serialize(): Buffer {
    const extensionLength =
      this.headerExtension === undefined
        ? 0
        : 4 + this.headerExtension.data.length;
    const buff: Buffer = Buffer.alloc(
      HEADER_LENGTH +
        4 * this.csrc.length +
        extensionLength +
        this.payload.length,
    );

    /* buff[0] = (V << 6 | P << 5 | X << 4 | CC) */
    buff[0] =
      (2 << 6) |
      (0 << 5) |
      ((this.headerExtension === undefined ? 0 : 1) << 4) |
      this.csrc.length;
    /* buff[1] = (M << 7 | PT) */
    buff[1] = ((this.marker ? 1 : 0) << 7) | this.payloadType;
    /* buff[2, 3] = SN */
    buff.writeUInt16BE(this.sequenceNumber, 2);
    /* buff[4, 5, 6, 7] = TS */
    buff.writeUInt32BE(this.timestamp, 4);
    /* buff[8, 9, 10, 11] = SSRC */
    buff.writeUInt32BE(this.ssrc, 8);

    /* CSRC section */
    let offset = HEADER_LENGTH;
    for (const csrc of this.csrc) {
      buff.writeUInt32BE(csrc, offset);
      offset += 4;
    }

    /* header extension section */
    if (this.headerExtension !== undefined) {
      buff.writeUInt16BE(this.headerExtension.profile, offset);
      buff.writeUInt16BE(this.headerExtension.data.length / 4, offset + 2);
      this.headerExtension.data.copy(buff, offset + 4);
      offset += 4 + this.headerExtension.data.length;
    }

    this.payload.copy(buff, offset);

    return buff;
  }

  static deserialize(buff: Buffer): Packet {
    if (buff.length < HEADER_LENGTH) {
      throw new Error("invalid rtp packet: too short");
    }

    /* buff[0] = (V << 6 | P << 5 | X << 4 | CC) */
    const version = (buff[0]! & 0xc0) >> 6;
    if (version !== 2) {
      throw new Error(`invalid rtp packet: unsupported version ${version}`);
    }
    const padding = (buff[0]! & 0x20) !== 0;
    const extension = (buff[0]! & 0x10) !== 0;
    const cc = buff[0]! & 0x0f;
    /* buff[1] = (M << 7 | PT) */
    const marker = (buff[1]! & 0x80) !== 0;
    const payloadType = buff[1]! & 0x7f;
    /* buff[2, 3] = SN */
    const sequenceNumber = buff.readUInt16BE(2);
    /* buff[4, 5, 6, 7] = TS */
    const timestamp = buff.readUInt32BE(4);
    /* buff[8, 9, 10, 11] = SSRC */
    const ssrc = buff.readUInt32BE(8);

    let end = buff.length;
    if (padding) {
      /* the last octet of the padding holds the padding length, itself included */
      const paddingLength = buff[end - 1]!;
      if (paddingLength === 0 || paddingLength > end - HEADER_LENGTH) {
        throw new Error("invalid rtp packet: bad padding");
      }
      end -= paddingLength;
    }

    /* CSRC section */
    let offset = HEADER_LENGTH;
    if (end < offset + cc * 4) {
      throw new Error("invalid rtp packet: truncated csrc list");
    }
    const csrc: number[] = [];
    for (let i = 0; i < cc; i++) {
      csrc.push(buff.readUInt32BE(offset));
      offset += 4;
    }

    /* header extension section */
    let headerExtension: HeaderExtension | undefined;
    if (extension) {
      if (end < offset + 4) {
        throw new Error("invalid rtp packet: truncated header extension");
      }
      const profile = buff.readUInt16BE(offset);
      const length = buff.readUInt16BE(offset + 2) * 4;
      offset += 4;
      if (end < offset + length) {
        throw new Error("invalid rtp packet: truncated header extension");
      }
      headerExtension = {
        profile,
        data: Buffer.from(buff.subarray(offset, offset + length)),
      };
      offset += length;
    }

    const payload: Buffer = Buffer.from(buff.subarray(offset, end));

    const packet: Packet = new Packet(
      payload,
      sequenceNumber,
      ssrc,
      timestamp,
      payloadType,
      marker,
      headerExtension,
    );

    for (const s of csrc) {
      packet.addCSRC(s);
    }

    return packet;
  }
}
