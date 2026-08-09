"use server";

import { revalidatePath } from "next/cache";
import { pastikanSuperAdmin } from "@/lib/admin";
import { normalisasiHp } from "@/lib/format";
import { TEMPLATE_AWAL } from "@/lib/template-awal";

export type Hasil = { error?: string; pesan?: string } | null;


// Harganya sengaja 0. Pemilik laundry wajib mengisinya sendiri, dan angka nol
// di layar jauh lebih jelas menuntut perhatian daripada harga karangan yang
// kelihatan wajar lalu diam-diam dipakai menagih pelanggan.
//
// Tiga baris ini bukan tebakan: itu layanan yang muncul di hampir semua laundry
// yang disurvei. Yang tidak dipakai tinggal dinonaktifkan — satu ketukan, jauh
// lebih ringan daripada mengarang daftar dari layar kosong.
const LAYANAN_AWAL = [
  { nama: "Cuci Setrika Reguler", satuan: "kg", harga: 0 },
  { nama: "Cuci Setrika Express", satuan: "kg", harga: 0 },
  { nama: "Bed Cover", satuan: "pcs", harga: 0 },
];

export async function tambahLaundry(_prev: Hasil, formData: FormData): Promise<Hasil> {
  const { db } = await pastikanSuperAdmin();

  const nama = String(formData.get("nama") ?? "").trim();
  const alamat = String(formData.get("alamat") ?? "").trim();
  const telp = String(formData.get("telp") ?? "").trim();

  if (nama.length < 3) {
    return { error: "Nama laundry minimal 3 huruf." };
  }

  const { data: laundry, error } = await db
    .from("laundry")
    .insert({
      nama,
      alamat: alamat || null,
      telp: telp ? normalisasiHp(telp) : null,
      footer_nota: "Komplain maksimal 2x24 jam setelah cucian diambil.",
    })
    .select("id")
    .single();

  if (error || !laundry) {
    return { error: "Gagal menyimpan laundry." };
  }

  // Laundry baru tanpa template pesan akan gagal mengirim WhatsApp sama sekali,
  // dan kegagalannya baru terasa jauh di kemudian hari. Jadi diisi sejak awal.
  // Layanan ikut disemai dengan alasan serupa: tanpa layanan, order pertama
  // tidak bisa dicatat, dan pemiliknya menghadapi layar kosong di menit pertama.
  await Promise.all([
    db.from("template_pesan").insert(
      TEMPLATE_AWAL.map((t) => ({ ...t, laundry_id: laundry.id }))
    ),
    db.from("layanan").insert(
      LAYANAN_AWAL.map((l) => ({ ...l, laundry_id: laundry.id }))
    ),
  ]);

  revalidatePath("/admin");
  return {
    pesan: `Laundry "${nama}" dibuat beserta 5 template pesan dan 3 layanan awal. Harga layanannya masih 0 — isi dulu sebelum dipakai.`,
  };
}

export async function tambahPengguna(_prev: Hasil, formData: FormData): Promise<Hasil> {
  const { db } = await pastikanSuperAdmin();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const sandi = String(formData.get("sandi") ?? "");
  const nama = String(formData.get("nama") ?? "").trim();
  const laundryId = String(formData.get("laundry_id") ?? "");

  if (!email.includes("@")) return { error: "Email tidak sah." };
  if (sandi.length < 8) return { error: "Password minimal 8 karakter." };
  if (!nama) return { error: "Nama wajib diisi." };
  if (!laundryId) return { error: "Pilih laundry dulu." };

  // Satu laundry satu akun. Diperiksa di sini supaya tidak sempat membuat akun
  // login yang beberapa baris kemudian harus dihapus lagi; batasan sungguhannya
  // tetap ada di unique index idx_pengguna_satu_akun_per_laundry, karena
  // pemeriksaan ini bisa kalah balapan dengan dua permintaan bersamaan.
  const { data: sudahAda } = await db
    .from("pengguna")
    .select("nama")
    .eq("laundry_id", laundryId)
    .maybeSingle();

  if (sudahAda) {
    return {
      error: `Laundry ini sudah punya akun atas nama ${sudahAda.nama ?? "—"}. Hapus akun lama dulu kalau mau menggantinya.`,
    };
  }

  // Akun login dibuat lewat Admin API — perangkat lunak ini memegang kuasa itu
  // hanya di dalam pagar pastikanSuperAdmin().
  const { data: akun, error: galatAkun } = await db.auth.admin.createUser({
    email,
    password: sandi,
    email_confirm: true,
  });

  if (galatAkun || !akun?.user) {
    return { error: `Gagal membuat akun: ${galatAkun?.message ?? "tidak diketahui"}` };
  }

  const { error: galatBaris } = await db.from("pengguna").insert({
    id: akun.user.id,
    laundry_id: laundryId,
    nama,
    peran: "LAUNDRY",
  });

  if (galatBaris) {
    // Jangan tinggalkan akun login yang tidak tertaut ke laundry mana pun —
    // pemiliknya bisa masuk tapi tidak bisa berbuat apa-apa.
    await db.auth.admin.deleteUser(akun.user.id);

    // 23505 = unique_violation, yaitu balapan yang lolos dari pemeriksaan di
    // atas: laundry ini keburu dapat akun dari permintaan lain.
    return {
      error:
        galatBaris.code === "23505"
          ? "Laundry ini baru saja mendapat akun dari permintaan lain."
          : "Gagal menautkan akun ke laundry.",
    };
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/laundry/${laundryId}`);
  return { pesan: `Akun ${email} dibuat untuk laundry ini.` };
}

// Satu-satunya jalan pulih kalau pemilik laundry lupa passwordnya.
//
// Kelar sengaja tidak punya alur lupa-password lewat email, dan laundry juga
// tidak bisa mengganti passwordnya sendiri — keduanya keputusan sadar. Maka
// tanpa fungsi ini, akun yang lupa password terkunci selamanya dan satu-satunya
// jalan tersisa adalah menyentuh basis data langsung.
export async function resetSandi(_prev: Hasil, formData: FormData): Promise<Hasil> {
  const { db } = await pastikanSuperAdmin();

  const penggunaId = String(formData.get("pengguna_id") ?? "");
  const laundryId = String(formData.get("laundry_id") ?? "");
  const sandi = String(formData.get("sandi") ?? "");

  if (!penggunaId) return { error: "Akun tidak dikenali." };
  if (sandi.length < 8) return { error: "Password minimal 8 karakter." };

  // Pastikan akun yang direset memang milik laundry yang sedang dibuka. Tanpa
  // ini, id akun mana pun yang diselipkan ke formulir akan ikut diganti
  // passwordnya — termasuk akun superadmin lain.
  const { data: pemilik } = await db
    .from("pengguna")
    .select("id")
    .eq("id", penggunaId)
    .eq("laundry_id", laundryId)
    .maybeSingle();

  if (!pemilik) {
    return { error: "Akun itu bukan milik laundry ini." };
  }

  const { error } = await db.auth.admin.updateUserById(penggunaId, {
    password: sandi,
  });

  if (error) {
    return { error: `Gagal mengganti password: ${error.message}` };
  }

  revalidatePath(`/admin/laundry/${laundryId}`);
  return {
    pesan: "Password diganti. Bacakan ke pemilik laundry sekarang — password ini tidak bisa ditampilkan lagi setelah halaman ditutup.",
  };
}

export async function tambahLayanan(_prev: Hasil, formData: FormData): Promise<Hasil> {
  const { db } = await pastikanSuperAdmin();

  const laundryId = String(formData.get("laundry_id") ?? "");
  const nama = String(formData.get("nama") ?? "").trim();
  const satuan = String(formData.get("satuan") ?? "kg");
  const harga = Number(formData.get("harga") ?? 0);

  if (!laundryId || !nama) return { error: "Nama layanan wajib diisi." };
  if (!(harga > 0)) return { error: "Harga harus lebih dari nol." };

  const { error } = await db
    .from("layanan")
    .insert({ laundry_id: laundryId, nama, satuan, harga });

  if (error) return { error: "Gagal menyimpan layanan." };

  revalidatePath(`/admin/laundry/${laundryId}`);
  return { pesan: `Layanan "${nama}" ditambahkan.` };
}

// Menonaktifkan, bukan menghapus: pesanan lama menyimpan layanan_id, dan
// menghapusnya membuat riwayat harga ikut hilang.
export async function ubahAktifLayanan(formData: FormData) {
  const { db } = await pastikanSuperAdmin();

  const id = String(formData.get("id") ?? "");
  const laundryId = String(formData.get("laundry_id") ?? "");
  const aktif = formData.get("aktif") === "true";

  if (!id) return;

  await db.from("layanan").update({ aktif }).eq("id", id);
  revalidatePath(`/admin/laundry/${laundryId}`);
}
