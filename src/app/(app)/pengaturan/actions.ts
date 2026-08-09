"use server";

import { revalidatePath } from "next/cache";
import { getProfil } from "@/lib/profil";
import { TEMPLATE_AWAL } from "@/lib/template-awal";

export type Hasil = { error?: string; pesan?: string } | null;

const SATUAN = ["kg", "pcs"] as const;

// Simpan seluruh daftar layanan sekaligus.
//
// Satu tombol untuk semua baris, bukan satu tombol per baris. Alasannya cara
// kerjanya di dunia nyata: harga naik beramai-ramai, bukan satu-satu. Pemilik
// laundry membuka halaman ini sekali setahun, mengubah tiga angka, lalu pergi.
export async function simpanLayanan(_prev: Hasil, formData: FormData): Promise<Hasil> {
  const { db, laundry } = await getProfil();

  const ids = formData.getAll("id").map(String).filter(Boolean);
  if (!ids.length) return { error: "Tidak ada layanan untuk disimpan." };

  const baris = ids.map((id) => ({
    id,
    nama: String(formData.get(`nama-${id}`) ?? "").trim(),
    harga: Number(formData.get(`harga-${id}`) ?? NaN),
    satuan: String(formData.get(`satuan-${id}`) ?? ""),
    // Checkbox yang tidak dicentang tidak ikut terkirim sama sekali, jadi
    // keadaannya dibaca dari ada-tidaknya kunci, bukan dari nilainya.
    aktif: formData.has(`aktif-${id}`),
  }));

  for (const b of baris) {
    if (b.nama.length < 2) {
      return { error: "Nama layanan minimal 2 huruf." };
    }
    if (!Number.isInteger(b.harga) || b.harga < 0) {
      return { error: `Harga "${b.nama}" harus berupa angka bulat, minimal 0.` };
    }
    if (!SATUAN.includes(b.satuan as (typeof SATUAN)[number])) {
      return { error: `Satuan "${b.nama}" tidak dikenali.` };
    }
  }

  // Disimpan satu per satu dan dipagari laundry_id. RLS sebenarnya sudah
  // menahan, tapi tanpa .eq() ini sebuah id milik laundry lain yang diselipkan
  // ke formulir akan menghasilkan "berhasil" yang tidak mengubah apa pun —
  // membingungkan saat ditelusuri nanti.
  for (const b of baris) {
    const { error } = await db
      .from("layanan")
      .update({
        nama: b.nama,
        harga: b.harga,
        satuan: b.satuan,
        aktif: b.aktif,
      })
      .eq("id", b.id)
      .eq("laundry_id", laundry.id);

    if (error) {
      return { error: `Gagal menyimpan "${b.nama}": ${error.message}` };
    }
  }

  const nol = baris.filter((b) => b.aktif && b.harga === 0);

  revalidatePath("/pengaturan/layanan");
  revalidatePath("/order/baru");

  if (nol.length) {
    return {
      pesan: `Tersimpan. Tapi ${nol.length} layanan aktif masih berharga 0 — order yang memakainya akan bertotal nol.`,
    };
  }
  return { pesan: "Perubahan harga tersimpan." };
}

export async function tambahLayanan(_prev: Hasil, formData: FormData): Promise<Hasil> {
  const { db, laundry } = await getProfil();

  const nama = String(formData.get("nama") ?? "").trim();
  const harga = Number(formData.get("harga") ?? NaN);
  const satuan = String(formData.get("satuan") ?? "");

  if (nama.length < 2) return { error: "Nama layanan minimal 2 huruf." };
  if (!Number.isInteger(harga) || harga < 0) {
    return { error: "Harga harus berupa angka bulat, minimal 0." };
  }
  if (!SATUAN.includes(satuan as (typeof SATUAN)[number])) {
    return { error: "Pilih satuan dulu." };
  }

  const { error } = await db.from("layanan").insert({
    laundry_id: laundry.id,
    nama,
    harga,
    satuan,
  });

  if (error) return { error: "Gagal menambah layanan." };

  revalidatePath("/pengaturan/layanan");
  revalidatePath("/order/baru");
  return { pesan: `Layanan "${nama}" ditambahkan.` };
}

// Template pesan WhatsApp. Satu tombol untuk kelima-limanya, alasannya sama
// seperti daftar layanan: dibuka sekali saat memasang, disesuaikan seluruhnya,
// lalu ditinggalkan.
export async function simpanTemplate(_prev: Hasil, formData: FormData): Promise<Hasil> {
  const { db, laundry } = await getProfil();

  const ids = formData.getAll("id").map(String).filter(Boolean);
  if (!ids.length) return { error: "Tidak ada template untuk disimpan." };

  const baris = ids.map((id) => ({
    id,
    isi: String(formData.get(`isi-${id}`) ?? "").trim(),
    aktif: formData.has(`aktif-${id}`),
  }));

  for (const b of baris) {
    if (b.isi.length < 10) {
      return { error: "Isi pesan terlalu pendek — minimal 10 huruf." };
    }
    // Tanpa {nama}, pesan yang masuk ke pelanggan terasa seperti siaran massal
    // dan justru menurunkan kepercayaan. {kode} dibiarkan opsional karena tidak
    // semua laundry menyebut kode order ke pelanggannya.
    if (!b.isi.includes("{nama}")) {
      return {
        error: "Setiap pesan harus memuat {nama}, supaya tidak terbaca seperti pesan sebar.",
      };
    }
  }

  for (const b of baris) {
    const { error } = await db
      .from("template_pesan")
      .update({ isi: b.isi, aktif: b.aktif })
      .eq("id", b.id)
      .eq("laundry_id", laundry.id);

    if (error) {
      return { error: `Gagal menyimpan pesan: ${error.message}` };
    }
  }

  revalidatePath("/pengaturan/pesan");
  return { pesan: "Pesan tersimpan. Yang berikutnya dikirim memakai teks ini." };
}

// Profil usaha. Footer nota ikut terkirim ke pelanggan lewat WhatsApp, jadi
// yang diubah di sini terlihat keluar — bukan sekadar catatan internal.
export async function simpanProfil(_prev: Hasil, formData: FormData): Promise<Hasil> {
  const { db, laundry } = await getProfil();

  const nama = String(formData.get("nama") ?? "").trim();
  const alamat = String(formData.get("alamat") ?? "").trim();
  const telp = String(formData.get("telp") ?? "").trim();
  const footer = String(formData.get("footer_nota") ?? "").trim();

  if (nama.length < 3) return { error: "Nama laundry minimal 3 huruf." };

  const { error } = await db
    .from("laundry")
    .update({
      nama,
      alamat: alamat || null,
      telp: telp || null,
      footer_nota: footer || null,
    })
    .eq("id", laundry.id);

  if (error) return { error: "Gagal menyimpan profil." };

  // Nama laundry tampil di header dan sidebar tiap halaman, jadi seluruh
  // kerangka aplikasi ikut disegarkan — bukan cuma halaman ini.
  revalidatePath("/", "layout");
  return { pesan: "Profil usaha tersimpan." };
}

// Pasang enam template bawaan untuk laundry yang terlanjur dibuat tanpanya.
//
// Sebelum ini layar kosongnya cuma menyuruh menghubungi admin — jalan buntu
// untuk keadaan yang sebenarnya bisa dibereskan sendiri, dan selama buntu itu
// tidak ada satu pun pesan yang bisa terkirim ke pelanggan.
//
// Disisipkan satu per satu, bukan sekaligus. PENGINGAT_RAK adalah nilai enum
// yang baru ditambahkan lewat database/pengingat_rak.sql; di database yang
// belum menjalankannya, satu insert gabungan akan gagal seluruhnya dan lima
// template lain ikut batal. Dipisah, yang bisa masuk tetap masuk.
export async function pasangTemplateBawaan(): Promise<Hasil> {
  const { db, laundry } = await getProfil();

  let masuk = 0;
  let gagal = 0;

  for (const t of TEMPLATE_AWAL) {
    const { error } = await db
      .from("template_pesan")
      .insert({ laundry_id: laundry.id, jenis: t.jenis, isi: t.isi });

    // 23505 = sudah ada barisnya. Bukan kegagalan: tombol ini memang boleh
    // ditekan ulang tanpa merusak template yang sudah disunting.
    if (!error) masuk++;
    else if (error.code !== "23505") gagal++;
  }

  revalidatePath("/pengaturan/pesan");

  if (!masuk && gagal) {
    return { error: "Tidak ada template yang bisa dipasang." };
  }
  if (gagal) {
    return {
      pesan: `${masuk} template terpasang. ${gagal} gagal — kemungkinan database/pengingat_rak.sql belum dijalankan.`,
    };
  }
  return { pesan: `${masuk} template terpasang. Ubah kalimatnya sesuai gaya bicara laundry Anda.` };
}
