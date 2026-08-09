"use client";

import { useActionState, useMemo, useState } from "react";
import TombolAksi from "@/components/ui/TombolAksi";
import { simpanLayanan } from "@/app/(app)/pengaturan/actions";
import type { Layanan } from "@/lib/types";

type Baris = {
  id: string;
  nama: string;
  harga: string;
  satuan: string;
  aktif: boolean;
};

const gayaLabelKecil =
  "mb-1.5 block font-mono text-[10px] uppercase tracking-[0.22em] text-tinta-3";

function keBaris(l: Layanan): Baris {
  return {
    id: l.id,
    nama: l.nama,
    harga: String(l.harga),
    satuan: l.satuan,
    aktif: l.aktif,
  };
}

function sama(a: Baris, b: Baris): boolean {
  return (
    a.nama === b.nama &&
    a.harga === b.harga &&
    a.satuan === b.satuan &&
    a.aktif === b.aktif
  );
}

// Daftar layanan yang bisa disunting, disimpan sekaligus.
//
// Simpan sekaligus dipertahankan, bukan tombol per baris: menaikkan harga
// biasanya pekerjaan borongan — sekali duduk, beberapa layanan, ikut kenaikan
// harga sabun atau listrik. Tombol per baris memaksa enam kali tekan untuk
// satu keputusan, dan tinggal setengah jadi kalau kasir terganggu di tengah.
//
// Risikonya perubahan terasa hilang karena tidak ada yang membalas tiap
// ketikan. Itu yang ditutup di sini: baris yang disunting diberi titik dan
// tepi hijau, dan tombolnya menyebutkan berapa baris yang menunggu.
export default function FormLayanan({ awal }: { awal: Layanan[] }) {
  const [hasil, aksi] = useActionState(simpanLayanan, null);
  const [baris, setBaris] = useState<Baris[]>(() => awal.map(keBaris));

  // Pembanding dibekukan pada nilai saat halaman dimuat. Setelah tersimpan,
  // halaman dimuat ulang oleh revalidatePath sehingga pembandingnya ikut
  // segar — tidak perlu menyetelnya sendiri di sini.
  const asli = useMemo(() => awal.map(keBaris), [awal]);

  const berubah = useMemo(() => {
    const set = new Set<string>();
    for (const b of baris) {
      const a = asli.find((x) => x.id === b.id);
      if (a && !sama(a, b)) set.add(b.id);
    }
    return set;
  }, [baris, asli]);

  const nolAktif = baris.filter((b) => b.aktif && Number(b.harga) === 0);

  const ubah = (id: string, tambalan: Partial<Baris>) => {
    setBaris((lama) =>
      lama.map((b) => (b.id === id ? { ...b, ...tambalan } : b)),
    );
  };

  return (
    <>
      {/* Menyebut nama layanannya, bukan sekadar "ada harga nol". Di daftar
          enam baris, peringatan tanpa nama memaksa kasir memeriksa satu per
          satu untuk tahu mana yang dimaksud. */}
      {nolAktif.length > 0 && (
        <div className="mt-5 border border-tinta bg-white p-3.5">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em]">
            Ada harga yang masih nol
          </p>
          <p className="mt-2 text-sm leading-relaxed text-tinta-2">
            {nolAktif.length === 1 ? (
              <>Layanan “{nolAktif[0].nama}” masih aktif dengan harga nol.</>
            ) : (
              <>
                {nolAktif.length} layanan aktif (
                {nolAktif.map((b) => b.nama).join(", ")}) masih berharga nol.
              </>
            )}{" "}
            Order yang memakainya akan bertotal nol sampai harganya diisi.
          </p>
        </div>
      )}

      <form action={aksi} className="mt-5">
        <ul className="flex flex-col gap-2">
          {baris.map((b) => {
            const disunting = berubah.has(b.id);
            const hargaNol = b.aktif && Number(b.harga) === 0;

            return (
              <li
                key={b.id}
                className={`border border-l-[3px] bg-white p-3.5 transition-colors ${
                  disunting
                    ? "border-aksen border-l-aksen"
                    : b.aktif
                      ? "border-garis border-l-garis"
                      : "border-garis border-l-kertas opacity-75"
                }`}
              >
                <input type="hidden" name="id" value={b.id} />

                <div className="flex items-center gap-2.5">
                  {/* Titik yang menyala begitu barisnya disunting. Ini yang
                      membuat "simpan sekaligus" tidak berarti "tidak
                      kelihatan". */}
                  <span
                    aria-hidden="true"
                    className={`h-2 w-2 shrink-0 rounded-full border ${
                      disunting ? "border-aksen bg-aksen" : "border-garis"
                    }`}
                  />
                  <label htmlFor={`nama-${b.id}`} className="sr-only">
                    Nama layanan
                  </label>
                  <input
                    id={`nama-${b.id}`}
                    name={`nama-${b.id}`}
                    value={b.nama}
                    onChange={(e) => ubah(b.id, { nama: e.target.value })}
                    required
                    minLength={2}
                    className="h-12 w-full min-w-0 border border-garis bg-white px-3 font-semibold outline-none focus:border-aksen focus:ring-1 focus:ring-aksen"
                  />
                </div>

                <div className="mt-3 flex gap-2">
                  <div className="min-w-0 flex-1">
                    <label htmlFor={`harga-${b.id}`} className={gayaLabelKecil}>
                      Harga
                    </label>
                    {/* "Rp" jadi bagian kotaknya, bukan angkanya. Kolom angka
                        yang menerima "Rp7000" akan ditolak validasi number,
                        dan menaruhnya di label membuat kasir mengetiknya
                        lagi. */}
                    <div
                      className={`flex items-stretch border bg-white focus-within:ring-1 focus-within:ring-aksen ${
                        hargaNol ? "border-tinta" : "border-garis"
                      }`}
                    >
                      <span className="flex items-center pl-3 font-mono text-sm text-tinta-3">
                        Rp
                      </span>
                      <input
                        id={`harga-${b.id}`}
                        name={`harga-${b.id}`}
                        type="number"
                        inputMode="numeric"
                        min={0}
                        step={500}
                        value={b.harga}
                        onChange={(e) => ubah(b.id, { harga: e.target.value })}
                        required
                        className="angka h-12 w-full min-w-0 bg-transparent px-2.5 font-mono outline-none"
                      />
                    </div>
                  </div>

                  <div className="w-24 shrink-0">
                    <label htmlFor={`satuan-${b.id}`} className={gayaLabelKecil}>
                      Satuan
                    </label>
                    <select
                      id={`satuan-${b.id}`}
                      name={`satuan-${b.id}`}
                      value={b.satuan}
                      onChange={(e) => ubah(b.id, { satuan: e.target.value })}
                      className="h-12 w-full border border-garis bg-white px-2 outline-none focus:border-aksen"
                    >
                      <option value="kg">kg</option>
                      <option value="pcs">pcs</option>
                    </select>
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
                  <span className="text-sm">Tampilkan saat mencatat order</span>
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
          <TombolAksi saatMenunggu="Menyimpan..." nonaktif={berubah.size === 0}>
            {berubah.size === 0
              ? "Simpan perubahan"
              : `Simpan ${berubah.size} perubahan`}
          </TombolAksi>
          <p className="mt-2 text-center text-xs leading-relaxed text-tinta-3">
            {berubah.size === 0
              ? "Belum ada yang diubah"
              : "Berlaku untuk order berikutnya, bukan order lama"}
          </p>
        </div>
      </form>
    </>
  );
}
