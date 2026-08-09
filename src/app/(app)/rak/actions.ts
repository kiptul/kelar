"use server";

import { revalidatePath } from "next/cache";
import { getProfil } from "@/lib/profil";
import { kirimNotifikasi, type HasilNotifikasi } from "@/lib/notifikasi";
import type { Hasil } from "@/app/admin/actions";

// Bentuk kode slot dikunci sama dengan yang diterima api/rak. Kalau di sini
// lebih longgar, kasir bisa membuat slot yang selamanya tidak pernah dilapori
// perangkat — tampil di layar, tapi tidak pernah berubah status.
const POLA_KODE = /^[A-Z]\d{1,2}$/;

// Tautkan satu slot ke satu order. Yang ditulis kode ordernya, bukan id-nya,
// karena itu yang tertempel di nota dan yang dibaca kasir dari rak fisik.
export async function tautkanSlot(_prev: Hasil, formData: FormData): Promise<Hasil> {
  const kodeSlot = String(formData.get("kode") ?? "").trim();
  const kodeOrder = String(formData.get("pesanan") ?? "").trim();

  if (!kodeSlot) return { error: "Slot tidak dikenali." };
  if (!kodeOrder) return { error: "Pilih dulu ordernya." };

  const { db, laundry } = await getProfil();

  const { data: pesanan } = await db
    .from("pesanan")
    .select("id, kode, status")
    .eq("laundry_id", laundry.id)
    .eq("kode", kodeOrder)
    .maybeSingle();

  if (!pesanan) return { error: `Order ${kodeOrder} tidak ditemukan.` };

  // Order yang sudah diambil atau dibatalkan tidak punya cucian di rak.
  // Menautkannya cuma membuat layar berbohong.
  if (pesanan.status === "DIAMBIL" || pesanan.status === "BATAL") {
    return { error: `Order ${kodeOrder} sudah ${pesanan.status.toLowerCase()}.` };
  }

  // Satu order satu slot — ditegakkan juga oleh unique index di database.
  // Tautan lama dilepas dulu supaya pemindahan rak tidak ditolak mentah.
  await db
    .from("rak_slot")
    .update({ pesanan_id: null })
    .eq("laundry_id", laundry.id)
    .eq("pesanan_id", pesanan.id);

  const { error } = await db
    .from("rak_slot")
    .update({ pesanan_id: pesanan.id })
    .eq("laundry_id", laundry.id)
    .eq("kode", kodeSlot);

  if (error) return { error: "Gagal menautkan order ke slot." };

  revalidatePath("/rak");
  return { pesan: `Order ${pesanan.kode} ditaruh di slot ${kodeSlot}.` };
}

// Lepas tautan tanpa menyentuh status terisi. Sensor yang menentukan slot itu
// kosong atau tidak — tombol ini cuma bilang "cucian ini bukan punya order itu".
export async function lepasSlot(formData: FormData) {
  const kode = String(formData.get("kode") ?? "").trim();
  if (!kode) return;

  const { db, laundry } = await getProfil();

  await db
    .from("rak_slot")
    .update({ pesanan_id: null })
    .eq("laundry_id", laundry.id)
    .eq("kode", kode);

  revalidatePath("/rak");
}

export async function tambahSlot(_prev: Hasil, formData: FormData): Promise<Hasil> {
  const kode = String(formData.get("kode") ?? "").trim().toUpperCase();

  if (!POLA_KODE.test(kode)) {
    return { error: "Kode slot berbentuk satu huruf lalu angka, misalnya A4 atau B12." };
  }

  const { db, laundry } = await getProfil();

  const { error } = await db
    .from("rak_slot")
    .insert({ laundry_id: laundry.id, kode });

  // 23505 = unique violation. Ini bukan kegagalan sistem, cuma slot yang
  // sudah ada — dijawab sebagai kalimat biasa, bukan galat.
  if (error?.code === "23505") return { error: `Slot ${kode} sudah ada.` };
  if (error) return { error: "Gagal menambah slot." };

  revalidatePath("/rak");
  return { pesan: `Slot ${kode} ditambahkan. Pasang sensornya, lalu daftarkan pinnya di firmware.` };
}

// Titipkan setelan WiFi baru. Yang ditulis di sini baru niat — perpindahannya
// belum terjadi dan belum tentu terjadi. Perangkat mengambilnya di kabar
// berikutnya, dan yang menyatakan berhasil adalah laporan dari jaringan tujuan,
// bukan tombol ini.
export async function gantiWifi(_prev: Hasil, formData: FormData): Promise<Hasil> {
  const ssid = String(formData.get("ssid") ?? "").trim();
  const sandi = String(formData.get("sandi") ?? "");

  if (!ssid) return { error: "Nama WiFi belum diisi." };

  // WPA2 menolak sandi di bawah 8 karakter, dan perangkat akan gagal
  // menyambung tanpa pernah bisa menjelaskan kenapa. Ditahan di sini selagi
  // masih ada yang bisa membaca pesannya.
  if (sandi && sandi.length < 8) {
    return { error: "Sandi WiFi minimal 8 karakter." };
  }

  const { db, laundry } = await getProfil();

  const { error } = await db
    .from("rak_perangkat")
    .update({
      wifi_ssid_baru: ssid,
      wifi_sandi_baru: sandi,
      wifi_percobaan: 0,
      wifi_diminta: new Date().toISOString(),
      wifi_galat: null,
    })
    .eq("laundry_id", laundry.id);

  if (error) return { error: "Gagal menitipkan setelan WiFi." };

  revalidatePath("/rak");
  return {
    pesan: `Setelan dititipkan. Perangkat mengambilnya pada kabar berikutnya, paling lama 30 detik, lalu pindah ke "${ssid}".`,
  };
}

export async function batalGantiWifi() {
  const { db, laundry } = await getProfil();

  await db
    .from("rak_perangkat")
    .update({
      wifi_ssid_baru: null,
      wifi_sandi_baru: null,
      wifi_percobaan: 0,
      wifi_galat: null,
    })
    .eq("laundry_id", laundry.id);

  revalidatePath("/rak");
}

type SlotBerpenghuni = {
  pesanan: {
    id: string;
    kode: string;
    status: string;
    pelanggan: { nama: string; no_hp: string } | null;
  } | null;
};

// Kirim pengingat untuk cucian yang menginap di rak.
//
// Jenisnya PENGINGAT_RAK, bukan menumpang REMINDER_H1/H3/H7. notifikasi_log
// dipagari unique (pesanan_id, jenis): kalau tombol ini menumpang jenis yang
// sama dengan cron, siapa pun yang duluan memblokir yang lain — tekan hari
// ini, pengingat terjadwal besok tidak pernah terkirim, tanpa galat apa pun.
export async function kirimPengingatRak(
  _prev: HasilNotifikasi | null,
  formData: FormData,
): Promise<HasilNotifikasi> {
  const kode = String(formData.get("kode") ?? "").trim();
  if (!kode) return { ok: false, alasan: "Slot tidak dikenali." };

  const { db, laundry } = await getProfil();

  const { data } = await db
    .from("rak_slot")
    .select(
      "pesanan:pesanan_id(id, kode, status, pelanggan:pelanggan_id(nama, no_hp))",
    )
    .eq("laundry_id", laundry.id)
    .eq("kode", kode)
    .maybeSingle();

  const pesanan = (data as unknown as SlotBerpenghuni | null)?.pesanan;

  if (!pesanan) {
    return { ok: false, alasan: "Slot ini belum tertaut ke order mana pun." };
  }
  if (!pesanan.pelanggan) {
    return { ok: false, alasan: "Order ini tidak punya data pelanggan." };
  }
  // Order yang sudah diambil atau dibatalkan tidak menunggu siapa pun.
  // Mengirimi pengingat untuk cucian yang sudah pulang membuat pelanggan
  // datang percuma.
  if (pesanan.status === "DIAMBIL" || pesanan.status === "BATAL") {
    return {
      ok: false,
      alasan: `Order ${pesanan.kode} sudah ${pesanan.status.toLowerCase()}.`,
    };
  }

  const hasil = await kirimNotifikasi(
    db,
    {
      pesananId: pesanan.id,
      laundryId: laundry.id,
      kode: pesanan.kode,
      nama: pesanan.pelanggan.nama,
      noHp: pesanan.pelanggan.no_hp,
    },
    "PENGINGAT_RAK",
  );

  revalidatePath("/rak");
  return hasil;
}

export async function hapusSlot(formData: FormData) {
  const kode = String(formData.get("kode") ?? "").trim();
  if (!kode) return;

  const { db, laundry } = await getProfil();

  // Slot yang sedang terisi tidak dihapus. Menghapusnya membuat cucian yang
  // nyata-nyata ada di rak menghilang dari layar, dan perangkat akan
  // membuatnya muncul lagi pada laporan berikutnya lewat upsert — jadi
  // penghapusannya pun tidak bertahan.
  await db
    .from("rak_slot")
    .delete()
    .eq("laundry_id", laundry.id)
    .eq("kode", kode)
    .eq("terisi", false);

  revalidatePath("/rak");
}
