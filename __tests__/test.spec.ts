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

import * as assert from 'assert';

import { RTPSession } from '..';

describe('RTPSession', () => {
  it('packet send-recieve serialize-deserialize', (done) => {
    const s = new RTPSession(1373)
    s.on('message', (msg) => {
      assert.equal(s.sequenceNumber, msg.sequenceNumber + 1)
      assert.equal(s.ssrc, msg.ssrc)
      assert.equal('Hello world', msg.payload.toString())
      s.close()
      done()
    })
    s.send(Buffer.from('Hello world')).catch((err) => {
      done(err)
    })
  })
})
