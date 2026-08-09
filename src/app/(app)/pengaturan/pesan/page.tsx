import Link from "next/link";
import FormPesan, {
  type Keterangan,
  type TemplateAwal,
} from "@/components/forms/FormPesan";
import TombolTemplateBawaan from "@/components/forms/TombolTemplateBawaan";
import { getProfil } from "@/lib/profil";
import type { JenisNotifikasi } from "@/lib/types";

export const dynamic = "force-dynamic";

// Menjelaskan kapan tiap pesan terkirim. Tanpa ini, "REMINDER_H3" tidak berarti
// apa-apa bagi orang yang cuma ingin mengubah kalimatnya.
const KETERANGAN: Keterangan = {
  SIAP: {
    judul: "Cucian siap",
    kapan: "Terkirim begitu status diubah jadi SIAP",
  },
  REMINDER_H1: {
    judul: "Pengingat hari ke-1",
    kapan: "Sehari setelah siap, kalau belum diambil",
  },
  REMINDER_H3: {
    judul: "Pengingat hari ke-3",
    kapan: "Tiga hari setelah siap, kalau belum diambil",
  },
  REMINDER_H7: {
    judul: "Pengingat hari ke-7",
    kapan: "Seminggu setelah siap, kalau belum diambil",
  },
  TERIMA_KASIH: {
    judul: "Terima kasih",
    kapan: "Terkirim begitu status diubah jadi DIAMBIL",
  },
  PENGINGAT_RAK: {
    judul: "Pengingat dari rak",
    kapan: "Dikirim manual dari halaman rak, untuk cucian yang menginap",
  },
};

const URUTAN: JenisNotifikasi[] = [
  "SIAP",
  "REMINDER_H1",
  "REMINDER_H3",
  "REMINDER_H7",
  "TERIMA_KASIH",
  "PENGINGAT_RAK",
];

type PesananContoh = { kode: string; pelanggan: { nama: string } | null };

export default async function PengaturanPesan() {
  const { db, laundry } = await getProfil();

  const [{ data }, { data: terakhir }] = await Promise.all([
    db
      .from("template_pesan")
      .select("id, jenis, isi, aktif")
      .eq("laundry_id", laundry.id),
    // Contoh hasil jadi memakai order terakhir yang tercatat, bukan nama
    // karangan. Pemilik laundry menilai kalimatnya dengan membayangkan
    // pelanggannya sendiri — nama asing membuat penilaian itu meleset.
    db
      .from("pesanan")
      .select("kode, pelanggan:pelanggan_id(nama)")
      .eq("laundry_id", laundry.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const template = (data ?? []) as TemplateAwal[];
  const contohPesanan = terakhir as unknown as PesananContoh | null;

  const contoh = {
    nama: contohPesanan?.pelanggan?.nama ?? "Ibu Sari",
    kode: contohPesanan?.kode ?? "0108-01",
  };

  return (
    <div className="px-4 md:px-0">
      <Link
        href="/pengaturan"
        className="font-mono text-[11px] uppercase tracking-wider text-tinta-3"
      >
        ← Pengaturan
      </Link>

      <h1 className="mt-3 text-2xl font-bold tracking-tight">Pesan WhatsApp</h1>
      <p className="mt-1 text-sm leading-relaxed text-tinta-2">
        Teks yang dikirim otomatis ke pelanggan. Tulis dengan gaya bicara
        laundry Anda sendiri.
      </p>

      <div className="mt-5 border border-garis bg-white p-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-tinta-3">
          Dua kata kunci
        </p>
        <dl className="mt-2.5 space-y-2">
          <div className="flex items-baseline gap-2.5">
            <dt className="shrink-0 font-mono text-sm font-semibold text-aksen">
              {"{nama}"}
            </dt>
            <dd className="text-sm leading-relaxed text-tinta-2">
              diganti nama pelanggan
            </dd>
          </div>
          <div className="flex items-baseline gap-2.5">
            <dt className="shrink-0 font-mono text-sm font-semibold text-aksen">
              {"{kode}"}
            </dt>
            <dd className="text-sm leading-relaxed text-tinta-2">
              diganti kode order
            </dd>
          </div>
        </dl>
        <p className="mt-3 border-t border-garis pt-3 text-xs leading-relaxed text-tinta-3">
          Tulis lengkap dengan kurung kurawalnya. Setiap pesan wajib memuat{" "}
          {"{nama}"}; {"{kode}"} boleh dipakai atau tidak.
        </p>
      </div>

      {template.length ? (
        <FormPesan
          awal={template}
          keterangan={KETERANGAN}
          urutan={URUTAN}
          contoh={contoh}
        />
      ) : (
        <div className="mt-6 border border-dashed border-garis bg-white px-5 py-7 text-center">
          <span
            className="mx-auto mb-4 block h-px w-7 bg-aksen"
            aria-hidden="true"
          />
          <p className="text-base font-semibold">Belum ada template</p>
          <p className="mt-2 text-sm leading-relaxed text-tinta-2">
            Tidak ada pesan otomatis yang terkirim ke pelanggan. Pasang template
            bawaan dulu, lalu ubah kalimatnya sesuai gaya bicara laundry Anda.
          </p>
          <TombolTemplateBawaan />
        </div>
      )}
    </div>
  );
}
