# Koochooloo RTP

![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/1995parham/krtp/test.yaml?label=test&logo=github&style=flat-square&branch=main)
[![npm version](https://img.shields.io/npm/v/krtp.svg?style=flat-square&logo=npm)](https://www.npmjs.com/package/krtp)
[![npm](https://img.shields.io/npm/dw/krtp.svg?style=flat-square&logo=npm)](https://www.npmjs.com/package/krtp)

- [Introduction](#introduction)
- [Example](#example)
- [Protocol Documentation](https://github.com/1995parham/krtp/blob/master/docs/RTP.md)

## Introduction

RealTime Protocol implementation based on [RFC 3550](https://tools.ietf.org/html/rfc3550) in NodeJS.
It supports RTP and SR message of RTCP. All contributions are welcome.
KRTP has support for rxjs.

## Example

```javascript
const Session = require("../dist").Session;

const s = new Session(1373);

s.on("message", (msg) => {
  console.log(msg);
  s.close();
});

s.sendSR("192.168.73.4").catch((err) => {
  console.log(err);
});
s.send(Buffer.from("Hello world"));
```

```typescript
import { Session } from "..";

const s = new Session(1372);
s.message$.subscribe((msg) => console.log(msg));
```
