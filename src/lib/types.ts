// LAUNDRY = akun milik satu laundry, bukan jabatan seseorang. Satu laundry
// hanya boleh punya satu akun (lihat database/peran_laundry.sql).
export type PeranPengguna = "SUPER_ADMIN" | "LAUNDRY";
export type StatusPesanan = "MASUK" | "SIAP" | "DIAMBIL" | "BATAL";
export type StatusPembayaran = "BELUM" | "LUNAS";
export type SumberPesanan = "BARU" | "DARI_BUKU";
export type JenisNotifikasi =
  | "SIAP"
  | "REMINDER_H1"
  | "REMINDER_H3"
  | "REMINDER_H7"
  | "TERIMA_KASIH"
  | "PENGINGAT_RAK";
export type StatusKirim = "PENDING" | "TERKIRIM" | "GAGAL";

export interface Laundry {
  id: string;
  nama: string;
  alamat: string | null;
  telp: string | null;
  footer_nota: string | null;
}

export interface Pelanggan {
  id: string;
  laundry_id: string;
  nama: string;
  no_hp: string;
}

export interface Layanan {
  id: string;
  laundry_id: string;
  nama: string;
  satuan: string;
  harga: number;
  aktif: boolean;
}

export interface Pesanan {
  id: string;
  laundry_id: string;
  pelanggan_id: string;
  kode: string;
  subtotal: number;
  diskon: number;
  total: number;
  status: StatusPesanan;
  status_bayar: StatusPembayaran;
  sumber: SumberPesanan;
  catatan: string | null;
  created_at: string;
}

export interface PesananItem {
  id: string;
  pesanan_id: string;
  layanan_id: string | null;
  nama_layanan: string;
  qty: number;
  harga_satuan: number;
  subtotal: number;
}

export interface RiwayatStatus {
  id: number;
  pesanan_id: string;
  status: StatusPesanan;
  waktu: string;
}

export interface NotifikasiLog {
  id: number;
  pesanan_id: string;
  jenis: JenisNotifikasi;
  no_tujuan: string;
  isi: string | null;
  status: StatusKirim;
  keterangan: string | null;
  waktu: string;
}
