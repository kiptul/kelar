import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { NOMOR_ADMIN } from "@/lib/kontak";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Kelar — buku nota digital untuk laundry",
  description:
    "Mengganti buku nota laundry, bukan seluruh cara kerjanya. Catat order secepat menulis tangan, pelanggan dikabari sendiri lewat WhatsApp.",
};

const KENYATAAN = [
  { angka: "8", dari: "dari 14", teks: "laundry di Karawang masih mencatat di buku tulis" },
  { angka: "2", dari: "dari 14", teks: "tidak mencatat order sama sekali" },
  { angka: "0", dari: "dari 10", teks: "laundry manual yang berhasil pindah ke aplikasi" },
];

const BEDANYA = [
  {
    judul: "Buku Anda tidak dibuang",
    isi: "Boleh tetap menulis di buku. Order yang terlanjur tercatat di sana bisa dimasukkan belakangan, jadi tidak ada hari di mana semuanya harus berubah sekaligus.",
  },
  {
    judul: "Tanpa langganan bulanan",
    isi: "Tidak ada tagihan yang datang tiap bulan dan harus diingat. Itu alasan paling sering kenapa aplikasi sejenis berhenti dipakai di bulan ketiga.",
  },
  {
    judul: "Cukup HP yang sudah ada",
    isi: "Dibuat untuk layar kecil lebih dulu, bukan versi kecil dari tampilan komputer. Tidak perlu printer, tidak perlu komputer kasir.",
  },
];

const PEKERJAAN = [
  { label: "Catat", isi: "Ketik nomor HP pelanggan, datanya terpanggil. Pilih layanan, selesai." },
  { label: "Kabari", isi: "Pesan “cucian siap” terkirim sendiri lewat WhatsApp saat status diubah." },
  { label: "Ingatkan", isi: "Cucian yang menginap H+1, H+3, dan H+7 diingatkan otomatis, tanpa dikirim dobel." },
  { label: "Pantau", isi: "Rak berisi sensor: slot mana terisi, punya siapa, sudah berapa lama." },
];

export default async function Beranda() {
  // Pengunjung yang sudah login tidak perlu membaca halaman jualan. Pemeriksaan
  // ini tidak boleh memakai getProfil(): fungsi itu melempar tamu ke /login,
  // padahal justru tamu yang dituju halaman ini.
  const db = await supabaseServer();
  let masukan = false;
  try {
    const { data } = await db.auth.getUser();
    masukan = Boolean(data.user);
  } catch {
    masukan = false;
  }
  if (masukan) redirect("/dashboard");

  return (
    <main className="min-h-dvh">
      <header className="flex items-center justify-between px-6 py-5 md:px-10">
        <span className="font-mono text-[10px] uppercase tracking-[0.34em] text-tinta-2">
          Kelar
        </span>
        <Link
          href="/login"
          className="border border-garis px-4 py-2.5 font-mono text-[11px] uppercase tracking-wider text-tinta-2 active:bg-kertas"
        >
          Masuk
        </Link>
      </header>

      {/* --- Bidang identitas ------------------------------------------- */}
      <section className="bg-tinta px-6 py-16 text-kertas md:px-10 md:py-24">
        <div className="md:mx-auto md:max-w-3xl">
          <p className="font-mono text-[10px] uppercase tracking-[0.34em] text-kertas/45">
            Karawang · 2026
          </p>

          <h1 className="mt-4 text-[38px] font-bold leading-[1.05] tracking-[-0.025em] md:text-[58px]">
            Buku nota
            <br />
            laundry Anda.
          </h1>

          <span className="mt-7 block h-px w-12 bg-aksen" />

          <p className="mt-7 max-w-xl text-[16px] leading-relaxed text-kertas/70 md:text-[18px]">
            Kelar mengganti buku nota, bukan seluruh cara kerja laundry Anda.
            Mencatat order secepat menulis tangan, lalu pelanggan dikabari
            sendiri lewat WhatsApp.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            {NOMOR_ADMIN && (
              <a
                href={`https://wa.me/${NOMOR_ADMIN}`}
                className="flex min-h-[3rem] items-center justify-center bg-aksen px-6 text-sm font-medium text-white active:opacity-90"
              >
                Tanya lewat WhatsApp
              </a>
            )}
            <Link
              href="/login"
              className="flex min-h-[3rem] items-center justify-center border border-kertas/25 px-6 text-sm font-medium text-kertas active:bg-kertas/10"
            >
              Masuk ke aplikasi
            </Link>
          </div>
        </div>
      </section>

      {/* --- Kenyataan di lapangan --------------------------------------- */}
      <section className="px-6 py-14 md:px-10 md:py-20">
        <div className="md:mx-auto md:max-w-3xl">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-tinta-2">
            Kenapa dibuat
          </h2>

          <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-tinta-2">
            Kami menanyai 14 laundry di Karawang sebelum menulis satu baris kode
            pun. Hasilnya mengubah seluruh rancangan aplikasi ini.
          </p>

          <ul className="mt-8 grid gap-px border border-garis bg-garis sm:grid-cols-3">
            {KENYATAAN.map((k) => (
              <li key={k.teks} className="bg-kertas-terang px-5 py-6">
                <p className="angka font-mono text-4xl font-semibold leading-none text-tinta">
                  {k.angka}
                  <span className="ml-1.5 font-mono text-[11px] font-medium uppercase tracking-wider text-tinta-3">
                    {k.dari}
                  </span>
                </p>
                <p className="mt-3 text-sm leading-relaxed text-tinta-2">{k.teks}</p>
              </li>
            ))}
          </ul>

          <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-tinta-2">
            Angka terakhir yang paling menentukan. Yang sudah digital, digital
            sejak hari pertama berdiri — tidak ada satu pun yang berhasil pindah
            di tengah jalan. Jadi masalahnya bukan aplikasinya kurang canggih,
            tapi perpindahannya terlalu mahal.
          </p>
        </div>
      </section>

      {/* --- Bedanya ------------------------------------------------------ */}
      <section className="border-y border-garis bg-kertas-terang px-6 py-14 md:px-10 md:py-20">
        <div className="md:mx-auto md:max-w-3xl">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-tinta-2">
            Bedanya
          </h2>

          <div className="mt-8 space-y-8">
            {BEDANYA.map((b) => (
              <div key={b.judul} className="max-w-xl">
                <h3 className="text-[17px] font-bold tracking-tight">{b.judul}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-tinta-2">{b.isi}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- Yang dikerjakan --------------------------------------------- */}
      <section className="px-6 py-14 md:px-10 md:py-20">
        <div className="md:mx-auto md:max-w-3xl">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-tinta-2">
            Yang dikerjakan
          </h2>

          <ul className="mt-7 space-y-5">
            {PEKERJAAN.map((p) => (
              <li key={p.label} className="flex flex-col gap-1.5 sm:flex-row sm:gap-6">
                <span className="shrink-0 pt-0.5 font-mono text-[11px] uppercase tracking-[0.22em] text-aksen sm:w-24">
                  {p.label}
                </span>
                <span className="max-w-xl text-[15px] leading-relaxed text-tinta-2">
                  {p.isi}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* --- Penutup ------------------------------------------------------
          Kartu bertepi sobek, mengulang bentuk ikon aplikasi — penutup halaman
          memakai motif yang sama dengan pembukanya di /login. */}
      <section className="px-6 pb-16 md:px-10 md:pb-24">
        <div className="md:mx-auto md:max-w-3xl">
          <div className="border border-garis bg-white px-6 py-9 md:px-10 md:py-12">
            <h2 className="max-w-lg text-[22px] font-bold leading-snug tracking-tight md:text-[26px]">
              Mulai dari mengganti satu buku nota.
            </h2>
            <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-tinta-2">
              Akun laundry dibuatkan satu per satu, bukan lewat pendaftaran
              mandiri — supaya setiap laundry yang masuk benar-benar terpakai,
              bukan sekadar terdaftar.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              {NOMOR_ADMIN && (
                <a
                  href={`https://wa.me/${NOMOR_ADMIN}`}
                  className="flex min-h-[3rem] items-center justify-center bg-tinta px-6 text-sm font-medium text-kertas active:bg-tinta-2"
                >
                  Tanya lewat WhatsApp
                </a>
              )}
              <Link
                href="/login"
                className="flex min-h-[3rem] items-center justify-center border border-garis px-6 text-sm font-medium text-tinta-2 active:bg-kertas"
              >
                Sudah punya akun
              </Link>
            </div>
          </div>
          <div className="tepi-sobek [--warna-latar:var(--color-kertas)]" aria-hidden="true" />
        </div>
      </section>

      <footer className="border-t border-garis px-6 py-7 md:px-10">
        <div className="flex items-center justify-between gap-4 md:mx-auto md:max-w-3xl">
          <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-tinta-3">
            Kelar · Karawang
          </span>
          <span className="angka font-mono text-[10px] uppercase tracking-[0.24em] text-tinta-3">
            2026
          </span>
        </div>
      </footer>
    </main>
  );
}
