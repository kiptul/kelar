import Link from "next/link";
import FormAdmin from "@/components/forms/FormAdmin";
import { gayaInput, gayaLabel } from "@/components/forms/gaya";
import { getProfil } from "@/lib/profil";
import { simpanProfil } from "../actions";

export const dynamic = "force-dynamic";

export default async function PengaturanUsaha() {
  const { laundry } = await getProfil();

  return (
    <div className="px-4 md:px-0">
      <Link
        href="/pengaturan"
        className="font-mono text-[11px] uppercase tracking-wider text-tinta-3"
      >
        ← Pengaturan
      </Link>

      <h1 className="mt-3 text-2xl font-bold tracking-tight">Profil usaha</h1>
      <p className="mt-1 text-sm leading-relaxed text-tinta-2">
        Nama usaha tampil di layar aplikasi. Catatan nota ditempelkan di akhir
        setiap pesan WhatsApp yang terkirim ke pelanggan.
      </p>

      <div className="mt-7 border border-garis bg-white p-5">
        <FormAdmin
          aksi={simpanProfil}
          saatMenunggu="Menyimpan..."
          tombol="Simpan profil"
        >
          <div>
            <label htmlFor="nama" className={gayaLabel}>
              Nama usaha
            </label>
            <input
              id="nama"
              name="nama"
              defaultValue={laundry.nama}
              required
              minLength={3}
              className={gayaInput}
            />
          </div>

          <div>
            <label htmlFor="alamat" className={gayaLabel}>
              Alamat
            </label>
            <input
              id="alamat"
              name="alamat"
              defaultValue={laundry.alamat ?? ""}
              className={gayaInput}
            />
          </div>

          <div>
            <label htmlFor="telp" className={gayaLabel}>
              Nomor telepon
            </label>
            <input
              id="telp"
              name="telp"
              type="tel"
              inputMode="tel"
              defaultValue={laundry.telp ?? ""}
              className={`${gayaInput} angka font-mono`}
            />
          </div>

          <div>
            <label htmlFor="footer_nota" className={gayaLabel}>
              Catatan di bawah nota
            </label>
            <textarea
              id="footer_nota"
              name="footer_nota"
              rows={3}
              defaultValue={laundry.footer_nota ?? ""}
              className={`${gayaInput} resize-y`}
            />
            <p className="mt-1.5 text-xs leading-relaxed text-tinta-3">
              Ditempelkan di akhir setiap pesan WhatsApp, dipisah baris kosong.
              Biasanya berisi batas waktu komplain atau jam buka. Contohnya bisa
              dilihat di halaman Pesan WhatsApp.
            </p>
          </div>
        </FormAdmin>
      </div>

    </div>
  );
}
