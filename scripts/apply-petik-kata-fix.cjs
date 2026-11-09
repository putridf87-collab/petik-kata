#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const htmlPath = process.argv[2];
if (!htmlPath) {
  console.error('Pemakaian: node scripts/apply-petik-kata-fix.cjs <file-html>');
  process.exit(2);
}

const resolvedHtml = path.resolve(htmlPath);
const htmlDir = path.dirname(resolvedHtml);
const fixScript = path.join(htmlDir, 'petik-kata-fix.js');
const marker = '<script src="./petik-kata-fix.js"></script>';

if (!fs.existsSync(resolvedHtml)) {
  console.error('File HTML tidak ditemukan:', resolvedHtml);
  process.exit(2);
}
if (!fs.existsSync(fixScript)) {
  console.error('petik-kata-fix.js harus berada di folder yang sama dengan HTML:', fixScript);
  process.exit(2);
}

const original = fs.readFileSync(resolvedHtml, 'utf8');
if (!original.includes('H5PIntegration') || !original.includes('H5P.GameMap')) {
  console.error('File tidak tampak sebagai ekspor H5P GameMap yang diharapkan. Tidak ada perubahan.');
  process.exit(1);
}
if (original.includes(marker) || original.includes('petik-kata-responsive-fix')) {
  console.log('Patch sudah terpasang. Tidak ada perubahan.');
  process.exit(0);
}

const bodyClose = original.toLowerCase().lastIndexOf('</body>');
if (bodyClose < 0) {
  console.error('Tag </body> tidak ditemukan. Tidak ada perubahan.');
  process.exit(1);
}

const backupPath = resolvedHtml + '.before-petik-kata-fix.bak';
if (!fs.existsSync(backupPath)) {
  fs.copyFileSync(resolvedHtml, backupPath);
}

const updated = original.slice(0, bodyClose) + '\n    ' + marker + '\n' + original.slice(bodyClose);
fs.writeFileSync(resolvedHtml, updated, 'utf8');
console.log('Patch dipasang:', resolvedHtml);
console.log('Backup dibuat:', backupPath);
