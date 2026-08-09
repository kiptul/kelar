import Link from "next/link";
import KontrolDaftar from "@/components/ui/KontrolDaftar";
import StatusBadge, { pitaStatus } from "@/components/ui/StatusBadge";
import TandaBayar from "@/components/ui/TandaBayar";
import TandaBuku from "@/components/ui/TandaBuku";
import { getProfil } from "@/lib/profil";
import { hpCantik, normalisasiHp, rupiah, tanggalPendek } from "@/lib/format";
import { FILTER, type PilihanFilter } from "@/lib/filter";
import type {
  StatusPembayaran,
  StatusPesanan,
  SumberPesanan,
} from "@/lib/types";

export const dynamic = "force-dynamic";

type BarisPesanan = {
  id: string;
  kode: string;
  total: number;
  status: StatusPesanan;
  status_bayar: StatusPembayaran;
  sumber: SumberPesanan;
  created_at: string;
  pelanggan: { nama: string; no_hp: string } | null;
};

// Hanya order yang cuciannya sudah keluar tapi uangnya belum masuk.
//
// Sempat ikut menandai yang berstatus SIAP, sampai data menunjukkan itu 9 dari
// 20 order — dan memang begitu seharusnya: di kebanyakan laundry pembayaran
// jatuh saat pengambilan, jadi SIAP + BELUM adalah keadaan normal, bukan
// masalah. Menandainya membuat penanda ini kehilangan artinya. Yang tersisa
// setelah disaring adalah utang yang sesungguhnya.
//
// Untuk order yang belum diambil, keterangan bayarnya tetap terbaca di halaman
// detail — tempat kasir memang membuka saat melayani pengambilan.
function perluDitagih(p: BarisPesanan): boolean {
  return p.status === "DIAMBIL" && p.status_bayar === "BELUM";
}

// Karakter di bawah punya arti khusus di filter PostgREST — buang dulu
// supaya pencarian tidak bisa merusak query.
function amankan(teks: string): string {
  return teks.replace(/[,()\\%*]/g, " ").trim();
}

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q = "", status = "" } = await searchParams;
  const cari = amankan(q);
  const statusAktif = FILTER.includes(status as PilihanFilter)
    ? status
    : "SEMUA";

  const { db } = await getProfil();

  let kueri = db
    .from("pesanan")
    .select(
      "id, kode, total, status, status_bayar, sumber, created_at, pelanggan:pelanggan_id(nama, no_hp)",
    )
    .order("created_at", { ascending: false })
    .limit(50);

  if (statusAktif !== "SEMUA") {
    kueri = kueri.eq("status", statusAktif);
  }

  if (cari) {
    // Nama dan nomor HP ada di tabel lain, jadi cari id-nya dulu,
    // baru gabungkan dengan pencarian kode order.
    const hp = /\d{3,}/.test(cari) ? normalisasiHp(cari) : "";
    const { data: cocok } = await db
      .from("pelanggan")
      .select("id")
      .or(
        [`nama.ilike.%${cari}%`, hp && `no_hp.ilike.%${hp}%`]
          .filter(Boolean)
          .join(","),
      );

    const idPelanggan = (cocok ?? []).map((p) => p.id);
    kueri = kueri.or(
      [
        `kode.ilike.%${cari}%`,
        idPelanggan.length && `pelanggan_id.in.(${idPelanggan.join(",")})`,
      ]
        .filter(Boolean)
        .join(","),
    );
  }

  // Galatnya ditangkap, bukan diabaikan. Sebelumnya kegagalan kueri hanya
  // menghasilkan data kosong, jadi sambungan yang putus tampil persis sama
  // dengan laundry yang memang belum punya order — dan kasir diajak mencatat
  // order pertama padahal ordernya ada, cuma tidak terambil.
  const { data, error: galat } = await kueri;
  const pesanan = (data ?? []) as unknown as BarisPesanan[];

  const menyaring = Boolean(cari) || statusAktif !== "SEMUA";

  // Menghapus pencarian tidak ikut menghapus saringan status: kasir yang
  // sedang melihat "Siap" lalu mencari nama biasanya masih ingin melihat
  // "Siap" setelah pencariannya dibatalkan.
  const tanpaCari =
    statusAktif !== "SEMUA" ? `/dashboard?status=${statusAktif}` : "/dashboard";

  return (
    <div className="pb-2">
      <KontrolDaftar cari={cari} status={statusAktif}>
        <div className="flex items-baseline justify-between px-4 py-3 md:px-6">
          <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-tinta-2">
            {cari ? "Hasil Pencarian" : "Order Terbaru"}
          </span>
          <span className="angka font-mono text-[11px] text-tinta-3">
            {pesanan.length} order
          </span>
        </div>

        {galat ? (
          <div className="mx-4 mt-8 border border-red-800/40 bg-red-50 px-5 py-6 md:mx-6">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-red-900">
              Gagal memuat
            </p>
            <p className="mt-2.5 text-sm leading-relaxed text-red-950">
              Daftar order tidak terambil karena sambungan terputus. Order yang
              sudah tercatat aman di server.
            </p>
            <Link
              href={
                cari || statusAktif !== "SEMUA"
                  ? `/dashboard?${new URLSearchParams({
                      ...(cari ? { q: cari } : {}),
                      ...(statusAktif !== "SEMUA"
                        ? { status: statusAktif }
                        : {}),
                    })}`
                  : "/dashboard"
              }
              className="mt-5 flex h-12 items-center justify-center bg-tinta font-mono text-[11px] uppercase tracking-[0.22em] text-kertas active:bg-tinta-2"
            >
              Muat ulang
            </Link>
          </div>
        ) : !pesanan.length ? (
          menyaring ? (
            <div className="px-6 py-12 text-center">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-tinta-3">
                Tidak ada yang cocok
              </p>
              <p className="mx-auto mt-3 max-w-[17rem] text-sm leading-relaxed text-tinta-2">
                {cari ? (
                  <>
                    Tidak ada order dengan “{cari}”
                    {statusAktif !== "SEMUA" && (
                      <> pada saringan {statusAktif.toLowerCase()}</>
                    )}
                    .
                  </>
                ) : (
                  <>Belum ada order berstatus {statusAktif.toLowerCase()}.</>
                )}
              </p>
              <Link
                href={cari ? tanpaCari : "/dashboard"}
                className="mt-5 inline-flex h-11 items-center border border-tinta px-5 font-mono text-[10px] uppercase tracking-[0.22em] text-tinta active:bg-tinta active:text-kertas"
              >
                {cari ? "Hapus pencarian" : "Lihat semua"}
              </Link>
            </div>
          ) : (
            /* Layar kosong adalah ajakan bertindak. Dua jalan masuk karena
               memang ada dua: order yang datang sekarang, dan order yang
               terlanjur tertulis di buku — yang kedua itu justru pembeda
               utama produk ini, jadi tidak disembunyikan di dalam form. */
            <div className="mx-4 mt-10 border border-garis bg-white px-6 py-8 text-center md:mx-6">
              <span
                className="mx-auto mb-5 block h-px w-8 bg-aksen"
                aria-hidden="true"
              />
              <p className="text-lg font-bold tracking-tight">
                Catat order pertama
              </p>
              <p className="mt-2 text-sm leading-relaxed text-tinta-2">
                Mulai dari nomor HP pelanggan. Order yang sudah tertulis di buku
                juga bisa dimasukkan.
              </p>
              <Link
                href="/order/baru"
                className="mt-6 flex h-12 items-center justify-center bg-tinta font-mono text-[11px] uppercase tracking-[0.22em] text-kertas active:bg-tinta-2"
              >
                Order baru
              </Link>
              <Link
                href="/order/baru?buku=1"
                className="mt-2 flex h-12 items-center justify-center border border-garis font-mono text-[11px] uppercase tracking-[0.22em] text-tinta active:bg-kertas"
              >
                Order lama dari buku
              </Link>
            </div>
          )
        ) : (
          <>
          <ul className="flex flex-col gap-2 px-4 pt-3 md:grid md:grid-cols-2 md:gap-3 md:px-6">
            {pesanan.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/order/${p.id}`}
                  className="baris relative block h-full border border-garis bg-white py-3 pl-4 pr-3.5 transition-colors hover:border-tinta-3 active:border-tinta-3"
                >
                  <span
                    className={`absolute left-0 top-0 h-full w-[3px] ${pitaStatus[p.status]}`}
                    aria-hidden="true"
                  />
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="flex items-baseline gap-2">
                      <span className="angka font-mono text-sm font-semibold">
                        {p.kode}
                      </span>
                      {p.sumber === "DARI_BUKU" && <TandaBuku />}
                    </span>
                    <StatusBadge status={p.status} />
                  </div>
                  <p className="mt-1.5 font-medium leading-snug">
                    {p.pelanggan?.nama ?? "—"}
                  </p>
                  <div className="mt-0.5 flex items-baseline justify-between gap-3">
                    {/* Dipotong, bukan dibungkus. Begitu penanda "Belum bayar"
                        muncul di sisi kanan, sisa ruang di kiri tidak lagi
                        cukup untuk nomor HP dan tanggal — dan tanpa truncate
                        nomornya pecah jadi dua sampai tiga baris, membuat
                        kartunya lebih tinggi dari tetangganya di kisi.
                        Nomor lengkapnya ada di halaman detail. */}
                    <span className="angka min-w-0 truncate font-mono text-xs text-tinta-3">
                      {p.pelanggan ? hpCantik(p.pelanggan.no_hp) : ""} ·{" "}
                      {tanggalPendek(p.created_at)}
                    </span>
                    {/* Ditaruh menempel pada nominal, bukan di baris kode:
                        keduanya soal uang dan dibaca bersamaan. Di baris atas
                        ia harus berebut tempat dengan stempel status dan tanda
                        buku, yang di layar 375px sudah penuh. */}
                    <span className="flex shrink-0 items-baseline gap-2">
                      {perluDitagih(p) && <TandaBayar />}
                      <span className="angka font-mono text-sm">
                        {rupiah(p.total)}
                      </span>
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {/* Tepi sobek menutup tumpukan nota, lalu satu baris yang menyatakan
              daftarnya memang habis — bukan terpotong karena gagal memuat.

              Digambar lewat style, bukan kelas .tepi-sobek. Dua alasan: kelas
              itu menggambar gerigi dari sisi bawah sedangkan di sini yang
              dibutuhkan dari sisi atas, dan --warna-latar miliknya tidak bisa
              ditimpa dari utility arbitrer — .tepi-sobek ditulis di luar layer
              Tailwind sehingga selalu menang. Menimpanya dengan kelas gagal
              diam-diam: gerigi tergambar sewarna latar, jadi tak terlihat. */}
          <div
            aria-hidden="true"
            className="mx-4 mt-2 h-2.5 md:mx-6 md:mt-3"
            style={{
              backgroundImage:
                "linear-gradient(45deg,#fff 50%,transparent 50%),linear-gradient(-45deg,#fff 50%,transparent 50%)",
              backgroundSize: "12px 12px",
              backgroundRepeat: "repeat-x",
              backgroundPosition: "top",
            }}
          />
          <p className="pb-1 pt-3 text-center font-mono text-[10px] uppercase tracking-[0.22em] text-tinta-3">
            Ujung daftar
          </p>
          </>
        )}
      </KontrolDaftar>
    </div>
  );
}
