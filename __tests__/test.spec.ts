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
import { range } from 'rxjs';
import { filter } from 'rxjs/operators';

import { Session } from '..';

describe('RTPSession', () => {

  test('packet send-recieve serialize-deserialize', done => {
    const s = new Session(1373);
    s.on('message', (msg) => {
      assert.equal(s.sequenceNumber, msg.sequenceNumber + 1);
      assert.equal(s.ssrc, msg.ssrc);
      assert.equal('Hello world', msg.payload.toString());
      s.close();
      done();
    });
    s.send(Buffer.from('Hello world')).catch((err) => {
      done(err);
    });
  })

  test('rxjs', done => {
    const s = new Session(1372);
    const initialSequenceNumber = s.sequenceNumber;

    s.message$.pipe(
      filter(msg => msg.sequenceNumber === initialSequenceNumber + 9)
    ).subscribe((msg) => {
      assert.equal('Hello world of rxjs - 10', msg.payload.toString());
      s.close();
      done();
    });

    range(1, 10).subscribe((i: number) => {
      s.send(Buffer.from(`Hello world of rxjs - ${i}`)).catch((err) => {
        done(err)
      })
    });
  })

})
