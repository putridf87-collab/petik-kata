# Petik Kata – Audit & Fix Pack

Paket ini menyiapkan perbaikan terarah untuk ekspor H5P GameMap 1.5 yang saat ini berada di root repositori.

## Hasil audit kode

1. **Titik mulai tahap tidak konsisten.** Enam peta memiliki jalur berurutan `0 → 1 → 2 → 3 → 4 → 5`, tetapi elemen indeks `0`, `2`, dan `3` sama-sama mempunyai `canBeStartStage: true`. Semantik H5P memilih titik mulai secara acak bila lebih dari satu tahap ditandai sebagai titik mulai. Script ini membatasi titik mulai ke tahap indeks `0`; semua aturan akses, tetangga, konten soal, dan koordinat hotspot tetap dipertahankan.
2. **Hotspot memakai koordinat relatif gambar.** Posisi keenam hotspot sudah disimpan sebagai persentase. Jangan mengubah `x`, `y`, `width`, atau `height` secara manual untuk mengatasi pergeseran. Patch memanggil metode resize bawaan H5P GameMap setelah gambar selesai dimuat, sehingga ukuran gambar, jalur, dan lapisan hotspot diselaraskan bersama dengan rasio asli gambar.
3. **Audio latar tidak otomatis aktif.** Logika GameMap menginisialisasi `isAudioOn` ke `false`. Patch mencoba memulai musik saat aplikasi siap, lalu menangani penolakan autoplay dengan mencoba kembali pada interaksi pengguna pertama. Browser dapat memblokir autoplay bersuara; tidak ada skrip yang dapat menjamin pemutaran otomatis di semua browser tanpa interaksi pengguna.
4. **Tampilan halaman.** Reset layout mengisi viewport desktop/mobile, menyembunyikan kontrol frame luar, dan menyembunyikan headline opsional. Toolbar GameMap tetap ditampilkan karena berisi kontrol audio, pengaturan, dan penyelesaian aktivitas.

## Isi paket

- `petik-kata-fix.js` – patch browser yang menjaga alur H5P, layout, hotspot, dan audio.
- `scripts/apply-petik-kata-fix.cjs` – memasang pemanggil patch ke ekspor HTML dan membuat backup.
- `tests/petik-kata-fix.test.cjs` – tes regresi konfigurasi tahap dan koordinat.
- `.github/workflows/petik-kata-quality.yml` – quality gate GitHub Actions untuk pemeriksaan sintaks, tes regresi, dan keberadaan loader.

## Cara memasang secara lokal

1. Salin `petik-kata-fix.js` ke folder yang sama dengan `6ae15f67b9c31c2d15a86021.html`.
2. Salin folder `scripts/` dan `tests/` serta file workflow ke root repositori.
3. Dari root repositori, jalankan:

   ```bash
   node scripts/apply-petik-kata-fix.cjs 6ae15f67b9c31c2d15a86021.html
   ```

   Patcher membuat backup `6ae15f67b9c31c2d15a86021.html.before-petik-kata-fix.bak` sebelum menulis HTML.
4. Periksa hasil:

   ```bash
   node --check petik-kata-fix.js
   node --test tests/petik-kata-fix.test.cjs
   ```

5. Commit paket dan hasil HTML pada branch terpisah, bukan langsung ke `main`.

## Pengujian yang disediakan

- memastikan hanya tahap pertama yang menjadi titik mulai;
- memastikan fungsi menolak konfigurasi dengan jumlah/nama tahap yang berbeda;
- memastikan patch idempoten;
- memastikan koordinat hotspot tidak berubah;
- memeriksa struktur enam tahap dan jalur berurutan pada ekspor asli.

Tes ini adalah tes statis/regresi konfigurasi, bukan pengujian klik browser lintas perangkat. Pengujian runtime perlu dilanjutkan pada Chrome/Edge desktop, Android Chrome, dan Safari iOS, termasuk orientasi portrait/landscape serta autoplay yang diblokir.

## Catatan audio offline

Ekspor H5P ini memakai permintaan XHR/Web Audio untuk memuat berkas audio. Saat dibuka langsung dengan `file://`, beberapa browser memblokir permintaan tersebut. Untuk uji offline, jalankan server lokal dari folder ekspor:

```bash
python -m http.server 8000
```

Kemudian buka URL HTML melalui `http://127.0.0.1:8000/6ae15f67b9c31c2d15a86021.html`. Letakkan folder aset `6ae15f67b9c31c2d15a86021/` tetap sejajar dengan file HTML.

## Status akses dan deployment

Pada audit ini, koneksi GitHub yang tersedia hanya memiliki izin `pull` (`push: false`). Karena itu patch belum dapat dikomit, workflow belum dapat dipasang di repositori, dan deployment internal belum dapat dijalankan dari koneksi ini. Setelah akses tulis diberikan, alur yang aman adalah membuat branch `fix/petik-kata-responsive-audio`, menjalankan quality gate, meninjau preview browser, lalu membuat pull request ke `main`.
