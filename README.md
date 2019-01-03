# KRTP

[![Travis branch](https://img.shields.io/travis/1995parham/krtp/master.svg?style=flat-square)](https://travis-ci.org/1995parham/krtp)
[![GitHub stars](https://img.shields.io/github/stars/1995parham/krtp.svg?style=flat-square)](https://github.com/1995parham/krtp/stargazers)
[![npm version](https://img.shields.io/npm/v/krtp.svg?style=flat-square)](https://www.npmjs.com/package/krtp)
[![npm license](https://img.shields.io/npm/l/krtp.svg?style=flat-square)]()
[![npm](https://img.shields.io/npm/dw/krtp.svg?style=flat-square)]()
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/8073505d59d241b6beeda1451a3bcf5e)](https://www.codacy.com/app/1995parham/krtp?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=1995parham/krtp&amp;utm_campaign=Badge_Grade)

- [Introduction](#introduction)
- [Example](#example)
- [Protocol Documentation](https://github.com/1995parham/krtp/blob/master/docs/RTP.md)

## Introduction
RealTime Protocol implementation based on [RFC 3550](https://tools.ietf.org/html/rfc3550) in NodeJS.

## Example

```javascript
const Session = require('../dist').Session

const s = new Session(1373)

s.on('message', (msg) => {
  console.log(msg)
  s.close()
})

s.sendSR('192.168.73.4').catch(err => {
  console.log(err)
})
s.send(Buffer.from('Hello world'))
```
