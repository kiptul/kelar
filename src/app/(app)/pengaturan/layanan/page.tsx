import Link from "next/link";
import FormAdmin from "@/components/forms/FormAdmin";
import FormLayanan from "@/components/forms/FormLayanan";
import { gayaInput, gayaLabel } from "@/components/forms/gaya";
import { getProfil } from "@/lib/profil";
import { tambahLayanan } from "../actions";
import type { Layanan } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PengaturanLayanan() {
  const { db, laundry } = await getProfil();

  const { data } = await db
    .from("layanan")
    .select("id, laundry_id, nama, satuan, harga, aktif")
    .eq("laundry_id", laundry.id)
    .order("created_at");

  const layanan = (data ?? []) as Layanan[];

  return (
    <div className="px-4 md:px-0">
      <Link
        href="/pengaturan"
        className="font-mono text-[11px] uppercase tracking-wider text-tinta-3"
      >
        ← Pengaturan
      </Link>

      <h1 className="mt-3 text-2xl font-bold tracking-tight">Layanan & harga</h1>
      <p className="mt-1 text-sm leading-relaxed text-tinta-2">
        Yang aktif muncul sebagai pilihan saat mencatat order. Order lama tetap
        memakai harga saat order itu dibuat.
      </p>

      {/* Peringatan harga nol dan tombol simpan ikut pindah ke dalam
          FormLayanan: keduanya harus membalas ketikan yang sedang berjalan,
          bukan keadaan saat halaman terakhir dimuat dari server. */}
      {layanan.length ? (
        <FormLayanan awal={layanan} />
      ) : (
        <div className="mt-6 border border-dashed border-garis bg-white px-5 py-7 text-center">
          <span
            className="mx-auto mb-4 block h-px w-7 bg-aksen"
            aria-hidden="true"
          />
          <p className="text-base font-semibold">Belum ada layanan</p>
          <p className="mt-2 text-sm leading-relaxed text-tinta-2">
            Layar catat order masih kosong sampai ada satu layanan aktif di
            sini. Tambahkan lewat kotak di bawah.
          </p>
        </div>
      )}

      <section className="mt-9 border-t border-garis pt-6">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.22em] text-tinta-3">
          Tambah layanan
        </h2>

        <div className="mt-3 border border-garis bg-white p-4">
          <FormAdmin
            aksi={tambahLayanan}
            saatMenunggu="Menambah..."
            tombol="Tambah layanan"
          >
            <div>
              <label htmlFor="nama-baru" className={gayaLabel}>
                Nama layanan
              </label>
              <input
                id="nama-baru"
                name="nama"
                required
                minLength={2}
                autoComplete="off"
                placeholder="mis. Cuci selimut"
                className={gayaInput}
              />
            </div>

            <div className="flex gap-2">
              <div className="min-w-0 flex-1">
                <label htmlFor="harga-baru" className={gayaLabel}>
                  Harga
                </label>
                {/* "Rp" jadi bagian kotaknya, sama seperti di daftar di atas —
                    kolom angka menolak "Rp7000", dan menaruhnya di label
                    membuat orang mengetiknya lagi. */}
                <div className="flex items-stretch border border-garis bg-white focus-within:ring-1 focus-within:ring-aksen">
                  <span className="flex items-center pl-3 font-mono text-sm text-tinta-3">
                    Rp
                  </span>
                  <input
                    id="harga-baru"
                    name="harga"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={500}
                    defaultValue={0}
                    required
                    className="angka h-12 w-full min-w-0 bg-transparent px-2.5 font-mono outline-none"
                  />
                </div>
              </div>

              <div className="w-24 shrink-0">
                <label htmlFor="satuan-baru" className={gayaLabel}>
                  Satuan
                </label>
                <select
                  id="satuan-baru"
                  name="satuan"
                  defaultValue="kg"
                  className="h-12 w-full border border-garis bg-white px-2 outline-none focus:border-aksen"
                >
                  <option value="kg">kg</option>
                  <option value="pcs">pcs</option>
                </select>
              </div>
            </div>
          </FormAdmin>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-tinta-2">
          Layanan tidak bisa dihapus. Yang sudah tidak dipakai cukup dimatikan
          lewat “Tampilkan saat mencatat order” — riwayat order lama tetap utuh
          karena menyimpan salinan nama dan harganya sendiri.
        </p>
      </section>
    </div>
  );
}
