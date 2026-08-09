-- =====================================================
-- PENGINGAT RAK — jenis notifikasi tersendiri
-- Jalankan di Supabase SQL Editor
--
-- ⚠️ DUA LANGKAH, JANGAN DIJALANKAN SEKALIGUS.
-- PostgreSQL melarang nilai enum baru dipakai di transaksi yang sama dengan
-- yang menambahkannya. Blok LANGKAH 1 dijalankan dulu sampai selesai, baru
-- blok LANGKAH 2 dijalankan terpisah.
-- =====================================================

-- ---------- LANGKAH 1 ----------
-- Jalankan baris ini SENDIRIAN, lalu berhenti.

alter type jenis_notifikasi add value if not exists 'PENGINGAT_RAK';


-- ---------- LANGKAH 2 ----------
-- Setelah langkah 1 selesai, jalankan sisanya.
--
-- Jenisnya sengaja dipisah dari REMINDER_H1/H3/H7, bukan menumpang salah
-- satunya. notifikasi_log dipagari unique (pesanan_id, jenis) supaya pelanggan
-- tidak dikirimi pesan dobel — kalau tombol di halaman rak menumpang jenis
-- yang sama dengan cron, siapa pun yang duluan memblokir yang lain. Tekan
-- tombolnya hari ini, pengingat H+3 terjadwal besok tidak pernah terkirim,
-- diam-diam tanpa galat.

insert into template_pesan (laundry_id, jenis, isi)
select l.id, 'PENGINGAT_RAK',
       'Halo {nama}, cucian Anda ({kode}) sudah selesai dan masih kami simpan di rak. Silakan diambil ya.'
from laundry l
on conflict (laundry_id, jenis) do nothing;

-- ---------- CEK ----------
select l.nama, t.jenis, t.aktif
from template_pesan t
join laundry l on l.id = t.laundry_id
where t.jenis = 'PENGINGAT_RAK';
