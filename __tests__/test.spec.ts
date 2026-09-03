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
import * as dgram from "dgram";
import { range } from "rxjs";
import { filter } from "rxjs/operators";

import { Session, Packet, ControlSR, MAX_CSRC_COUNT, toNTP, fromNTP } from "../lib";

describe("Packet", () => {
  test("serialize-deserialize round trip", () => {
    const p = new Packet(Buffer.from("payload"), 65535, 0xdeadbeef, 0xffffffff, 96, true);
    p.addCSRC(1);
    p.addCSRC(0xffffffff);

    const d = Packet.deserialize(p.serialize());
    assert.equal(d.sequenceNumber, 65535);
    assert.equal(d.ssrc, 0xdeadbeef);
    assert.equal(d.timestamp, 0xffffffff);
    assert.equal(d.payloadType, 96);
    assert.equal(d.marker, true);
    assert.deepEqual(d.csrcs, [1, 0xffffffff]);
    assert.equal(d.payload.toString(), "payload");
    assert.equal(d.headerExtension, undefined);
  });

  test("csrc must be a 32-bit unsigned integer (#5)", () => {
    const p = new Packet(Buffer.alloc(0), 1, 2);
    assert.throws(() => p.addCSRC(-1), RangeError);
    assert.throws(() => p.addCSRC(0x1_0000_0000), RangeError);
    assert.throws(() => p.addCSRC(1.5), RangeError);
    assert.throws(() => p.addCSRC(Number.NaN), RangeError);
    p.addCSRC(0);
    p.addCSRC(0xffffffff);
    assert.deepEqual(p.csrcs, [0, 0xffffffff]);
  });

  test("at most 15 csrc identifiers fit in the 4-bit CC field (#5)", () => {
    const p = new Packet(Buffer.alloc(0), 1, 2);
    for (let i = 0; i < MAX_CSRC_COUNT; i++) {
      p.addCSRC(i);
    }
    assert.throws(() => p.addCSRC(15), RangeError);
    const d = Packet.deserialize(p.serialize());
    assert.equal(d.csrcs.length, MAX_CSRC_COUNT);
    assert.equal(p.serialize()[0]! & 0x0f, MAX_CSRC_COUNT);
  });

  test("header field ranges are validated", () => {
    assert.throws(() => new Packet(Buffer.alloc(0), 65536, 1), RangeError);
    assert.throws(() => new Packet(Buffer.alloc(0), 1, 0x1_0000_0000), RangeError);
    assert.throws(() => new Packet(Buffer.alloc(0), 1, 1, 0x1_0000_0000), RangeError);
    assert.throws(() => new Packet(Buffer.alloc(0), 1, 1, 0, 128), RangeError);
  });

  test("header extension round trip", () => {
    const ext = { profile: 0xbede, data: Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]) };
    const p = new Packet(Buffer.from("x"), 1, 2, 3, 4, false, ext);
    const wire = p.serialize();
    assert.equal(wire[0]! & 0x10, 0x10);
    const d = Packet.deserialize(wire);
    assert.equal(d.headerExtension?.profile, 0xbede);
    assert.deepEqual(d.headerExtension?.data, ext.data);
    assert.equal(d.payload.toString(), "x");
    assert.throws(
      () => new Packet(Buffer.alloc(0), 1, 2, 3, 4, false, { profile: 0, data: Buffer.alloc(3) }),
      RangeError,
    );
  });

  test("padding is stripped from the payload", () => {
    const wire = Buffer.concat([
      new Packet(Buffer.from("abc"), 1, 2).serialize(),
      Buffer.from([0, 0, 0, 0, 5]),
    ]);
    wire[0] = wire[0]! | 0x20;
    assert.equal(Packet.deserialize(wire).payload.toString(), "abc");

    wire[wire.length - 1] = 0;
    assert.throws(() => Packet.deserialize(wire), /bad padding/);
    wire[wire.length - 1] = 200;
    assert.throws(() => Packet.deserialize(wire), /bad padding/);
  });

  test("malformed packets are rejected", () => {
    assert.throws(() => Packet.deserialize(Buffer.alloc(11)), /too short/);
    const v1 = new Packet(Buffer.alloc(0), 1, 2).serialize();
    v1[0] = 0x40;
    assert.throws(() => Packet.deserialize(v1), /version/);
    const cc = new Packet(Buffer.alloc(0), 1, 2).serialize();
    cc[0] = cc[0]! | 0x0f;
    assert.throws(() => Packet.deserialize(cc), /csrc/);
    const x = new Packet(Buffer.alloc(0), 1, 2).serialize();
    x[0] = x[0]! | 0x10;
    assert.throws(() => Packet.deserialize(x), /header extension/);
  });
});

describe("ControlSR", () => {
  test("serialize-deserialize round trip", () => {
    const now = 1_700_000_000_123;
    const sr = new ControlSR(10, 2000, 0xcafebabe, 4242, now);
    const wire = sr.serialize();
    assert.equal(wire.length, 28);
    assert.equal(wire.readUInt16BE(2), 6);

    const d = ControlSR.deserialize(wire);
    assert.equal(d.packetCount, 10);
    assert.equal(d.octetCount, 2000);
    assert.equal(d.ssrc, 0xcafebabe);
    assert.equal(d.timestamp, 4242);
    assert.equal(d.ntpTimestamp, now);
  });

  test("ntp timestamp uses the 1900 epoch on the wire", () => {
    const unixEpoch = toNTP(0);
    assert.equal(unixEpoch.seconds, 2208988800);
    assert.equal(unixEpoch.fraction, 0);
    const half = toNTP(500);
    assert.equal(half.fraction, 0x8000_0000);
    assert.equal(fromNTP(half.seconds, half.fraction), 500);
  });

  test("malformed reports are rejected", () => {
    assert.throws(() => ControlSR.deserialize(Buffer.alloc(27)), /too short/);
    const v = new ControlSR(0, 0, 1, 0).serialize();
    v[0] = 0x40;
    assert.throws(() => ControlSR.deserialize(v), /version/);
    const pt = new ControlSR(0, 0, 1, 0).serialize();
    pt[1] = 201;
    assert.throws(() => ControlSR.deserialize(pt), /packet type/);
    const len = new ControlSR(0, 0, 1, 0).serialize();
    len.writeUInt16BE(7, 2);
    assert.throws(() => ControlSR.deserialize(len), /length/);
  });
});

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

  test("sender report is received on the control port", (done) => {
    const s = new Session(1380);
    s.send(Buffer.from("abc")).catch(done);
    s.on("sr", (report: ControlSR, rinfo: dgram.RemoteInfo) => {
      assert.equal(report.ssrc, s.ssrc);
      assert.equal(report.packetCount, 1);
      assert.equal(report.octetCount, 3);
      assert.equal(rinfo.port, 1381);
      s.close();
      done();
    });
    s.sendSR().catch(done);
  });

  test("malformed datagrams do not crash the session", (done) => {
    const s = new Session(1390);
    const client = dgram.createSocket("udp4");
    const errors: Error[] = [];
    s.on("error", (err) => {
      errors.push(err);
      // datagrams on two different sockets may arrive in any order
      if (errors.length === 2) {
        s.send(Buffer.from("ok")).catch(done);
      }
    });
    s.on("message", (msg: Packet) => {
      assert.equal(msg.payload.toString(), "ok");
      const messages = errors.map((e) => e.message).sort();
      assert.match(messages[0]!, /invalid rtcp packet/);
      assert.match(messages[1]!, /invalid rtp packet/);
      client.close();
      s.close();
      done();
    });
    client.send(Buffer.from("garbage"), 1390, "127.0.0.1", (err) => {
      if (err) return done(err);
      client.send(Buffer.from("garbage"), 1391, "127.0.0.1", (err) => {
        if (err) return done(err);
      });
    });
  });

  test("malformed datagrams are dropped silently without an error listener", (done) => {
    const s = new Session(1392);
    const client = dgram.createSocket("udp4");
    s.on("message", (msg: Packet) => {
      assert.equal(msg.payload.toString(), "ok");
      client.close();
      s.close();
      done();
    });
    client.send(Buffer.alloc(4), 1392, "127.0.0.1", (err) => {
      if (err) return done(err);
      s.send(Buffer.from("ok")).catch(done);
    });
  });

  test("close is idempotent and emits close once", (done) => {
    const s = new Session(1394);
    let closes = 0;
    s.on("close", () => {
      closes += 1;
    });
    s.close();
    s.close();
    setTimeout(() => {
      assert.equal(closes, 1);
      done();
    }, 50);
  });
});
