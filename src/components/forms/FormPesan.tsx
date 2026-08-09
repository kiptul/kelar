"use client";

import { useActionState, useMemo, useState } from "react";
import TombolAksi from "@/components/ui/TombolAksi";
import { simpanTemplate } from "@/app/(app)/pengaturan/actions";
import { isiTemplate } from "@/lib/notifikasi";
import type { JenisNotifikasi } from "@/lib/types";

export type TemplateAwal = {
  id: string;
  jenis: JenisNotifikasi;
  isi: string;
  aktif: boolean;
};

type Baris = { id: string; jenis: JenisNotifikasi; isi: string; aktif: boolean };

export type Keterangan = Record<JenisNotifikasi, { judul: string; kapan: string }>;

// Cermin aturan di simpanTemplate. Ditulis ulang di sisi klien supaya kasir
// tahu sebelum menekan simpan, bukan sesudah — tapi server tetap memeriksa
// sendiri, karena pemeriksaan di browser bisa dilewati.
function cacat(isi: string): "nama" | "pendek" | null {
  if (!isi.includes("{nama}")) return "nama";
  if (isi.trim().length < 10) return "pendek";
  return null;
}

export default function FormPesan({
  awal,
  keterangan,
  urutan,
  contoh,
  footer,
}: {
  awal: TemplateAwal[];
  keterangan: Keterangan;
  urutan: JenisNotifikasi[];
  // Nama dan kode order sungguhan dari order terakhir, supaya contoh hasil
  // jadinya terbaca seperti pesan yang benar-benar akan terkirim.
  contoh: { nama: string; kode: string };
  // Catatan nota yang ditempelkan kirimNotifikasi di akhir tiap pesan. Ikut
  // ditampilkan di pratinjau: contoh yang tidak memuatnya akan menjanjikan
  // bentuk yang berbeda dari yang benar-benar sampai ke pelanggan.
  footer: string | null;
}) {
  const [hasil, aksi] = useActionState(simpanTemplate, null);
  const [baris, setBaris] = useState<Baris[]>(() =>
    awal.map((t) => ({ id: t.id, jenis: t.jenis, isi: t.isi, aktif: t.aktif })),
  );

  const asli = useMemo(
    () => new Map(awal.map((t) => [t.id, { isi: t.isi, aktif: t.aktif }])),
    [awal],
  );

  const berubah = useMemo(() => {
    const set = new Set<string>();
    for (const b of baris) {
      const a = asli.get(b.id);
      if (a && (a.isi !== b.isi || a.aktif !== b.aktif)) set.add(b.id);
    }
    return set;
  }, [baris, asli]);

  const rusak = baris.filter((b) => cacat(b.isi));

  const ubah = (id: string, tambalan: Partial<Baris>) => {
    setBaris((lama) =>
      lama.map((b) => (b.id === id ? { ...b, ...tambalan } : b)),
    );
  };

  const terurut = urutan
    .map((j) => baris.find((b) => b.jenis === j))
    .filter((b): b is Baris => Boolean(b));

  return (
    <>
      {/* Menyebut nama templatenya. Di daftar enam kartu, "ada yang salah"
          tanpa nama memaksa kasir menggulir memeriksa satu per satu. */}
      {rusak.length > 0 && (
        <div className="mt-5 border border-tinta bg-white p-3.5">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em]">
            Belum bisa disimpan
          </p>
          <p className="mt-2 text-sm leading-relaxed text-tinta-2">
            {rusak.length === 1 ? "Template " : `${rusak.length} template (`}
            {rusak.map((b) => `“${keterangan[b.jenis].judul}”`).join(", ")}
            {rusak.length === 1 ? "" : ")"} belum memenuhi aturan: setiap pesan
            wajib memuat {"{nama}"} dan isinya minimal 10 huruf.
          </p>
        </div>
      )}

      <form action={aksi} className="mt-5">
        <ul className="flex flex-col gap-2">
          {terurut.map((b) => {
            const disunting = berubah.has(b.id);
            const salah = cacat(b.isi);
            const ket = keterangan[b.jenis];

            return (
              <li
                key={b.id}
                className={`border border-l-[3px] bg-white p-3.5 transition-colors ${
                  salah
                    ? "border-tinta border-l-tinta"
                    : disunting
                      ? "border-aksen border-l-aksen"
                      : b.aktif
                        ? "border-garis border-l-garis"
                        : "border-garis border-l-kertas opacity-75"
                }`}
              >
                <input type="hidden" name="id" value={b.id} />

                <div className="flex items-start gap-2.5">
                  <span
                    aria-hidden="true"
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full border ${
                      disunting ? "border-aksen bg-aksen" : "border-garis"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <label
                      htmlFor={`isi-${b.id}`}
                      className="block font-semibold leading-snug"
                    >
                      {ket.judul}
                    </label>
                    <p className="mt-0.5 text-xs leading-relaxed text-tinta-3">
                      {ket.kapan}
                    </p>
                  </div>
                </div>

                <textarea
                  id={`isi-${b.id}`}
                  name={`isi-${b.id}`}
                  rows={3}
                  value={b.isi}
                  onChange={(e) => ubah(b.id, { isi: e.target.value })}
                  required
                  minLength={10}
                  className={`mt-3 w-full resize-y bg-white p-3 text-base leading-relaxed outline-none focus:ring-1 focus:ring-aksen ${
                    salah ? "border-2 border-tinta" : "border border-garis"
                  }`}
                />

                <div className="mt-1.5 flex items-baseline justify-between gap-3">
                  <span
                    className={
                      salah
                        ? "text-xs font-semibold leading-relaxed text-tinta"
                        : "font-mono text-[10px] uppercase tracking-[0.14em] text-tinta-3"
                    }
                  >
                    {salah === "nama"
                      ? "Wajib memuat {nama} — tanpa itu pesan terbaca seperti siaran massal"
                      : salah === "pendek"
                        ? "Isi minimal 10 huruf"
                        : b.isi.includes("{kode}")
                          ? "Memuat {nama} dan {kode}"
                          : "Memuat {nama}"}
                  </span>
                  <span className="angka shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-tinta-3">
                    {b.isi.trim().length} huruf
                  </span>
                </div>

                {/* Contoh hasil jadi menempel di kartunya, bukan di balik
                    tombol pratinjau: yang perlu dinilai pemilik bukan satu
                    pesan, melainkan bagaimana keenamnya terdengar berurutan. */}
                <div className="mt-3 border border-garis bg-kertas-terang p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-tinta-3">
                      Contoh hasil jadi
                    </span>
                    <span className="truncate font-mono text-[10px] uppercase tracking-[0.14em] text-tinta-3">
                      {contoh.nama}
                    </span>
                  </div>
                  <div className="mt-2 border border-aksen bg-aksen-muda px-3 py-2.5">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                      {footer
                        ? `${isiTemplate(b.isi, contoh)}\n\n${footer}`
                        : isiTemplate(b.isi, contoh)}
                    </p>
                  </div>
                </div>

                <label
                  className={`mt-3 flex min-h-12 cursor-pointer items-center gap-2.5 border px-3 font-semibold transition-colors ${
                    b.aktif
                      ? "border-aksen bg-aksen-muda"
                      : "border-garis bg-kertas-terang"
                  }`}
                >
                  <input
                    type="checkbox"
                    name={`aktif-${b.id}`}
                    checked={b.aktif}
                    onChange={(e) => ubah(b.id, { aktif: e.target.checked })}
                    className="peer sr-only"
                  />
                  <span
                    aria-hidden="true"
                    className={`h-[22px] w-[22px] shrink-0 border peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-aksen ${
                      b.aktif
                        ? "border-aksen bg-aksen shadow-[inset_0_0_0_3px_var(--color-aksen-muda)]"
                        : "border-tinta-3"
                    }`}
                  />
                  <span className="text-sm">
                    {b.aktif ? "Kirim pesan ini" : "Tidak dikirim"}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>

        {hasil?.error && (
          <p className="mt-4 border-l-[3px] border-red-800 bg-red-50 px-3 py-2.5 text-sm text-red-900">
            {hasil.error}
          </p>
        )}
        {hasil?.pesan && (
          <p className="mt-4 border-l-[3px] border-aksen bg-aksen-muda px-3 py-2.5 text-sm text-aksen">
            {hasil.pesan}
          </p>
        )}

        <div className="mt-4">
          <TombolAksi
            saatMenunggu="Menyimpan..."
            nonaktif={berubah.size === 0 || rusak.length > 0}
          >
            {rusak.length > 0
              ? "Perbaiki dulu"
              : berubah.size === 0
                ? "Simpan pesan"
                : `Simpan ${berubah.size} perubahan`}
          </TombolAksi>
          <p className="mt-2 text-center text-xs leading-relaxed text-tinta-3">
            {rusak.length > 0
              ? `${rusak.length} template belum memenuhi aturan`
              : berubah.size === 0
                ? "Belum ada yang diubah"
                : "Berlaku untuk pesan berikutnya"}
          </p>
        </div>
      </form>
    </>
  );
}
