# PETIK KATA – Audit Report

**Repository:** `putridf87-collab/petik-kata`  
**Branch audited:** `main`  
**Audited source commit:** `81ad1ed7c3428d61543dd1e9cc911c0295f38123`  
**Main export:** `6ae15f67b9c31c2d15a86021.html`  
**Runtime:** standalone H5P GameMap 1.5.4

## Temuan

| Area | Observasi | Dampak | Penanganan di patch |
|---|---|---|---|
| Progression | Tahap indeks 0, 2, dan 3 sama-sama ditandai sebagai `canBeStartStage: true`, sementara jalur dan pembatasan membentuk urutan 0→1→2→3→4→5. | H5P dapat memilih titik awal secara acak bila lebih dari satu stage diizinkan sebagai start. | Hanya tahap indeks 0 dijadikan start. Validasi label enam tahap diterapkan sebelum perubahan. |
| Hotspot | Posisi hotspot disimpan sebagai koordinat persentase di `telemetry`; image, path, dan stage wrapper memiliki mekanisme ukuran bersama. | Mengubah koordinat satu-satu atau memakai `position:fixed` dapat menyebabkan hotspot meleset di rasio layar berbeda. | Tidak ada koordinat yang diubah. Patch menggunakan `map.setFullscreen(true, {width, height})` bawaan GameMap setelah gambar siap, lalu merespons resize/orientasi. |
| Audio | Audio latar tersedia; status audio awal pada GameMap adalah nonaktif. | Musik tidak mulai pada sebagian pemuatan awal. | Coba autoplay saat siap, tangani rejection, coba lagi dari interaksi pengguna pertama, dan sinkronkan tombol audio H5P. Kebijakan browser tetap berlaku. |
| Layout | Ekspor memiliki wrapper H5P dan iframe bertingkat; tinggi default tidak dipaksa memenuhi viewport. | Area permainan dapat menyisakan ruang kosong atau tidak memenuhi tinggi layar. | Reset wrapper ke viewport penuh (`100vh`/`100dvh`), hilangkan frame/header luar, dan pertahankan toolbar fungsi H5P. |
| CI | Folder `.github/workflows` tidak ditemukan pada branch yang diaudit. | Tidak ada quality gate proyek yang terdeteksi. | Paket menyediakan workflow static quality gate, siap ditambahkan ke repositori. |

## Mengapa hotspot tidak digeser manual

H5P menyimpan `x`, `y`, `width`, dan `height` sebagai persentase. Komponen map juga mengukur ukuran gambar yang benar-benar dirender, lalu menyamakan ukuran wrapper jalur dan wrapper hotspot. Implementasi yang disiapkan memanggil API resize GameMap sendiri dan membiarkan koordinat sumber tetap utuh. Ini menghindari tambalan posisi yang hanya cocok pada satu resolusi.

## Hasil uji lokal paket

- `node --check petik-kata-fix.js`: lulus.
- `node --check scripts/apply-petik-kata-fix.cjs`: lulus.
- `node --test tests/petik-kata-fix.test.cjs`: **5 lulus, 0 gagal, 0 skip**.
- Smoke test patcher HTML pada salinan sementara: lulus; backup dibuat dan pemasangan kedua terdeteksi idempoten.

Tes tersebut adalah static/unit regression test. Belum ada klaim bahwa permainan sudah diuji langsung pada perangkat fisik, browser mobile, atau sesi H5P yang dipublikasikan.

## Batasan eksekusi

Dua koneksi GitHub yang tersedia melaporkan `push: false` dan `admin: false`. Branch `main` tidak protected, tetapi koneksi ini tetap tidak memiliki hak tulis. Karena itu tidak ada branch/commit/PR baru, workflow belum dipasang pada repositori, dan deployment belum dijalankan.

Browser modern dapat menolak autoplay audio sampai ada interaksi pengguna. Selain itu, permintaan XHR/Web Audio ke aset lokal dapat diblokir saat file HTML dibuka langsung dengan `file://`; pengujian offline sebaiknya memakai server HTTP lokal.

## Langkah rilis yang aman

1. Berikan akses `write` ke koneksi GitHub yang akan dipakai.
2. Terapkan patch pada branch `fix/petik-kata-responsive-audio`.
3. Jalankan GitHub Actions quality gate dan tinjau perubahan.
4. Uji di desktop, Android, dan iOS pada portrait/landscape, serta kasus autoplay diblokir.
5. Gabungkan setelah lulus dan hubungkan branch rilis dengan target hosting internal yang memang digunakan proyek.
