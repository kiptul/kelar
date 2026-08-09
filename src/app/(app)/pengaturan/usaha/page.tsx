import Link from "next/link";
import FormUsaha from "@/components/forms/FormUsaha";
import { getProfil } from "@/lib/profil";
import { isiTemplate } from "@/lib/notifikasi";

export const dynamic = "force-dynamic";

type PesananContoh = { kode: string; pelanggan: { nama: string } | null };

export default async function PengaturanUsaha() {
  const { db, laundry } = await getProfil();

  // Contoh pesannya dirakit dari bahan sungguhan: template "cucian siap" milik
  // laundry ini dan order terakhir yang tercatat. Kalimat karangan akan
  // memperlihatkan bentuk yang tidak pernah benar-benar dikirim.
  const [{ data: templat }, { data: terakhir }] = await Promise.all([
    db
      .from("template_pesan")
      .select("isi")
      .eq("laundry_id", laundry.id)
      .eq("jenis", "SIAP")
      .maybeSingle(),
    db
      .from("pesanan")
      .select("kode, pelanggan:pelanggan_id(nama)")
      .eq("laundry_id", laundry.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const contohPesanan = terakhir as unknown as PesananContoh | null;

  const contohPesan = isiTemplate(
    templat?.isi ??
      "Halo {nama}, cucian Anda ({kode}) sudah selesai dan siap diambil. Terima kasih.",
    {
      nama: contohPesanan?.pelanggan?.nama ?? "Ibu Sari",
      kode: contohPesanan?.kode ?? "0108-01",
    },
  );

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
        Nama, alamat, dan telepon tampil di kepala setiap nota. Catatan nota
        ikut di akhir tiap pesan WhatsApp.
      </p>

      <FormUsaha
        awal={{
          nama: laundry.nama,
          alamat: laundry.alamat ?? "",
          telp: laundry.telp ?? "",
          footer: laundry.footer_nota ?? "",
        }}
        contohPesan={contohPesan}
      />
    </div>
  );
}
