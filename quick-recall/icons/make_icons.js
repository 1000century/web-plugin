// Node.js로 PNG 아이콘 생성 (pure JS, 의존성 없음)
// 실행: node icons/make_icons.js

const fs = require('fs');

function createPNG(size) {
  // 배경색 #3a3aff (파랑-보라), 글자 흰색 "Q"
  const bg = [0x3a, 0x3a, 0xff];
  const fg = [0xff, 0xff, 0xff];

  // PNG 헤더
  const PNG_HEADER = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function crc32(buf) {
    let crc = 0xffffffff;
    const table = [];
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[i] = c;
    }
    for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  }

  function chunk(type, data) {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const typeB = Buffer.from(type);
    const crcB = Buffer.alloc(4);
    crcB.writeUInt32BE(crc32(Buffer.concat([typeB, data])));
    return Buffer.concat([len, typeB, data, crcB]);
  }

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8bit RGB

  // 간단한 "Q" 픽셀 폰트 (7x7 비트맵, 기준 size=14일 때)
  const Q7 = [
    0b0111110,
    0b1000001,
    0b1000001,
    0b1000001,
    0b1001001,
    0b1000110,
    0b0111111,
  ];

  // IDAT (픽셀 데이터)
  const zlib = require('zlib');
  const raw = [];
  const scale = Math.max(1, Math.floor(size / 14));
  const glyphW = 7 * scale;
  const glyphH = 7 * scale;
  const offX = Math.floor((size - glyphW) / 2);
  const offY = Math.floor((size - glyphH) / 2);

  for (let y = 0; y < size; y++) {
    raw.push(0); // filter type
    for (let x = 0; x < size; x++) {
      const gx = Math.floor((x - offX) / scale);
      const gy = Math.floor((y - offY) / scale);
      const inGlyph = gx >= 0 && gx < 7 && gy >= 0 && gy < 7 && (Q7[gy] >> (6 - gx)) & 1;
      raw.push(...(inGlyph ? fg : bg));
    }
  }

  const idatData = zlib.deflateSync(Buffer.from(raw));
  const iend = Buffer.alloc(0);

  return Buffer.concat([
    PNG_HEADER,
    chunk('IHDR', ihdr),
    chunk('IDAT', idatData),
    chunk('IEND', iend),
  ]);
}

for (const size of [16, 48, 128]) {
  const png = createPNG(size);
  fs.writeFileSync(`icons/icon${size}.png`, png);
  console.log(`생성됨: icons/icon${size}.png (${png.length} bytes)`);
}
