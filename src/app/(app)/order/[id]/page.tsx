import Link from "next/link";
import { notFound } from "next/navigation";
import StatusBadge from "@/components/ui/StatusBadge";
import TandaBuku from "@/components/ui/TandaBuku";
import TombolAksi from "@/components/ui/TombolAksi";
import TombolBatalOrder from "@/components/ui/TombolBatalOrder";
import TombolKirimUlang from "@/components/ui/TombolKirimUlang";
import { getProfil } from "@/lib/profil";
import { hpCantik, rupiah, tanggalLengkap } from "@/lib/format";
import type {
  JenisNotifikasi,
  StatusPembayaran,
  StatusPesanan,
  SumberPesanan,
} from "@/lib/types";
import { ubahBayar, ubahStatus } from "./actions";

export const dynamic = "force-dynamic";

type Detail = {
  id: string;
  kode: string;
  subtotal: number;
  diskon: number;
  total: number;
  status: StatusPesanan;
  status_bayar: StatusPembayaran;
  sumber: SumberPesanan;
  catatan: string | null;
  created_at: string;
  pelanggan: { nama: string; no_hp: string } | null;
};

// Alur maju status. BATAL tidak ada di sini karena ia bukan langkah lanjutan,
// melainkan jalan keluar yang bisa diambil dari mana saja sebelum selesai.
const ALUR = ["MASUK", "SIAP", "DIAMBIL"] as const;

const TEKS_STATUS: Record<StatusPesanan, string> = {
  MASUK: "Order dicatat",
  SIAP: "Status jadi Siap",
  DIAMBIL: "Diambil pelanggan",
  BATAL: "Order dibatalkan",
};

const TEKS_NOTIF: Record<JenisNotifikasi, string> = {
  SIAP: "Pesan “cucian siap”",
  REMINDER_H1: "Pengingat H+1",
  REMINDER_H3: "Pengingat H+3",
  REMINDER_H7: "Pengingat H+7",
  TERIMA_KASIH: "Pesan terima kasih",
  PENGINGAT_RAK: "Pengingat dari rak",
};

export default async function DetailOrder({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { db } = await getProfil();

  const { data } = await db
    .from("pesanan")
    .select(
      "id, kode, subtotal, diskon, total, status, status_bayar, sumber, catatan, created_at, pelanggan:pelanggan_id(nama, no_hp)",
    )
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();
  const pesanan = data as unknown as Detail;

  const [{ data: item }, { data: riwayat }, { data: notifikasi }] =
    await Promise.all([
      db
        .from("pesanan_item")
        .select("id, nama_layanan, qty, harga_satuan, subtotal")
        .eq("pesanan_id", id),
      db
        .from("riwayat_status")
        .select("id, status, waktu")
        .eq("pesanan_id", id)
        .order("waktu"),
      db
        .from("notifikasi_log")
        .select("id, jenis, status, keterangan, waktu")
        .eq("pesanan_id", id)
        .order("waktu"),
    ]);

  // Kapan tiap status tercapai, untuk dua kolom tanggal di kepala nota.
  const waktuStatus: Partial<Record<StatusPesanan, string>> = {};
  for (const r of riwayat ?? []) {
    const s = r.status as StatusPesanan;
    if (!waktuStatus[s]) waktuStatus[s] = r.waktu;
  }

  // Satu garis waktu, bukan dua daftar terpisah. Perubahan status dan pesan
  // WhatsApp itu satu rangkaian kejadian bagi kasir — memisahkannya memaksa
  // dia mencocokkan jam di dua tempat untuk tahu pesan mana milik langkah mana.
  const garisWaktu = [
    ...(riwayat ?? []).map((r) => ({
      kunci: `s-${r.id}`,
      waktu: r.waktu,
      teks: TEKS_STATUS[r.status as StatusPesanan] ?? r.status,
      aksen: false,
    })),
    ...(notifikasi ?? []).map((n) => ({
      kunci: `n-${n.id}`,
      waktu: n.waktu,
      teks:
        `${TEKS_NOTIF[n.jenis as JenisNotifikasi] ?? n.jenis} ` +
        (n.status === "TERKIRIM"
          ? "terkirim"
          : n.status === "GAGAL"
            ? `gagal terkirim${n.keterangan ? ` · ${n.keterangan}` : ""}`
            : "menunggu dikirim"),
      aksen: n.status === "TERKIRIM",
    })),
  ].sort((a, b) => a.waktu.localeCompare(b.waktu));

  const gagal = (notifikasi ?? []).filter((n) => n.status === "GAGAL");

  const idx = ALUR.indexOf(pesanan.status as (typeof ALUR)[number]);
  const batal = pesanan.status === "BATAL";
  const selesai = pesanan.status === "DIAMBIL";

  // Aksi berikutnya menyebut apa yang sedang dikerjakan saat ditunggu —
  // pengiriman WhatsApp butuh sedetik dua detik, dan diam tanpa keterangan
  // membuatnya terasa macet.
  const berikutnya =
    pesanan.status === "MASUK"
      ? {
          status: "SIAP" as const,
          label: "Tandai siap diambil",
          menunggu: "Mengirim WhatsApp...",
        }
      : pesanan.status === "SIAP"
        ? {
            status: "DIAMBIL" as const,
            label: "Tandai sudah diambil",
            menunggu: "Mengirim terima kasih...",
          }
        : null;

  const lunas = pesanan.status_bayar === "LUNAS";
  const relevanBayar = !batal;
  // Sama dengan aturan di daftar order: hanya order yang cuciannya sudah
  // keluar tapi uangnya belum masuk. Menandai yang masih SIAP mengenai
  // separuh order, karena pembayaran memang jatuh saat pengambilan.
  const perluDitagih = selesai && !lunas;

  const labelKanan = selesai ? "Diambil" : batal ? "Dibatalkan" : "Siap";
  const waktuKanan = selesai
    ? waktuStatus.DIAMBIL
    : batal
      ? waktuStatus.BATAL
      : waktuStatus.SIAP;

  return (
    <div className="md:mx-auto md:max-w-3xl">
      <div className="flex items-center gap-3 border-b border-garis px-4 py-3 md:px-6">
        <Link
          href="/dashboard"
          className="flex h-9 w-9 shrink-0 items-center justify-center border border-garis text-tinta-2 active:bg-kertas"
          aria-label="Kembali ke daftar order"
        >
          ←
        </Link>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-tinta-3">
            Detail order
          </p>
          <p className="angka font-mono text-base font-semibold tracking-[0.06em]">
            {pesanan.kode}
          </p>
        </div>
        <span className="shrink-0">
          <StatusBadge status={pesanan.status} />
        </span>
      </div>

      {/* Pesan gagal naik ke atas nota. Kalau pemberitahuan "cucian siap"
          tidak sampai, pelanggan tidak datang — itu kabar yang harus terbaca
          sebelum apa pun, bukan ditemukan setelah menggulir ke dasar halaman. */}
      {gagal.length > 0 && (
        <section className="px-4 pt-4 md:px-6">
          <div className="border border-tinta bg-white p-3.5">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em]">
              Pesan WhatsApp gagal terkirim
            </p>
            <p className="mt-2 text-sm leading-relaxed text-tinta-2">
              {gagal.length === 1
                ? `${TEKS_NOTIF[gagal[0].jenis as JenisNotifikasi]} tidak sampai ke pelanggan.`
                : `${gagal.length} pesan tidak sampai ke pelanggan.`}{" "}
              Pelanggan belum tahu kabar cuciannya.
            </p>
            <div className="mt-3">
              <TombolKirimUlang id={pesanan.id} />
            </div>
          </div>
        </section>
      )}

      <div className="md:grid md:grid-cols-[1fr_19rem] md:items-start">
        {/* Nota: satu lembar putih di atas latar kertas, lengkap dengan tepi
            sobek di bawahnya — bentuk yang sama dengan ikon aplikasi. */}
        <section className="min-w-0 px-4 pt-5 md:px-6">
          <div className="relative border border-garis bg-white px-5 pt-5 shadow-[0_18px_40px_-32px_rgba(0,0,0,0.55)]">
            {batal && (
              <span className="absolute right-0 top-4 border border-tinta bg-kertas px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.22em]">
                Dibatalkan
              </span>
            )}

            <p className="text-xl font-semibold leading-snug">
              {pesanan.pelanggan?.nama ?? "—"}
            </p>
            <p className="angka mt-1 font-mono text-sm text-tinta-2">
              {pesanan.pelanggan ? hpCantik(pesanan.pelanggan.no_hp) : ""}
            </p>

            {(pesanan.sumber === "DARI_BUKU" || perluDitagih) && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {pesanan.sumber === "DARI_BUKU" && <TandaBuku />}
                {perluDitagih && (
                  <span className="inline-flex items-center border border-tinta px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider">
                    Belum bayar
                  </span>
                )}
              </div>
            )}

            <div className="mt-4 flex gap-8 border-y border-garis py-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-tinta-3">
                  Masuk
                </p>
                <p className="angka mt-0.5 font-mono text-[13px]">
                  {tanggalLengkap(pesanan.created_at)}
                </p>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-tinta-3">
                  {labelKanan}
                </p>
                <p
                  className={`angka mt-0.5 font-mono text-[13px] ${
                    waktuKanan ? "" : "text-tinta-3"
                  }`}
                >
                  {waktuKanan ? tanggalLengkap(waktuKanan) : "Belum"}
                </p>
              </div>
            </div>

            <ul className="mt-4 space-y-3">
              {(item ?? []).map((i) => (
                <li key={i.id}>
                  <div className="flex items-baseline gap-1">
                    <span className="font-medium leading-snug">
                      {i.nama_layanan}
                    </span>
                    <span className="penghubung" aria-hidden="true" />
                    <span className="angka shrink-0 font-mono text-sm">
                      {rupiah(i.subtotal)}
                    </span>
                  </div>
                  <p className="angka mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-tinta-3">
                    {i.qty} × {rupiah(i.harga_satuan)}
                  </p>
                </li>
              ))}
            </ul>

            <div className="mt-4 border-t border-garis pt-3">
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-tinta-3">
                  Subtotal
                </span>
                <span className="angka font-mono text-sm text-tinta-2">
                  {rupiah(pesanan.subtotal)}
                </span>
              </div>

              {/* Baris diskon hanya muncul kalau memang ada potongan. "−Rp0"
                  di tiap nota cuma menambah baris yang tidak pernah berarti. */}
              {pesanan.diskon > 0 && (
                <div className="mt-1.5 flex items-baseline justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-tinta-3">
                    Diskon
                  </span>
                  <span className="angka font-mono text-sm text-tinta-2">
                    −{rupiah(pesanan.diskon)}
                  </span>
                </div>
              )}

              <div className="mt-3 flex items-baseline justify-between border-t-2 border-tinta pb-5 pt-3.5">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.22em]">
                    Total
                  </p>
                  {relevanBayar && (
                    <p
                      className={`mt-1 font-mono text-[10px] uppercase tracking-[0.18em] ${
                        lunas ? "text-aksen" : "text-tinta-2"
                      }`}
                    >
                      {lunas ? "Lunas" : "Belum dibayar"}
                    </p>
                  )}
                </div>
                <span className="angka font-mono text-[26px] font-semibold tracking-tight">
                  {rupiah(pesanan.total)}
                </span>
              </div>
            </div>

            {pesanan.catatan && (
              <p className="border-t border-dashed border-garis pb-5 pt-4 text-sm italic leading-relaxed text-tinta-2">
                “{pesanan.catatan}”
              </p>
            )}
          </div>
          <div className="tepi-sobek" aria-hidden="true" />
        </section>

        <aside className="px-4 pt-6 md:px-6 md:pt-5">
          {relevanBayar && (
            <section>
              <h2 className="font-mono text-[10px] uppercase tracking-[0.22em] text-tinta-3">
                Pembayaran
              </h2>
              {/* Berbentuk kotak centang, bukan tombol sekali pakai, supaya
                  terbaca sebagai keadaan yang bisa dicabut. Salah pencet
                  "Lunas" itu wajar di konter yang ramai; kalau tidak ada jalan
                  pulang, kasir berhenti mempercayai layar lalu kembali ke buku. */}
              <form action={ubahBayar} className="mt-2.5">
                <input type="hidden" name="id" value={pesanan.id} />
                <input
                  type="hidden"
                  name="bayar"
                  value={lunas ? "BELUM" : "LUNAS"}
                />
                <button
                  className={`flex min-h-[3.25rem] w-full items-center gap-3 border px-3.5 text-left font-semibold transition-colors ${
                    lunas
                      ? "border-aksen bg-aksen-muda"
                      : "border-garis bg-white active:bg-kertas"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`h-[22px] w-[22px] shrink-0 border ${
                      lunas
                        ? "border-aksen bg-aksen shadow-[inset_0_0_0_3px_var(--color-aksen-muda)]"
                        : "border-tinta-3"
                    }`}
                  />
                  {lunas ? "Sudah lunas" : "Tandai lunas"}
                </button>
              </form>
              <p className="mt-2 text-xs leading-relaxed text-tinta-3">
                {lunas
                  ? "Salah pencet? Tekan sekali lagi untuk membatalkan."
                  : "Bisa dibatalkan kapan saja dengan menekan ulang."}
              </p>
            </section>
          )}

          <section className={relevanBayar ? "mt-6" : ""}>
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-mono text-[10px] uppercase tracking-[0.22em] text-tinta-3">
                Status cucian
              </h2>
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-tinta-3">
                Satu arah
              </span>
            </div>

            {/* Tiga kotak ini penanda jalan, bukan tombol. Tidak ada cara
                memundurkan status, jadi kasir tidak perlu menebak mana yang
                boleh ditekan — yang bisa ditekan cuma satu, di bawahnya. */}
            <ol className="mt-2.5 flex border border-garis bg-white">
              {ALUR.map((k, i) => {
                const kini = !batal && i === idx;
                const lewat = !batal && i < idx;
                return (
                  <li
                    key={k}
                    aria-current={kini ? "step" : undefined}
                    className={`flex h-11 flex-1 items-center justify-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] ${
                      i > 0 ? "border-l border-garis" : ""
                    } ${
                      kini
                        ? "bg-aksen-muda text-tinta"
                        : lewat
                          ? "text-tinta-2"
                          : "text-tinta-3 opacity-60"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`h-[7px] w-[7px] shrink-0 rounded-full border ${
                        kini
                          ? "border-aksen bg-aksen"
                          : lewat
                            ? "border-tinta-3 bg-tinta-3"
                            : "border-garis"
                      }`}
                    />
                    {k.charAt(0) + k.slice(1).toLowerCase()}
                  </li>
                );
              })}
            </ol>

            <div className="mt-2.5 space-y-2">
              {berikutnya && (
                <form action={ubahStatus}>
                  <input type="hidden" name="id" value={pesanan.id} />
                  <input type="hidden" name="status" value={berikutnya.status} />
                  <TombolAksi saatMenunggu={berikutnya.menunggu}>
                    {berikutnya.label}
                  </TombolAksi>
                </form>
              )}

              {(selesai || batal) && (
                <p className="border border-garis bg-kertas px-3.5 py-3 text-sm leading-relaxed text-tinta-2">
                  {batal
                    ? "Order sudah dibatalkan. Statusnya tidak bisa diubah lagi — catat ulang kalau cuciannya kembali masuk."
                    : "Order sudah diambil. Ini akhir alur, statusnya tidak bisa diubah lagi."}
                </p>
              )}

              {berikutnya && <TombolBatalOrder id={pesanan.id} />}
            </div>
          </section>
        </aside>
      </div>

      <section className="px-4 pb-5 pt-6 md:px-6">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.22em] text-tinta-3">
          Riwayat
        </h2>
        {!garisWaktu.length ? (
          <p className="mt-2.5 text-sm text-tinta-3">Belum ada kejadian.</p>
        ) : (
          <ol className="mt-3 space-y-3.5 border-l border-garis pl-4">
            {garisWaktu.map((g) => (
              <li key={g.kunci} className="relative">
                <span
                  aria-hidden="true"
                  className={`absolute -left-[1.3rem] top-1.5 h-[7px] w-[7px] rounded-full border ${
                    g.aksen ? "border-aksen bg-aksen" : "border-tinta-3 bg-kertas-terang"
                  }`}
                />
                <p className="text-sm leading-snug">{g.teks}</p>
                <p className="angka mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-tinta-3">
                  {tanggalLengkap(g.waktu)}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
