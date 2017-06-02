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

const RTPSession = require('..').RTPSession;

describe('RTPSession', () => {

  it('packet send-recieve serialize-deserialize', (done) => {
    const s = new RTPSession(1373);
    s.on('message', (msg) => {
      assert.equal(s.sequenceNumber, msg.sequenceNumber + 1);
      s.close();
      done();
    });
    s.send(Buffer.from('Hello world')).catch((err) =>{
      done(err);
    });
  });

  it('packet send payload must be buffer', (done) => {
    const s = new RTPSession(1373);
    s.send('Hello world')
      .then(() => {
        done(new Error('we have no exception ?!'));
      }).catch(() => {
        done();
      });
  });

});
