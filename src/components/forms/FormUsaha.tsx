"use client";

import { useActionState, useState } from "react";
import TombolAksi from "@/components/ui/TombolAksi";
import { simpanProfil } from "@/app/(app)/pengaturan/actions";

type Isi = { nama: string; alamat: string; telp: string; footer: string };

const gayaLabelKecil =
  "font-mono text-[10px] uppercase tracking-[0.22em] text-tinta-3";

export default function FormUsaha({
  awal,
  contohPesan,
}: {
  awal: Isi;
  // Template "cucian siap" milik laundry ini, sudah terisi nama dan kode order
  // sungguhan. Dipakai memperlihatkan di mana catatan nota menempel — contoh
  // yang memakai kalimat karangan akan berbeda dari yang benar-benar terkirim.
  contohPesan: string;
}) {
  const [hasil, aksi] = useActionState(simpanProfil, null);
  const [isi, setIsi] = useState<Isi>(awal);

  const ubah = (k: keyof Isi, v: string) =>
    setIsi((lama) => ({ ...lama, [k]: v }));

  const berubah = (Object.keys(isi) as (keyof Isi)[]).filter(
    (k) => isi[k] !== awal[k],
  );

  const namaKurang = isi.nama.trim().length < 3;
  const footer = isi.footer.trim();

  const kartu = (k: keyof Isi, rusak = false) =>
    `border border-l-[3px] bg-white p-3.5 transition-colors ${
      rusak
        ? "border-tinta border-l-tinta"
        : isi[k] !== awal[k]
          ? "border-aksen border-l-aksen"
          : "border-garis border-l-garis"
    }`;

  const titik = (k: keyof Isi) => (
    <span
      aria-hidden="true"
      className={`h-2 w-2 shrink-0 rounded-full border ${
        isi[k] !== awal[k] ? "border-aksen bg-aksen" : "border-garis"
      }`}
    />
  );

  return (
    <>
      {namaKurang && (
        <div className="mt-5 border border-tinta bg-white p-3.5">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em]">
            Belum bisa disimpan
          </p>
          <p className="mt-2 text-sm leading-relaxed text-tinta-2">
            Nama usaha wajib diisi, minimal 3 huruf. Nama ini yang terbaca di
            kepala setiap nota dan di seluruh halaman aplikasi.
          </p>
        </div>
      )}

      <form action={aksi} className="mt-5 flex flex-col gap-2.5">
        {/* --- Nama usaha ------------------------------------------------ */}
        <div className={kartu("nama", namaKurang)}>
          <div className="flex items-center gap-2.5">
            {titik("nama")}
            <label htmlFor="nama" className={gayaLabelKecil}>
              Nama usaha · wajib
            </label>
          </div>
          <input
            id="nama"
            name="nama"
            value={isi.nama}
            onChange={(e) => ubah("nama", e.target.value)}
            required
            minLength={3}
            placeholder="mis. Nurul Laundry"
            className={`mt-2 h-14 w-full bg-white px-3.5 text-lg font-semibold outline-none focus:ring-1 focus:ring-aksen ${
              namaKurang ? "border-2 border-tinta" : "border border-garis"
            }`}
          />
          <div className="mt-1.5 flex items-baseline justify-between gap-3">
            <span
              className={
                namaKurang
                  ? "text-xs font-semibold leading-relaxed text-tinta"
                  : `${gayaLabelKecil} tracking-[0.14em]`
              }
            >
              {namaKurang
                ? "Wajib diisi, minimal 3 huruf"
                : "Tampil di kepala aplikasi, navigasi samping, dan tiap nota"}
            </span>
            <span className="angka shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-tinta-3">
              {isi.nama.trim().length} huruf
            </span>
          </div>

          {/* Jangkauannya ditunjukkan, bukan dijelaskan. Kalimat "tampil di
              seluruh aplikasi" mudah dilewati; cuplikan yang ikut berganti
              huruf demi huruf tidak. */}
          <div className="mt-3 border border-garis bg-kertas-terang p-3">
            <p className={gayaLabelKecil}>Tampil di seluruh aplikasi</p>
            <div className="mt-2 border border-garis bg-white">
              <div className="flex items-center justify-between gap-3 border-b border-garis px-3 py-2.5">
                <div className="min-w-0">
                  <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-tinta-3">
                    Kelar
                  </p>
                  <p className="mt-0.5 truncate font-semibold">
                    {isi.nama.trim() || "Nama usaha belum diisi"}
                  </p>
                </div>
                <span className="shrink-0 border border-garis px-2 py-1 font-mono text-[9px] uppercase tracking-[0.18em] text-tinta-3">
                  Keluar
                </span>
              </div>
              <div className="px-3 py-2.5">
                <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-tinta-3">
                  Kepala nota
                </p>
                <p className="mt-0.5 truncate font-semibold">
                  {isi.nama.trim() || "Nama usaha belum diisi"}
                </p>
                <p className="angka mt-0.5 font-mono text-[11px] text-tinta-2">
                  {[isi.alamat.trim().split("\n")[0], isi.telp.trim()]
                    .filter(Boolean)
                    .join(" · ") || "Alamat dan telepon belum diisi"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* --- Alamat ---------------------------------------------------- */}
        <div className={kartu("alamat")}>
          <div className="flex items-center gap-2.5">
            {titik("alamat")}
            <label htmlFor="alamat" className={gayaLabelKecil}>
              Alamat · boleh kosong
            </label>
          </div>
          <textarea
            id="alamat"
            name="alamat"
            rows={2}
            value={isi.alamat}
            onChange={(e) => ubah("alamat", e.target.value)}
            placeholder="Jl. Melati No. 14, Karawang"
            className="mt-2 w-full resize-y border border-garis bg-white p-3 text-base leading-relaxed outline-none focus:border-aksen focus:ring-1 focus:ring-aksen"
          />
        </div>

        {/* --- Telepon --------------------------------------------------- */}
        <div className={kartu("telp")}>
          <div className="flex items-center gap-2.5">
            {titik("telp")}
            <label htmlFor="telp" className={gayaLabelKecil}>
              Nomor telepon · boleh kosong
            </label>
          </div>
          <input
            id="telp"
            name="telp"
            type="tel"
            inputMode="tel"
            value={isi.telp}
            onChange={(e) => ubah("telp", e.target.value)}
            placeholder="0812 xxxx xxxx"
            className="angka mt-2 w-full border border-garis bg-white px-3.5 py-3 font-mono text-base tracking-[0.06em] outline-none focus:border-aksen focus:ring-1 focus:ring-aksen"
          />
        </div>

        {/* --- Catatan nota ---------------------------------------------- */}
        <div className={kartu("footer")}>
          <div className="flex items-center gap-2.5">
            {titik("footer")}
            <label htmlFor="footer_nota" className={gayaLabelKecil}>
              Catatan di bawah nota · boleh kosong
            </label>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-tinta-2">
            Ditempelkan di akhir setiap pesan WhatsApp yang terkirim ke
            pelanggan, dipisah baris kosong. Biasanya batas waktu komplain atau
            jam buka.
          </p>
          <textarea
            id="footer_nota"
            name="footer_nota"
            rows={3}
            value={isi.footer}
            onChange={(e) => ubah("footer", e.target.value)}
            placeholder="Komplain diterima maksimal 1x24 jam setelah pengambilan. Buka 07.00–20.00."
            className="mt-2.5 w-full resize-y border border-garis bg-white p-3 text-base leading-relaxed outline-none focus:border-aksen focus:ring-1 focus:ring-aksen"
          />

          <div className="mt-3 border border-garis bg-kertas-terang p-3">
            <div className="flex items-center justify-between gap-3">
              <span className={gayaLabelKecil}>Contoh hasil jadi</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-tinta-3">
                Cucian siap
              </span>
            </div>
            <div className="mt-2 border border-aksen bg-aksen-muda px-3 py-2.5">
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {footer ? `${contohPesan}\n\n${footer}` : contohPesan}
              </p>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-tinta-3">
              {footer
                ? "Catatan menempel di akhir tiap pesan, dipisah satu baris kosong."
                : "Catatan kosong: pesan berhenti di kalimat terakhir, tanpa tambahan apa pun."}
            </p>
          </div>
        </div>

        {hasil?.error && (
          <p className="border-l-[3px] border-red-800 bg-red-50 px-3 py-2.5 text-sm text-red-900">
            {hasil.error}
          </p>
        )}
        {hasil?.pesan && (
          <p className="border-l-[3px] border-aksen bg-aksen-muda px-3 py-2.5 text-sm text-aksen">
            {hasil.pesan}
          </p>
        )}

        <div className="mt-1">
          <TombolAksi
            saatMenunggu="Menyimpan..."
            nonaktif={berubah.length === 0 || namaKurang}
          >
            {namaKurang
              ? "Perbaiki dulu"
              : berubah.length === 0
                ? "Simpan profil"
                : `Simpan ${berubah.length} perubahan`}
          </TombolAksi>
          <p className="mt-2 text-center text-xs leading-relaxed text-tinta-3">
            {namaKurang
              ? "Nama usaha belum memenuhi aturan"
              : berubah.length === 0
                ? "Belum ada yang diubah"
                : "Berlaku untuk nota dan pesan berikutnya"}
          </p>
        </div>
      </form>
    </>
  );
}
