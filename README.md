# KRTP

[![Travis branch](https://img.shields.io/travis/1995parham/krtp/master.svg?style=flat-square)](https://travis-ci.org/1995parham/krtp)
[![GitHub stars](https://img.shields.io/github/stars/1995parham/krtp.svg?style=flat-square)](https://github.com/1995parham/krtp/stargazers)
[![npm version](https://img.shields.io/npm/v/krtp.svg?style=flat-square)]()
[![npm license](https://img.shields.io/npm/l/krtp.svg?style=flat-square)]()
[![npm](https://img.shields.io/npm/dw/krtp.svg?style=flat-square)]()

- [Introduction](#introduction)
- [Example](#example)
- [Protocol Documentation](https://github.com/1995parham/krtp/blob/master/docs/RTP.md)

## Introduction
RealTime Protocol implementation based on [RFC 3550](https://tools.ietf.org/html/rfc3550) in NodeJS.

## Example
```javascript
const RTPSession = require('krtp').RTPSession;

const s = new RTPSession(1373);

s.on('message', (msg) => {
  console.log(msg);
  s.close();
});

s.send(Buffer.from('Hello world'));
```
