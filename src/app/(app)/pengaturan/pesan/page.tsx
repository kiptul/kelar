import Link from "next/link";
import FormAdmin from "@/components/forms/FormAdmin";
import { gayaInput, gayaLabel } from "@/components/forms/gaya";
import { getProfil } from "@/lib/profil";
import type { JenisNotifikasi } from "@/lib/types";
import { simpanTemplate } from "../actions";

export const dynamic = "force-dynamic";

// Menjelaskan kapan tiap pesan terkirim. Tanpa ini, "REMINDER_H3" tidak berarti
// apa-apa bagi orang yang cuma ingin mengubah kalimatnya.
const KETERANGAN: Record<JenisNotifikasi, { judul: string; kapan: string }> = {
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

type Template = {
  id: string;
  jenis: JenisNotifikasi;
  isi: string;
  aktif: boolean;
};

export default async function PengaturanPesan() {
  const { db, laundry } = await getProfil();

  const { data } = await db
    .from("template_pesan")
    .select("id, jenis, isi, aktif")
    .eq("laundry_id", laundry.id);

  const template = (data ?? []) as Template[];
  const urut = URUTAN.map((j) => template.find((t) => t.jenis === j)).filter(
    (t): t is Template => Boolean(t)
  );

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

      <div className="mt-5 border border-garis bg-white px-4 py-3.5">
        <p className="font-mono text-[10px] uppercase tracking-wider text-tinta-3">
          Dua kata kunci
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-tinta-2">
          <code className="font-mono text-tinta">{"{nama}"}</code> diganti nama
          pelanggan, <code className="font-mono text-tinta">{"{kode}"}</code>{" "}
          diganti kode order. Tulis persis begitu, lengkap dengan kurung
          kurawalnya.
        </p>
      </div>

      <section className="mt-7">
        {!urut.length ? (
          <p className="py-6 text-sm leading-relaxed text-tinta-3">
            Belum ada template. Hubungi admin — laundry ini dibuat tanpa template
            bawaan, dan tanpanya tidak ada pesan yang bisa terkirim.
          </p>
        ) : (
          <FormAdmin
            aksi={simpanTemplate}
            saatMenunggu="Menyimpan..."
            tombol="Simpan pesan"
          >
            <div className="space-y-4">
              {urut.map((t) => (
                <div key={t.id} className="border border-garis bg-white p-4">
                  <input type="hidden" name="id" value={t.id} />

                  <label htmlFor={`isi-${t.id}`} className={gayaLabel}>
                    {KETERANGAN[t.jenis].judul}
                  </label>
                  <p className="mb-2 text-xs leading-relaxed text-tinta-3">
                    {KETERANGAN[t.jenis].kapan}
                  </p>
                  <textarea
                    id={`isi-${t.id}`}
                    name={`isi-${t.id}`}
                    rows={3}
                    defaultValue={t.isi}
                    required
                    minLength={10}
                    className={`${gayaInput} resize-y`}
                  />

                  <label className="mt-3 flex items-center gap-2.5 text-sm">
                    <input
                      type="checkbox"
                      name={`aktif-${t.id}`}
                      defaultChecked={t.aktif}
                      className="h-4 w-4 accent-aksen"
                    />
                    Kirim pesan ini
                  </label>
                </div>
              ))}
            </div>
          </FormAdmin>
        )}
      </section>
    </div>
  );
}
