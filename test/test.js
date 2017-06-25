/*
 * +===============================================
 * | Author:        Parham Alvani (parham.alvani@gmail.com)
 * |
 * | Creation Date: 02-06-2017
 * |
 * | File Name:     test.js
 * +===============================================
 */
/* eslint-env mocha */

const assert = require('assert');

const krtp = require('..');

describe('RTPSession', () => {

  it('packet send-recieve serialize-deserialize', (done) => {
    const s = new krtp.RTPSession(1373);
    s.on('message', (msg) => {
      assert.equal(s.sequenceNumber, msg.sequenceNumber + 1);
      assert.equal(s.ssrc, msg.ssrc);
      assert.equal('Hello world', msg.payload.toString());
      s.close();
      done();
    });
    s.send(Buffer.from('Hello world')).catch((err) =>{
      done(err);
    });
  });

  it('packet send payload must be buffer', (done) => {
    const s = new krtp.RTPSession(1373);
    s.send('Hello world')
      .then(() => {
        s.close();
        done(new Error('we have no exception ?!'));
      }).catch(() => {
        s.close();
        done();
      });
  });

  it('realtime streaming with 2 packet', (done) => {
    const s = new krtp.RTPSession(1373);
    let c = 0;
    let sq = 0;
    s.on('message', (msg) => {
      if (sq === 0) {
        sq = msg.sequenceNumber;
      } else {
        assert.equal(msg.sequenceNumber, sq + 1);
      }
      assert.equal(msg.timestamp, c);
      c++;
      if (c === 2) {
        done();
      }
    });
    const rws = krtp.createWriteStream(1, 1373);
    rws.write(Buffer.from('Hello'));
    rws.write(Buffer.from('World'));
    rws.end();
  });

});
