// Genera los íconos PNG de la app (sin dependencias). Uso: npm run iconos
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

const crcTabla = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTabla[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const bloque = (tipo, datos) => {
  const largo = Buffer.alloc(4); largo.writeUInt32BE(datos.length);
  const td = Buffer.concat([Buffer.from(tipo), datos]);
  const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
  return Buffer.concat([largo, td, c]);
};

function icono(tam) {
  const filas = [];
  const fondo = [124, 58, 237];
  for (let y = 0; y < tam; y++) {
    const fila = Buffer.alloc(1 + tam * 3);
    for (let x = 0; x < tam; x++) {
      const u = x / tam, v = y / tam;
      // Bombilla simple: círculo + base
      const enCirculo = (u - 0.5) ** 2 + (v - 0.42) ** 2 < 0.2 ** 2;
      const enBase = Math.abs(u - 0.5) < 0.09 && v > 0.6 && v < 0.74;
      const color = enCirculo || enBase ? [255, 255, 255] : fondo;
      fila.set(color, 1 + x * 3);
    }
    filas.push(fila);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(tam, 0); ihdr.writeUInt32BE(tam, 4);
  ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    bloque('IHDR', ihdr),
    bloque('IDAT', deflateSync(Buffer.concat(filas))),
    bloque('IEND', Buffer.alloc(0)),
  ]);
}

for (const t of [192, 512]) writeFileSync(`public/icono-${t}.png`, icono(t));
console.log('Íconos creados en /public');
