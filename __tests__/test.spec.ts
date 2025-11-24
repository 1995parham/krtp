/*
 * +===============================================
 * | Author:        Parham Alvani (parham.alvani@gmail.com)
 * |
 * | Creation Date: 02-06-2017
 * |
 * | File Name:     test.js
 * +===============================================
 */
import * as assert from "assert";
import { range } from "rxjs";
import { filter } from "rxjs/operators";

import { Session, ReadRTPStream, WriteRTPStream } from "../lib";
import { Packet } from "../lib";
import { ControlSR } from "../lib/Control";

describe("RTPSession", () => {
  test("packet send-recieve serialize-deserialize", (done) => {
    const s = new Session(1373);
    s.on("message", (msg: Packet) => {
      assert.equal(s.sequenceNumber, msg.sequenceNumber + 1);
      assert.equal(s.ssrc, msg.ssrc);
      assert.equal("Hello world", msg.payload.toString());
      s.close();
      done();
    });
    s.send(Buffer.from("Hello world")).catch((err) => {
      done(err);
    });
  });

  test("rxjs", (done) => {
    const s = new Session(1372, 72);
    const initialSequenceNumber = s.sequenceNumber;

    s.message$
      .pipe(filter((msg) => msg.sequenceNumber === initialSequenceNumber + 9))
      .subscribe({
        next: (msg) => {
          assert.equal(72, msg.payloadType);
          assert.equal("Hello world of rxjs - 10", msg.payload.toString());
          s.close();
          done();
        },
        error: (err) => {
          done(err);
        },
      });

    range(1, 10).subscribe((i: number) => {
      s.send(Buffer.from(`Hello world of rxjs - ${i}`)).catch((err) => {
        done(err);
      });
    });
  });
});

describe("ControlSR", () => {
  test("serialize creates valid RTCP SR packet", () => {
    const sr = new ControlSR(
      100, // packetCount
      5000, // octetCount
      12345678, // ssrc
      9876543, // timestamp
      1234567890000 // ntpTimestamp
    );

    const buffer = sr.serialize();

    // Verify buffer length (8 byte header + 20 byte sender info)
    assert.equal(buffer.length, 28);

    // Verify version (2) in first 2 bits
    assert.equal((buffer[0]! >> 6) & 0x03, 2);

    // Verify packet type (200 for SR)
    assert.equal(buffer[1], 200);

    // Verify SSRC
    assert.equal(buffer.readUInt32BE(4), 12345678);

    // Verify timestamp
    assert.equal(buffer.readUInt32BE(16), 9876543);

    // Verify packet count
    assert.equal(buffer.readUInt32BE(20), 100);

    // Verify octet count
    assert.equal(buffer.readUInt32BE(24), 5000);
  });

  test("deserialize parses valid RTCP SR packet", () => {
    // Create a valid RTCP SR packet buffer
    const buffer = Buffer.alloc(28);

    // Header: V=2, P=0, RC=0
    buffer[0] = (2 << 6) | (0 << 5) | 0;
    // PT=200 (Sender Report)
    buffer[1] = 200;
    // Length in 32-bit words minus 1
    buffer.writeUInt16BE(6, 2); // (28/4) - 1 = 6
    // SSRC
    buffer.writeUInt32BE(87654321, 4);
    // NTP timestamp (MSW)
    buffer.writeUInt32BE(1234567, 8);
    // NTP timestamp (LSW)
    buffer.writeUInt32BE(890, 12);
    // RTP timestamp
    buffer.writeUInt32BE(11223344, 16);
    // Sender packet count
    buffer.writeUInt32BE(250, 20);
    // Sender octet count
    buffer.writeUInt32BE(12500, 24);

    const sr = ControlSR.deserialize(buffer);

    assert.equal(sr.ssrc, 87654321);
    assert.equal(sr.timestamp, 11223344);
    assert.equal(sr.packetCount, 250);
    assert.equal(sr.octetCount, 12500);
    assert.equal(sr.ntpTimestamp, 1234567 * 1000 + 890);
  });

  test("serialize and deserialize round-trip", () => {
    const original = new ControlSR(
      42,
      1024,
      999888777,
      555666,
      Date.now()
    );

    const serialized = original.serialize();
    const deserialized = ControlSR.deserialize(serialized);

    assert.equal(deserialized.packetCount, original.packetCount);
    assert.equal(deserialized.octetCount, original.octetCount);
    assert.equal(deserialized.ssrc, original.ssrc);
    assert.equal(deserialized.timestamp, original.timestamp);
    assert.equal(deserialized.ntpTimestamp, original.ntpTimestamp);
  });

  test("deserialize throws on buffer too small", () => {
    const buffer = Buffer.alloc(20); // Less than 28 bytes

    assert.throws(
      () => ControlSR.deserialize(buffer),
      /invalid rtcp packet/
    );
  });

  test("deserialize throws on invalid version", () => {
    const buffer = Buffer.alloc(28);
    // Set version to 1 instead of 2
    buffer[0] = (1 << 6);
    buffer[1] = 200;
    buffer.writeUInt16BE(6, 2);

    assert.throws(
      () => ControlSR.deserialize(buffer),
      /invalid rtcp packet/
    );
  });

  test("deserialize throws on invalid packet type", () => {
    const buffer = Buffer.alloc(28);
    buffer[0] = (2 << 6);
    // Set PT to something other than 200
    buffer[1] = 201;
    buffer.writeUInt16BE(6, 2);

    assert.throws(
      () => ControlSR.deserialize(buffer),
      /invalid rtcp packet/
    );
  });

  test("deserialize throws on length mismatch", () => {
    const buffer = Buffer.alloc(28);
    buffer[0] = (2 << 6);
    buffer[1] = 200;
    // Set length to indicate 32 bytes but buffer is only 28
    buffer.writeUInt16BE(7, 2);

    assert.throws(
      () => ControlSR.deserialize(buffer),
      /invalid rtcp packet/
    );
  });

  test("ControlSR handles edge case values", () => {
    const sr = new ControlSR(
      0xFFFFFFFF, // max uint32 packet count
      0xFFFFFFFF, // max uint32 octet count
      0xFFFFFFFF, // max uint32 ssrc
      0xFFFFFFFF, // max uint32 timestamp
      0
    );

    const buffer = sr.serialize();
    const deserialized = ControlSR.deserialize(buffer);

    assert.equal(deserialized.packetCount, 0xFFFFFFFF);
    assert.equal(deserialized.octetCount, 0xFFFFFFFF);
    assert.equal(deserialized.ssrc, 0xFFFFFFFF);
    assert.equal(deserialized.timestamp, 0xFFFFFFFF);
  });
});

describe("Session sendSR", () => {
  test("sendSR sends RTCP sender report", (done) => {
    const sender = new Session(5000);
    const receiver = new Session(5002);

    // Send some packets first to populate stats
    sender.send(Buffer.from("test1")).then(() => {
      sender.send(Buffer.from("test2")).then(() => {
        // Listen for RTCP on receiver's control socket
        receiver["controlSocket"].on("message", (msg: Buffer) => {
          const sr = ControlSR.deserialize(msg);

          // Verify sender stats are included
          assert.equal(sr.ssrc, sender.ssrc);
          assert.equal(sr.packetCount, 2);
          assert.equal(sr.octetCount, 10); // "test1" + "test2" = 5 + 5

          sender.close();
          receiver.close();
          done();
        });

        // Send SR to receiver's control port
        sender.sendSR("127.0.0.1").catch((err) => done(err));
      });
    });
  });

  test("sendSR with custom address and timestamp", (done) => {
    const sender = new Session(5004);
    const receiver = new Session(5006);

    receiver["controlSocket"].on("message", (msg: Buffer) => {
      const sr = ControlSR.deserialize(msg);

      assert.equal(sr.ssrc, sender.ssrc);
      assert.ok(sr.timestamp >= 0);

      sender.close();
      receiver.close();
      done();
    });

    sender.sendSR("127.0.0.1", 12345).catch((err) => done(err));
  });
});

describe("ReadRTPStream", () => {
  test("streams incoming RTP packets as readable stream", (done) => {
    const s = new Session(6000);
    const readStream = new ReadRTPStream(s);

    const receivedChunks: Buffer[] = [];

    readStream.on("data", (chunk: Buffer) => {
      receivedChunks.push(chunk);

      if (receivedChunks.length === 3) {
        assert.equal(receivedChunks[0]!.toString(), "chunk1");
        assert.equal(receivedChunks[1]!.toString(), "chunk2");
        assert.equal(receivedChunks[2]!.toString(), "chunk3");

        s.close();
      }
    });

    readStream.on("end", () => {
      assert.equal(receivedChunks.length, 3);
      done();
    });

    // Send packets to self
    s.send(Buffer.from("chunk1")).then(() => {
      s.send(Buffer.from("chunk2")).then(() => {
        s.send(Buffer.from("chunk3")).catch((err) => done(err));
      });
    });
  });

  test("readable stream ends when session closes", (done) => {
    const s = new Session(6002);
    const readStream = new ReadRTPStream(s);

    readStream.on("end", () => {
      done();
    });

    // Close session immediately
    setTimeout(() => {
      s.close();
    }, 100);
  });
});

describe("WriteRTPStream", () => {
  test("streams outgoing data as writable stream", (done) => {
    const sender = new Session(7000);
    const receiver = new Session(7002);
    const writeStream = new WriteRTPStream(sender, "127.0.0.1");

    const receivedMessages: string[] = [];

    receiver.on("message", (msg: Packet) => {
      receivedMessages.push(msg.payload.toString());

      if (receivedMessages.length === 2) {
        assert.equal(receivedMessages[0], "stream data 1");
        assert.equal(receivedMessages[1], "stream data 2");

        writeStream.destroy();
        receiver.close();
        done();
      }
    });

    writeStream.write(Buffer.from("stream data 1"));
    writeStream.write(Buffer.from("stream data 2"));
  });

  test("writeStream destroy closes session", (done) => {
    const sender = new Session(7004);
    const writeStream = new WriteRTPStream(sender, "127.0.0.1");

    sender.on("close", () => {
      done();
    });

    writeStream.destroy();
  });

  test("writeStream handles write errors", (done) => {
    const sender = new Session(7006);
    const writeStream = new WriteRTPStream(sender, "127.0.0.1");

    // Close the underlying socket to cause an error
    sender["socket"].close();

    writeStream.on("error", (err) => {
      assert.ok(err);
      done();
    });

    writeStream.write(Buffer.from("this will fail"));
  });
});

describe("Packet CSRC validation", () => {
  test("addCSRC accepts valid 32-bit unsigned integers", () => {
    const packet = new Packet(Buffer.from("test"), 1, 12345, 0, 95);

    // Should accept valid values
    packet.addCSRC(0);
    packet.addCSRC(0xFFFFFFFF);
    packet.addCSRC(123456789);

    const serialized = packet.serialize();
    const deserialized = Packet.deserialize(serialized);

    assert.ok(deserialized);
  });

  test("addCSRC rejects negative numbers", () => {
    const packet = new Packet(Buffer.from("test"), 1, 12345, 0, 95);

    assert.throws(
      () => packet.addCSRC(-1),
      /CSRC must be a 32-bit unsigned integer/
    );
  });

  test("addCSRC rejects numbers larger than 32-bit", () => {
    const packet = new Packet(Buffer.from("test"), 1, 12345, 0, 95);

    assert.throws(
      () => packet.addCSRC(0x100000000), // 2^32
      /CSRC must be a 32-bit unsigned integer/
    );
  });

  test("addCSRC rejects non-integers", () => {
    const packet = new Packet(Buffer.from("test"), 1, 12345, 0, 95);

    assert.throws(
      () => packet.addCSRC(123.456),
      /CSRC must be a 32-bit unsigned integer/
    );
  });

  test("addCSRC enforces maximum of 15 CSRCs", () => {
    const packet = new Packet(Buffer.from("test"), 1, 12345, 0, 95);

    // Add 15 CSRCs (maximum allowed)
    for (let i = 0; i < 15; i++) {
      packet.addCSRC(i);
    }

    // 16th should fail
    assert.throws(
      () => packet.addCSRC(15),
      /Maximum of 15 CSRCs allowed/
    );
  });

  test("packet with 15 CSRCs serializes and deserializes correctly", () => {
    const packet = new Packet(Buffer.from("payload"), 100, 999, 500, 96);

    // Add maximum CSRCs
    for (let i = 0; i < 15; i++) {
      packet.addCSRC(1000 + i);
    }

    const serialized = packet.serialize();
    const deserialized = Packet.deserialize(serialized);

    assert.equal(deserialized.payload.toString(), "payload");
    assert.equal(deserialized.sequenceNumber, 100);
    assert.equal(deserialized.ssrc, 999);
    assert.equal(deserialized.timestamp, 500);
    assert.equal(deserialized.payloadType, 96);
  });
});
