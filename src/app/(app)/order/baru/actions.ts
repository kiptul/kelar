"use server";

import { redirect } from "next/navigation";
import { getProfil } from "@/lib/profil";
import { normalisasiHp } from "@/lib/format";

export type HasilSimpan = { error: string } | null;

export type PelangganKetemu = {
  nama: string;
  jumlahOrder: number;
  terakhirTanggal: string | null;
  terakhirTotal: number | null;
};

// Dipanggil dari form saat nomor HP selesai diketik.
//
// Riwayat singkatnya ikut diambil karena itu yang membedakan "nomor ini
// terdaftar" dari "saya kenal pelanggan ini": kasir yang melihat 12 order dan
// kunjungan terakhir minggu lalu tahu ia sedang melayani langganan, bukan
// sekadar baris yang kebetulan cocok. Satu kueri tambahan, hanya jalan saat
// nomornya benar-benar ketemu.
export async function cariPelanggan(
  noHp: string
): Promise<PelangganKetemu | null> {
  const hp = normalisasiHp(noHp);
  if (hp.length < 10) return null;

  const { db } = await getProfil();
  const { data } = await db
    .from("pelanggan")
    .select("id, nama")
    .eq("no_hp", hp)
    .maybeSingle();

  if (!data) return null;

  const [{ count }, { data: terakhir }] = await Promise.all([
    db
      .from("pesanan")
      .select("id", { count: "exact", head: true })
      .eq("pelanggan_id", data.id),
    db
      .from("pesanan")
      .select("total, created_at")
      .eq("pelanggan_id", data.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return {
    nama: data.nama,
    jumlahOrder: count ?? 0,
    terakhirTanggal: terakhir?.created_at ?? null,
    terakhirTotal: terakhir?.total ?? null,
  };
}

// Kode order: tanggal Jakarta + nomor urut hari itu, mis. 2707-03.
function prefixKode(tanggal: Date): string {
  const bagian = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "2-digit",
  }).formatToParts(tanggal);
  const hari = bagian.find((b) => b.type === "day")?.value ?? "00";
  const bulan = bagian.find((b) => b.type === "month")?.value ?? "00";
  return `${hari}${bulan}`;
}

// Tanggal dari <input type="date"> ("2026-07-20") jadi timestamp siang WIB.
// Dipatok siang supaya pergeseran zona waktu tidak melemparkannya ke hari lain.
function tanggalBuku(teks: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(teks)) return null;
  const waktu = new Date(`${teks}T12:00:00+07:00`);
  if (Number.isNaN(waktu.getTime())) return null;
  // Order dari buku selalu masa lalu. Beri toleransi sehari untuk beda jam.
  if (waktu.getTime() > Date.now() + 86_400_000) return null;
  return waktu;
}

export async function simpanOrder(
  _prev: HasilSimpan,
  formData: FormData
): Promise<HasilSimpan> {
  const { db, laundry } = await getProfil();

  const hp = normalisasiHp(String(formData.get("no_hp") ?? ""));
  const nama = String(formData.get("nama") ?? "").trim();
  const catatan = String(formData.get("catatan") ?? "").trim();

  if (hp.length < 10) {
    return { error: "Nomor HP belum lengkap." };
  }

  // Mode berdampingan: order lama yang disalin dari buku nota kertas.
  const dariBuku = formData.get("dari_buku") === "on";
  const tanggalMasuk = dariBuku
    ? tanggalBuku(String(formData.get("tanggal") ?? ""))
    : null;

  if (dariBuku && !tanggalMasuk) {
    return { error: "Tanggal order lama belum benar." };
  }

  // Harga diambil ulang dari database — jangan percaya angka dari browser.
  const { data: layanan } = await db
    .from("layanan")
    .select("id, nama, harga")
    .eq("aktif", true);

  const item = (layanan ?? [])
    .map((l) => {
      const qty = Number(formData.get(`qty-${l.id}`) ?? 0);
      return { l, qty };
    })
    .filter(({ qty }) => qty > 0)
    .map(({ l, qty }) => ({
      layanan_id: l.id,
      nama_layanan: l.nama,
      qty,
      harga_satuan: l.harga,
      subtotal: Math.round(l.harga * qty),
    }));

  if (!item.length) {
    return { error: "Isi jumlah untuk minimal satu layanan." };
  }

  // Pelanggan: pakai yang sudah ada, atau buat baru.
  const { data: adaPelanggan } = await db
    .from("pelanggan")
    .select("id")
    .eq("no_hp", hp)
    .maybeSingle();

  let pelangganId = adaPelanggan?.id;

  if (!pelangganId) {
    if (!nama) return { error: "Nama pelanggan baru wajib diisi." };

    const { data: baru, error: galatPelanggan } = await db
      .from("pelanggan")
      .insert({ laundry_id: laundry.id, nama, no_hp: hp })
      .select("id")
      .single();

    if (galatPelanggan || !baru) {
      return { error: "Gagal menyimpan pelanggan baru." };
    }
    pelangganId = baru.id;
  }

  const total = item.reduce((n, i) => n + i.subtotal, 0);
  // Order dari buku dapat kode bertanggal hari asalnya, bukan hari diinput,
  // supaya nomornya nyambung dengan catatan di buku kertas.
  const prefix = prefixKode(tanggalMasuk ?? new Date());

  // Nomor urut bisa bentrok kalau dua kasir menyimpan bersamaan.
  // Kalau kena unique (laundry_id, kode), coba nomor berikutnya.
  let pesananId: string | null = null;

  for (let percobaan = 0; percobaan < 5 && !pesananId; percobaan++) {
    const { count } = await db
      .from("pesanan")
      .select("id", { count: "exact", head: true })
      .like("kode", `${prefix}-%`);

    const urut = (count ?? 0) + 1 + percobaan;
    const kode = `${prefix}-${String(urut).padStart(2, "0")}`;

    const { data, error } = await db
      .from("pesanan")
      .insert({
        laundry_id: laundry.id,
        pelanggan_id: pelangganId,
        kode,
        subtotal: total,
        total,
        catatan: catatan || null,
        sumber: dariBuku ? "DARI_BUKU" : "BARU",
        ...(tanggalMasuk && { created_at: tanggalMasuk.toISOString() }),
      })
      .select("id")
      .single();

    if (data) pesananId = data.id;
    else if (error?.code !== "23505") {
      return { error: "Gagal menyimpan order." };
    }
  }

  if (!pesananId) {
    return { error: "Nomor order bentrok terus. Coba simpan lagi." };
  }

  const { error: galatItem } = await db
    .from("pesanan_item")
    .insert(item.map((i) => ({ ...i, pesanan_id: pesananId })));

  if (galatItem) {
    // Jangan tinggalkan order kosong tanpa rincian.
    await db.from("pesanan").delete().eq("id", pesananId);
    return { error: "Gagal menyimpan rincian layanan." };
  }

  // Trigger menulis riwayat MASUK dengan waktu sekarang. Untuk order dari buku,
  // waktunya diselaraskan dengan tanggal aslinya supaya tidak bertentangan
  // dengan tanggal order yang tampil di layar.
  if (tanggalMasuk) {
    await db
      .from("riwayat_status")
      .update({ waktu: tanggalMasuk.toISOString() })
      .eq("pesanan_id", pesananId)
      .eq("status", "MASUK");
  }

  redirect("/dashboard");
}
