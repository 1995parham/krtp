/*
 * +===============================================
 * | Author:        Parham Alvani (parham.alvani@gmail.com)
 * |
 * | Creation Date: 01-06-2017
 * |
 * | File Name:     packet.ts
 * +===============================================
 */

export class RTPPacket {

  private csrc: Array<number> = []

  constructor (
    readonly payload: Buffer,
    readonly sequenceNumber: number,
    readonly ssrc: number,
    readonly timestamp: number = 0,
    readonly payloadType: number = 95,
  ) {
  }

  public addCSRC (csrc: number): void {
    // TODO csrc must be a 32 bit integer
    this.csrc.push(csrc)
  }

  public serialize (): Buffer {
    const buff = Buffer.alloc(12 + 4 * this.csrc.length + this.payload.length)

    /* buff[0] = (V << 6 | P << 5 | X << 4 | CC) */
    buff[0] = (2 << 6 | 0 << 5 | 0 << 4 | this.csrc.length)
    /* buff[1] = (M << 7 | PT) */
    buff[1] = (0 << 7 | this.payloadType)
    /* buff[2, 3] = SN */
    buff.writeUInt16BE(this.sequenceNumber, 2)
    /* buff[4, 5, 6, 7] = TS */
    buff.writeUInt32BE(this.timestamp, 4)
    /* buff[8, 9, 10, 11] = SSRC */
    buff.writeUInt32BE(this.ssrc, 8)

    /* CSRC section */
    for (let i = 0; i < this.csrc.length; i++) {
      buff.writeUInt32BE(this.csrc[i], 12 + i * 4)
    }

    this.payload.copy(buff, 12 + this.csrc.length * 4, 0)

    return buff
  }

  static deserialize (buff: Buffer): RTPPacket {
    const csrc: Array<number> = []

    /* buff[0] = (V << 6 | P << 5 | X << 4 | CC) */
    if ((buff[0] & 0xC0 >> 6) !== 2) {
      throw new Error('Invalid packet signature');
    }
    const cc = buff[0] & 0x1F
    /* buff[1] = (M << 7 | PT) */
    const payloadType = (buff[1] & 0x7F)
    /* buff[2, 3] = SN */
    const sequenceNumber = buff.readUInt16BE(2)
    /* buff[4, 5, 6, 7] = TS */
    const timestamp = buff.readUInt32BE(4)
    /* buff[8, 9, 10, 11] = SSRC */
    const ssrc = buff.readUInt32BE(8)

    /* CSRC section */
    for (let i = 0; i < cc; i++) {
      csrc.push(buff.readUInt32BE(12 + i * 4))
    }

    const payload = Buffer.from(buff.slice(12 + csrc.length * 4))

    const packet = new RTPPacket(payload, sequenceNumber, ssrc, timestamp,
      payloadType)

    for (let i = 0; i < csrc.length; i++) {
      packet.addCSRC(csrc[i])
    }

    return packet
  }
}
