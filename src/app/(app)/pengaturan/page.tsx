import Link from "next/link";
import { getProfil } from "@/lib/profil";
import { hpCantik } from "@/lib/format";
import { NOMOR_ADMIN } from "@/lib/kontak";
import { version as versiAplikasi } from "../../../../package.json";

export const dynamic = "force-dynamic";

const ISI = [
  {
    href: "/pengaturan/layanan",
    judul: "Layanan & harga",
    ket: "Daftar layanan yang muncul saat mencatat order",
  },
  {
    href: "/pengaturan/pesan",
    judul: "Pesan WhatsApp",
    ket: "Teks yang dikirim otomatis ke pelanggan",
  },
  {
    href: "/pengaturan/usaha",
    judul: "Profil usaha",
    ket: "Nama, alamat, nomor telepon, dan catatan di bawah nota",
  },
];

export default async function Pengaturan() {
  const { laundry } = await getProfil();

  return (
    <div className="px-4 pt-5 md:px-0 md:pt-0">
      {/* Judul besar, sama seperti tiga halaman anaknya. Sebelumnya halaman ini
          sendirian memakai label mono kecil, jadi berpindah dari sini ke
          Layanan terasa seperti berpindah ke aplikasi lain. */}
      <h1 className="text-2xl font-bold tracking-tight">Pengaturan</h1>

      <div className="mt-5 border border-garis bg-white">
        {ISI.map((i, urutan) => (
          <Link
            key={i.href}
            href={i.href}
            className={`baris group flex min-h-[4.5rem] items-center gap-3.5 px-4 py-3.5 transition-colors active:bg-kertas-terang ${
              urutan > 0 ? "border-t border-garis" : ""
            }`}
          >
            {/* Pita tipis yang menyala saat disentuh. Di layar HP tanpa
                penunjuk tetikus, ini satu-satunya balasan bahwa barisnya
                memang tertekan sebelum halaman berikutnya termuat. */}
            <span
              aria-hidden="true"
              className="w-[3px] self-stretch bg-garis transition-colors group-active:bg-aksen"
            />
            <span className="min-w-0 flex-1">
              <span className="block font-semibold leading-snug">
                {i.judul}
              </span>
              <span className="mt-0.5 block text-[13px] leading-relaxed text-tinta-2">
                {i.ket}
              </span>
            </span>
            <span aria-hidden="true" className="shrink-0 text-tinta-3">
              →
            </span>
          </Link>
        ))}
      </div>

      <section className="mt-7">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.22em] text-tinta-3">
          Akun
        </h2>

        {/* Bentuknya sengaja dibedakan dari baris menu di atas: latar bidang
            kerja alih-alih kartu putih, garis tinta, tanpa panah, dan tidak
            bisa ditekan. Kelar tidak punya alur lupa-password lewat email,
            jadi satu-satunya jalan yang benar adalah lewat pengelola — dan itu
            dikatakan terus terang, bukan disembunyikan di balik tombol yang
            ujungnya buntu. */}
        <div className="mt-2.5 border border-tinta bg-kertas-terang p-4">
          <p className="font-semibold">Ganti password</p>
          <p className="mt-1.5 text-sm leading-relaxed text-tinta-2">
            Password akun {laundry.nama} diatur oleh pengelola Kelar. Hubungi
            admin untuk menggantinya.
          </p>

          {/* Nomornya ditampilkan hanya kalau memang diisi. "Hubungi admin"
              tanpa nomor adalah saran yang tidak bisa diikuti. */}
          {NOMOR_ADMIN && (
            <p className="mt-3 flex items-baseline gap-2.5 border-t border-garis pt-3">
              <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.22em] text-tinta-3">
                Admin
              </span>
              <a
                href={`https://wa.me/${NOMOR_ADMIN}`}
                className="angka font-mono text-sm tracking-[0.04em] text-aksen underline underline-offset-4"
              >
                {hpCantik(NOMOR_ADMIN)}
              </a>
            </p>
          )}
        </div>
      </section>

      {/* Angkanya dibaca dari package.json, bukan ditulis ulang di sini —
          nomor versi yang disalin manual selalu berakhir tertinggal, dan versi
          yang salah lebih menyesatkan daripada tidak ada versi sama sekali. */}
      <div className="mt-7 flex items-baseline justify-between border-t border-garis pt-4">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-tinta-3">
          Kelar
        </span>
        <span className="angka font-mono text-[10px] uppercase tracking-[0.22em] text-tinta-3">
          Versi {versiAplikasi}
        </span>
      </div>
    </div>
  );
}
