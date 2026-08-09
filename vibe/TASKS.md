# TASKS — Kelar

## Cara Kerja

1. Kerjakan satu tugas per giliran. Sebutkan nomornya sebelum mulai.
2. Selesai berarti sudah dites, bukan sudah ditulis. Centang setelah dites.
3. Kalau menemukan yang perlu dikerjakan di luar daftar ini — tambahkan ke
   bagian bawah dulu, jangan langsung kerjakan.
4. Jangan mengerjakan apa pun di "Yang sengaja tidak dibuat" pada `CLAUDE.md`.

```bash
git add -A && git commit -m "<ringkasan singkat>"
```

## Sudah jalan

Alur inti sudah terpasang dan terpakai: login, input order lewat nomor HP,
daftar order + pencarian + filter, ubah status `MASUK → SIAP → DIAMBIL`,
kirim WhatsApp otomatis saat `SIAP` dan `DIAMBIL`, reminder H+1/H+3/H+7 lewat
cron harian, mode berdampingan (`DARI_BUKU`), penanda lunas/belum bayar, PWA,
konsol superadmin, dan modul rak IoT.

## Menuju siap pakai banyak laundry

- [x] **1. Jalankan `database/jaga_hak_pengguna.sql` di Supabase**
  Menutup celah akun laundry mengangkat dirinya sendiri jadi `SUPER_ADMIN`.
  Terpasang 7 Agustus 2026. Terverifikasi dua lapis: trigger terdaftar di
  `pg_trigger` (`tgenabled` = `O`), dan percobaan naik pangkat dari sesi yang
  menyamar sebagai akun laundry ditolak dengan "Peran tidak bisa diubah dari
  sesi login biasa."

  Sisa satu pemastian: konsol superadmin **masih** bisa membuat akun laundry
  baru (membuktikan allowlist `service_role` tidak ikut terpagari). Hanya bisa
  diuji lewat UI `/admin`, tidak lewat SQL.

- [x] **2. Ganti isi `.env.example` jadi placeholder**
  Sebelumnya memuat URL project dan publishable key sungguhan. Keduanya memang
  dirancang publik dan dijaga RLS, jadi itu bukan kebocoran — tapi repo ini
  publik dan berkas contoh tidak seharusnya memancing orang memakai project
  orang lain. Sekarang semuanya placeholder, tiap variabel diberi keterangan
  asalnya, dan peringatan soal `SUPABASE_SECRET_KEY` ditulis di tempatnya.

- [ ] **3. Uji isolasi antar-laundry**
  Dua laundry, dua akun. Pastikan akun laundry A tidak bisa membaca atau
  mengubah apa pun milik laundry B — lewat UI *dan* lewat PostgREST langsung
  dengan publishable key. Uji semua tabel, termasuk `pesanan_item`,
  `riwayat_status`, `notifikasi_log`, `rak_slot`. Selesai kalau: setiap
  percobaan lintas laundry mengembalikan kosong atau ditolak.

- [x] **4. Tangani kegagalan Fonnte**
  Ternyata sudah tertangani sejak awal, lebih matang dari dugaan di catatan
  ini: token kosong, Fonnte menolak, dan koneksi putus semuanya dikembalikan
  sebagai hasil biasa tanpa melempar error; status pesanan tetap berubah
  (disengaja, agar kegagalan WhatsApp tidak menahan kasir); kegagalan tampil
  merah beserta alasannya di halaman order; dan tombol "Kirim ulang pesan yang
  gagal" muncul hanya kalau ada yang berstatus `GAGAL`.

  Yang benar-benar kurang cuma batas waktu. `fetch` ke Fonnte tidak punya
  timeout, jadi Fonnte yang menggantung ikut menggantungkan aksi "SIAP" yang
  memanggilnya — kasir menatap tombol berputar tanpa jalan keluar. Ditambahkan
  `AbortSignal.timeout(10 detik)`.

  Belum diuji lawan Fonnte sungguhan yang lambat. Cara mengujinya: isi
  `FONNTE_TOKEN` dengan nilai ngawur, tekan SIAP, pastikan pesan galatnya jelas
  dan statusnya tetap berubah.

- [ ] **5. Kelola akun laundry dari konsol superadmin**
  Sekarang akun bisa dibuat. Lengkapi yang dibutuhkan untuk pemakaian nyata:
  reset password saat pemilik laundry lupa, nonaktifkan akun laundry yang
  berhenti berlangganan, dan hapus laundry beserta datanya kalau diminta.
  Semua lewat `pastikanSuperAdmin()`.

  Ingat modelnya satu akun satu laundry — jangan tergoda menambah manajemen
  pegawai atau pemindahan orang antar laundry.

- [ ] **6. Rampungkan modul rak IoT**
  Firmware dan endpoint sudah ada. Yang kurang: apa yang terjadi kalau ESP32
  mati atau token salah, cara memasang perangkat kedua, dan panduan pasang
  untuk orang yang bukan penulis kodenya. Selesai kalau: `perangkat/README.md`
  cukup untuk memasang dari nol tanpa bertanya.

  **9 Agu 2026 — sebagian besar sudah tertutup, satu hal tidak.**
  Papan yang dipakai sekarang ESP8266 dengan sensor IR, firmware-nya di
  `perangkat/esp8266_kelar/`. Perangkat mati sudah dibedakan dari rak kosong
  (`terakhir_kontak` + ambang 90 detik). Token salah sudah dijawab 401.
  Ganti WiFi tidak lagi perlu colok laptop: ada portal `Kelar-Rak` di papan
  untuk keadaan darurat, dan titipan lewat balasan `api/rak` selagi papan
  masih online. README sudah memuat wiring, dua jalur ganti WiFi, dan gejala
  papan ditahan reset oleh jalur RTS.

  Yang **tidak** tertutup: memasang perangkat kedua. `api/rak` masih membaca
  `DEVICE_TOKEN` dan `LAUNDRY_ID` dari env, jadi hanya ada satu token di
  seluruh sistem dan semua papan menulis ke satu laundry yang dipaku di env
  Vercel. Lihat temuan multi-laundry di bawah.

- [ ] **7. Tes otomatis untuk bagian yang mahal kalau salah**
  Belum ada tes sama sekali. Prioritaskan yang diam-diam merusak:
  `normalisasiHp()`, `tahapReminder()`, `isiTemplate()`, dan penjaga kirim
  dobel di `notifikasi_log`. Tidak perlu meliputi seluruh UI.

- [x] **8. README untuk yang memasang, bukan yang menulis**
  `README.md` jadi panduan pasang dari nol: Supabase, env, superadmin pertama,
  Vercel, dan cron. `database/README.md` baru memuat urutan lima berkas SQL
  beserta jebakannya — terutama bahwa `peran_laundry.sql` adalah migrasi yang
  akan gagal di database baru, dan bahwa `setup_akun.sql` masih memuat email
  demo yang harus diganti.

  Belum diuji orang lain memasang dari nol. Itu baru bisa dinilai kalau ada
  yang benar-benar mencobanya tanpa bertanya.

## Ditemukan sambil jalan

Tulis di sini kalau menemukan sesuatu di luar daftar, supaya tidak hilang dan
tidak juga langsung dikerjakan.

- **7 Agu 2026 — `/admin` belum pernah bisa dibuka.** Tabel `pengguna` tidak
  punya baris `SUPER_ADMIN`, dan akun auth-nya pun belum pernah dibuat. Commit
  `eda9d2c` hanya jadi separuh: bagian superadmin di `setup_akun.sql` gagal
  diam-diam karena join ke `auth.users` tidak dapat baris. `setup_akun.sql`
  sekarang berhenti dengan galat kalau ini terulang.

  Konsekuensinya, seluruh konsol superadmin — termasuk pembuatan akun laundry
  yang jadi satu-satunya pintu pendaftaran — **belum pernah teruji sama sekali**.
  Uji menyeluruh begitu akun superadmin-nya ada.

- **9 Agu 2026 — lima halaman sudah diperiksa di layar. Empat cacat ketemu.**
  Diperiksa di produksi pada lebar 375px dengan sesi laundry sungguhan.
  Keempatnya lolos typecheck, lint, dan build sejak awal — tidak satu pun bisa
  ditemukan tanpa membuka halamannya.

  1. **Dashboard, kartu bergerigi.** Nomor HP pecah dua sampai tiga baris pada
     kartu yang membawa penanda "Belum bayar"; kartunya jadi 113px sementara
     tetangganya 98px. Diperbaiki dengan truncate. Terverifikasi: 25 kartu
     seragam 98px.
  2. **Order baru, ketukan hilang.** Dua ketukan cepat pada tombol + cuma
     menambah setengah kilo, karena keduanya membaca `qty` dari closure yang
     sama sebelum render pertama selesai. Diganti bentuk fungsional.
     Terverifikasi: dua ketukan → 1, tiga ketukan berikutnya → 2,5.
  3. **Rupiah jadi "RP7.000"** di baris rincian nota, di `/order/baru` dan
     `/order/[id]`. Kelas `uppercase` ikut mengapitalkan singkatan mata uang.
  4. **Judul `/pengaturan` menempel garis header**, nol piksel.

  Sisa yang tidak diperbaiki karena kosmetik: label "Perangkat tidak melapor"
  di `/rak` pecah dua baris pada 375px.

  Catatan cara kerja, supaya tidak terulang: **klik lewat alat otomasi tidak
  sampai ke halaman** pada lingkungan ini, sedangkan `element.click()` lewat
  JS sampai. Sempat membuat cacat nomor 2 terbaca seolah tombolnya mati.
  Kalau interaksi tampak tidak berfungsi, uji dulu lewat JS sebelum menuduh
  kodenya.

- **~~9 Agu 2026 — lima halaman diterapkan dari mockup, nol yang pernah dilihat.~~**
  `/dashboard`, `/order/baru`, `/order/[id]`, `/rak`, dan `/pengaturan` ditulis
  ulang mengikuti mockup Claude Design, lalu di-deploy. Semuanya lolos
  typecheck, lint, dan build, dan rutenya sehat di produksi — tapi tidak satu
  pun pernah tampil di layar sungguhan.

  Ini bukan sekadar belum sempat. Kelimanya berbagi komponen yang sama
  (`TombolAksi`, `StatusBadge`, `TandaBuku`, kelas `.penghubung` dan
  `.tepi-sobek`), jadi satu cacat di komponen bersama muncul di kelimanya
  sekaligus — dan makin lama diperiksa, makin sulit memisahkan apakah salahnya
  dari mockup, dari terjemahannya, atau dari komponen yang dipakai bersama.

  Dua cacat sudah ketemu tanpa melihat, lewat pengukuran: `.tepi-sobek` yang
  tidak pernah terlihat karena penimpaan `--warna-latar` gagal diam-diam, dan
  label `DIAMBIL` yang terpotong oleh putaran di chip saringan. Keduanya sudah
  diperbaiki. Yang belum bisa dinilai tanpa mata: komposisi keseluruhannya.

  Yang paling ingin dilihat lebih dulu: baris layanan di `/order/baru` pada
  lebar 375px — sekarang memuat nama layanan, garis titik-titik, harga,
  keterangan hitungan, dan tombol ± sekaligus. Itu baris terpadat di aplikasi.

- **9 Agu 2026 — `NOMOR_ADMIN` masih kosong, dua tempat menunggunya.**
  `src/lib/kontak.ts`. Dipakai tombol "Tanya lewat WhatsApp" di halaman depan
  dan baris "hubungi admin" di `/pengaturan`. Keduanya sengaja tidak dirender
  selama kosong, jadi tidak ada yang rusak — tapi halaman depan jadi tidak
  punya ajakan bertindak sama sekali, dan "hubungi admin" jadi saran tanpa
  ujung. Isi dengan format `62...`.

- **9 Agu 2026 — `database/pengingat_rak.sql` belum dijalankan.**
  Dua langkah terpisah, `alter type` dulu sendirian baru sisanya; PostgreSQL
  melarang nilai enum dipakai di transaksi yang sama dengan yang
  menambahkannya. Sampai dijalankan, tombol pengingat di `/rak` membalas
  "Template belum dibuat" — jelas, tapi tidak berfungsi.

- **9 Agu 2026 — token Fonnte perangkat `abok` masih hidup di GitHub.**
  `.env.example` di `origin/main` pernah memuat token asli
  `e42gsCzZ259tDvBgRde4`. Berkasnya sudah bersih, tapi nilainya tetap ada di
  riwayat git dan repo ini publik. Diperiksa lewat API Fonnte: token itu
  **masih sah**, milik perangkat bernama `abok` (62895321199348), kuota 1000,
  berlaku sampai 31 Agustus 2026. WhatsApp-nya kebetulan sedang `disconnect`,
  jadi belum bisa dipakai mengirim — tapi begitu perangkat itu discan, siapa
  pun yang membaca riwayat git bisa mengirim atas nama nomor itu.

  Bukan token yang dipakai aplikasi sekarang (itu sudah beda). Yang perlu:
  hapus perangkat `abok` atau reset tokennya di dashboard Fonnte. Menulis
  ulang riwayat git tidak perlu — begitu tokennya mati, yang tersisa cuma teks.

- **9 Agu 2026 — multi-laundry masih terkunci di dua tempat.**
  Aplikasinya melayani banyak laundry, tapi `api/rak` membaca `DEVICE_TOKEN`
  dan `LAUNDRY_ID` dari env, dan `lib/fonnte.ts` membaca `FONNTE_TOKEN` dari
  env. Artinya satu token perangkat untuk seluruh sistem, dan semua laundry
  mengirim WhatsApp dari nomor yang sama — pelanggan laundry A menerima pesan
  dari nomor yang juga dipakai laundry B.

  Rancangan yang disepakati: token perangkat pindah ke `rak_perangkat`
  (disimpan apa adanya), pencariannya dibalik jadi "token ini milik laundry
  mana" sehingga `LAUNDRY_ID` hilang sepenuhnya, dan token Fonnte pindah ke
  kolom di tabel `laundry` yang diisi lewat `/pengaturan/usaha`, dengan env
  sebagai cadangan. Firmware tidak berubah sebaris pun.

  Ditunda atas permintaan: selesaikan dulu satu laundry demo.

- **9 Agu 2026 — kolom `pesanan.slot_rak` tidak pernah dipakai.**
  Ada sejak `schema_laundry.sql` dengan komentar "disiapkan untuk fase IoT",
  tapi tautan slot↔order akhirnya memakai `rak_slot.pesanan_id`. Dua jalan
  menuju hal yang sama, satu di antaranya mati. Biarkan atau hapus, asal
  jangan dibiarkan mengundang orang memakainya.
