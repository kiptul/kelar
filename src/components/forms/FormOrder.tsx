"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import {
  cariPelanggan,
  simpanOrder,
  type PelangganKetemu,
} from "@/app/(app)/order/baru/actions";
import TombolAksi from "@/components/ui/TombolAksi";
import { rupiah, tanggalPendek } from "@/lib/format";
import type { Layanan } from "@/lib/types";

// "3,5" dan "3.5" sama-sama diterima; kosong dianggap 0.
function keAngka(teks: string): number {
  const n = parseFloat(teks.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

// Kebalikannya, untuk mengisi kolom setelah tombol ± ditekan. Koma, bukan
// titik: itu yang ditulis kasir dan yang tertera di timbangan.
function keTeks(n: number): string {
  return n === 0 ? "" : String(n).replace(".", ",");
}

// Timbangan bergerak per setengah kilo, barang satuan per satu.
function langkah(satuan: string): number {
  return satuan === "kg" ? 0.5 : 1;
}

const gayaInput =
  "w-full border border-garis bg-white px-3.5 py-3 text-base outline-none focus:border-aksen focus:ring-1 focus:ring-aksen";

const gayaLabel =
  "block font-mono text-[11px] uppercase tracking-[0.22em] text-tinta-3";

// Tanggal hari ini menurut WIB, untuk batas atas input tanggal.
function hariIniJakarta(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
  }).format(new Date());
}

type StatusPelanggan = "kosong" | "mencari" | "terdaftar" | "baru";

export default function FormOrder({
  layanan,
  dariBukuAwal = false,
}: {
  layanan: Layanan[];
  // Dinyalakan lewat /order/baru?buku=1, dipakai layar kosong dashboard yang
  // menawarkan "Order lama dari buku" sebagai jalan masuk tersendiri. Tanpa
  // ini tombol itu mendarat di form yang sama tanpa mencentang apa pun —
  // tombol yang menjanjikan sesuatu yang tidak ia lakukan.
  dariBukuAwal?: boolean;
}) {
  const [state, aksi] = useActionState(simpanOrder, null);

  const [noHp, setNoHp] = useState("");
  const [namaKetik, setNamaKetik] = useState("");
  const [qty, setQty] = useState<Record<string, string>>({});
  const [dariBuku, setDariBuku] = useState(dariBukuAwal);
  const hariIni = hariIniJakarta();
  const [tanggal, setTanggal] = useState(hariIni);
  // Hasil pencarian disimpan bersama nomor yang dicari, supaya status bisa
  // diturunkan dari state — bukan di-set dari dalam effect.
  const [hasil, setHasil] = useState<{
    untuk: string;
    data: PelangganKetemu | null;
  } | null>(null);

  const status: StatusPelanggan =
    noHp.replace(/\D/g, "").length < 9
      ? "kosong"
      : hasil?.untuk !== noHp
        ? "mencari"
        : hasil.data
          ? "terdaftar"
          : "baru";

  const nama = status === "terdaftar" ? (hasil?.data?.nama ?? "") : namaKetik;

  // Cari pelanggan setelah nomor berhenti diketik sebentar.
  useEffect(() => {
    if (noHp.replace(/\D/g, "").length < 9) return;

    let batal = false;
    const jeda = setTimeout(async () => {
      const ketemu = await cariPelanggan(noHp);
      if (!batal) setHasil({ untuk: noHp, data: ketemu });
    }, 500);

    return () => {
      batal = true;
      clearTimeout(jeda);
    };
  }, [noHp]);

  const dipilih = useMemo(
    () =>
      layanan
        .map((l) => ({ l, jumlah: keAngka(qty[l.id] ?? "") }))
        .filter((x) => x.jumlah > 0),
    [layanan, qty],
  );

  const total = useMemo(
    () => dipilih.reduce((n, x) => n + Math.round(x.l.harga * x.jumlah), 0),
    [dipilih],
  );

  // Langkah 2 baru muncul setelah pelanggannya jelas. Menampilkan daftar
  // layanan sejak awal membuat kasir memilih dulu lalu terhenti di nomor HP —
  // padahal nomor itulah pintu masuknya, bukan pelengkap di akhir.
  const tahap2 =
    status === "terdaftar" || (status === "baru" && namaKetik.trim().length > 0);

  const ubahJumlah = (l: Layanan, arah: number) => {
    const sekarang = keAngka(qty[l.id] ?? "");
    const berikut = Math.max(
      0,
      Math.round((sekarang + arah * langkah(l.satuan)) * 10) / 10,
    );
    setQty({ ...qty, [l.id]: keTeks(berikut) });
  };

  const gantiNomor = () => {
    setNoHp("");
    setNamaKetik("");
    setHasil(null);
  };

  return (
    <form
      action={aksi}
      className="pb-4 md:mx-auto md:grid md:max-w-3xl md:grid-cols-[1fr_17rem] md:items-start md:border md:border-garis md:bg-kertas-terang md:pb-0 md:shadow-[0_24px_50px_-40px_rgba(0,0,0,0.55)]"
    >
      <div className="min-w-0">
        {/* Mode berdampingan: pemilik boleh tetap pakai buku, order lamanya
            disalin ke sini belakangan tanpa kehilangan tanggal aslinya.
            Bidangnya berubah warna saat menyala supaya kasir yang mencatat
            mundur tidak lupa ia sedang mencatat mundur. */}
        <section
          className={`border-b border-garis px-4 py-4 transition-colors md:px-6 ${
            dariBuku ? "bg-aksen-muda" : "bg-kertas"
          }`}
        >
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              name="dari_buku"
              checked={dariBuku}
              onChange={(e) => setDariBuku(e.target.checked)}
              className="peer sr-only"
            />
            <span
              aria-hidden="true"
              className={`mt-0.5 flex h-6 w-11 shrink-0 items-center border p-0.5 transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-aksen ${
                dariBuku
                  ? "justify-end border-aksen bg-aksen"
                  : "justify-start border-tinta-3"
              }`}
            >
              <span
                className={`block h-5 w-4 transition-colors ${
                  dariBuku ? "bg-aksen-muda" : "bg-tinta-3"
                }`}
              />
            </span>
            <span className="min-w-0">
              <span className="block font-medium leading-snug">
                Order lama dari buku
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed text-tinta-2">
                {dariBuku
                  ? "Tanggal diisi manual sesuai catatan di buku."
                  : "Untuk menyalin catatan yang sudah terlanjur ditulis di buku nota."}
              </span>
            </span>
          </label>

          {dariBuku && (
            <div className="muncul mt-4">
              <label htmlFor="tanggal" className={`${gayaLabel} mb-1.5`}>
                Tanggal masuk sesuai buku
              </label>
              <div className="flex gap-2">
                {/* Tetap input tanggal bawaan, bukan ketikan bebas: di HP ia
                    memunculkan pemilih tanggal dan `max` menahan tanggal masa
                    depan, dua hal yang hilang kalau formatnya diketik sendiri. */}
                <input
                  id="tanggal"
                  name="tanggal"
                  type="date"
                  required
                  max={hariIni}
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  className={`${gayaInput} angka font-mono border-aksen`}
                />
                <button
                  type="button"
                  onClick={() => setTanggal(hariIni)}
                  className="shrink-0 border border-garis px-3 font-mono text-[10px] uppercase tracking-[0.14em] text-tinta-2 active:bg-kertas"
                >
                  Hari ini
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="px-4 py-5 md:px-6">
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <label htmlFor="no_hp" className={gayaLabel}>
              Langkah 1 · Nomor HP
            </label>
            <span
              className={`font-mono text-[10px] uppercase tracking-[0.22em] ${
                status === "terdaftar" ? "text-aksen" : "text-tinta-3"
              }`}
            >
              {status === "mencari"
                ? "Mencari"
                : status === "terdaftar"
                  ? "Ketemu"
                  : status === "baru"
                    ? "Pelanggan baru"
                    : "Wajib"}
            </span>
          </div>

          <input
            id="no_hp"
            name="no_hp"
            type="tel"
            inputMode="tel"
            autoComplete="off"
            required
            placeholder="08xx xxxx xxxx"
            value={noHp}
            onChange={(e) => setNoHp(e.target.value)}
            className={`angka w-full border bg-white px-3.5 py-3.5 font-mono text-lg tracking-[0.08em] outline-none focus:ring-1 focus:ring-aksen ${
              status === "terdaftar"
                ? "border-aksen"
                : "border-garis focus:border-aksen"
            }`}
          />

          {status === "kosong" && (
            <p className="mt-2.5 text-sm leading-relaxed text-tinta-2">
              Ketik nomor HP pelanggan. Kalau pernah ke sini, datanya terpanggil
              sendiri.
            </p>
          )}

          {status === "mencari" && (
            <p className="muncul mt-2.5 border border-garis bg-white px-3.5 py-2.5 text-sm text-tinta-2">
              Mencari di buku pelanggan…
            </p>
          )}

          {status === "terdaftar" && hasil?.data && (
            <div className="muncul mt-2.5 border border-aksen bg-aksen-muda px-3.5 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-aksen">
                  Pelanggan lama
                </span>
                <button
                  type="button"
                  onClick={gantiNomor}
                  className="font-mono text-[10px] uppercase tracking-[0.14em] text-aksen underline underline-offset-4"
                >
                  Ganti
                </button>
              </div>
              <p className="mt-1.5 text-lg font-semibold leading-tight">
                {nama}
              </p>
              <p className="angka mt-1 font-mono text-[11px] text-tinta-2">
                {hasil.data.jumlahOrder} order
                {hasil.data.terakhirTanggal && (
                  <> · terakhir {tanggalPendek(hasil.data.terakhirTanggal)}</>
                )}
                {hasil.data.terakhirTotal !== null && (
                  <> · {rupiah(hasil.data.terakhirTotal)}</>
                )}
              </p>
              <input type="hidden" name="nama" value={nama} />
            </div>
          )}

          {status === "baru" && (
            <div className="muncul mt-4">
              <div className="mb-1.5 flex items-baseline justify-between gap-3">
                <label htmlFor="nama" className={gayaLabel}>
                  Nama pelanggan baru
                </label>
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-tinta-3">
                  Belum terdaftar
                </span>
              </div>
              <input
                id="nama"
                name="nama"
                required
                autoComplete="off"
                placeholder="mis. Siti Marlina"
                value={namaKetik}
                onChange={(e) => setNamaKetik(e.target.value)}
                className={gayaInput}
              />
            </div>
          )}
        </section>

        {tahap2 && (
          <section className="muncul border-t border-garis px-4 py-5 md:px-6">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 className={gayaLabel}>Langkah 2 · Layanan</h2>
              <span
                className={`font-mono text-[10px] uppercase tracking-[0.22em] ${
                  dipilih.length ? "text-aksen" : "text-tinta-3"
                }`}
              >
                {dipilih.length
                  ? `${dipilih.length} layanan`
                  : "Belum dipilih"}
              </span>
            </div>

            <ul className="flex flex-col gap-2">
              {layanan.map((l) => {
                const jumlah = keAngka(qty[l.id] ?? "");
                const aktif = jumlah > 0;
                return (
                  <li
                    key={l.id}
                    className={`border border-l-[3px] px-3 py-2.5 transition-colors ${
                      aktif
                        ? "border-aksen border-l-aksen bg-white"
                        : "border-garis border-l-garis"
                    }`}
                  >
                    <div className="flex items-baseline gap-2">
                      <span className="shrink-0 font-semibold leading-snug">
                        {l.nama}
                      </span>
                      <span className="penghubung" aria-hidden="true" />
                      <span className="angka shrink-0 font-mono text-xs text-tinta-2">
                        {rupiah(l.harga)}/{l.satuan}
                      </span>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between gap-3">
                      <span
                        className={`angka min-w-0 truncate font-mono ${
                          aktif
                            ? "text-[13px] font-medium text-tinta"
                            : "text-[10px] uppercase tracking-[0.14em] text-tinta-3"
                        }`}
                      >
                        {aktif
                          ? `${keTeks(jumlah)} ${l.satuan} = ${rupiah(Math.round(l.harga * jumlah))}`
                          : "Belum dipilih"}
                      </span>

                      <div
                        className={`flex shrink-0 items-center border ${
                          aktif ? "border-aksen" : "border-garis"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => ubahJumlah(l, -1)}
                          aria-label={`Kurangi ${l.nama}`}
                          className="h-11 w-10 font-mono text-lg leading-none text-tinta-2 disabled:text-garis"
                          disabled={!aktif}
                        >
                          −
                        </button>
                        {/* Kolom ketik dipertahankan di tengah tombol ±.
                            Timbangan menghasilkan angka seperti 3,7 kg yang
                            tidak bisa dicapai dengan langkah setengah kilo —
                            tombolnya untuk yang cepat, ketikannya untuk yang
                            tepat. */}
                        <input
                          inputMode="decimal"
                          autoComplete="off"
                          placeholder="0"
                          aria-label={`Jumlah ${l.nama}`}
                          value={qty[l.id] ?? ""}
                          onChange={(e) =>
                            setQty({ ...qty, [l.id]: e.target.value })
                          }
                          className="angka h-11 w-14 border-x border-garis bg-white text-center font-mono text-base outline-none focus:bg-aksen-muda"
                        />
                        <button
                          type="button"
                          onClick={() => ubahJumlah(l, 1)}
                          aria-label={`Tambah ${l.nama}`}
                          className="h-11 w-10 font-mono text-lg leading-none text-aksen"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* nilai yang benar-benar dikirim, sudah dinormalkan */}
                    <input
                      type="hidden"
                      name={`qty-${l.id}`}
                      value={jumlah}
                    />
                  </li>
                );
              })}
            </ul>

            {!dipilih.length && (
              <p className="mt-3 text-sm leading-relaxed text-tinta-2">
                Tekan + pada layanan yang dipakai, atau ketik jumlahnya langsung
                kalau pakai koma.
              </p>
            )}

            <div className="mt-5">
              <label htmlFor="catatan" className={`${gayaLabel} mb-1.5`}>
                Catatan · opsional
              </label>
              <input
                id="catatan"
                name="catatan"
                autoComplete="off"
                placeholder="mis. jangan pakai pewangi"
                className={gayaInput}
              />
            </div>
          </section>
        )}
      </div>

      {/* Nota tersusun sendiri sambil kasir memilih. Di layar lebar ia menempel
          di kanan supaya terlihat terus; di HP ia jatuh ke bawah daftar. */}
      <aside className="border-t border-garis px-4 py-5 md:sticky md:top-4 md:self-start md:border-l md:border-t-0 md:px-5">
        <p className={gayaLabel}>Nota</p>

        {dipilih.length ? (
          <div className="muncul mt-3">
            <div className="border border-garis bg-white px-4 pt-4">
              <div className="mb-3 flex items-baseline justify-between gap-3 border-b border-dashed border-garis pb-3">
                <span className="font-semibold">
                  {nama || "Pelanggan baru"}
                </span>
                <span className="angka font-mono text-[11px] text-tinta-3">
                  {dariBuku ? tanggalPendek(`${tanggal}T12:00:00+07:00`) : "Hari ini"}
                </span>
              </div>

              <ul>
                {dipilih.map(({ l, jumlah }) => (
                  <li key={l.id} className="mb-2.5">
                    <div className="flex items-baseline gap-2">
                      <span className="shrink-0 text-sm">{l.nama}</span>
                      <span className="penghubung" aria-hidden="true" />
                      <span className="angka shrink-0 font-mono text-[13px]">
                        {rupiah(Math.round(l.harga * jumlah))}
                      </span>
                    </div>
                    <p className="angka mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-tinta-3">
                      {keTeks(jumlah)} {l.satuan} × {rupiah(l.harga)}
                    </p>
                  </li>
                ))}
              </ul>

              <div className="mt-1 flex items-baseline justify-between border-t-2 border-tinta py-3.5">
                <span className="font-mono text-[11px] uppercase tracking-[0.22em]">
                  Total
                </span>
                <span className="angka font-mono text-2xl font-semibold">
                  {rupiah(total)}
                </span>
              </div>
            </div>
            <div className="tepi-sobek" aria-hidden="true" />
          </div>
        ) : (
          <div className="mt-3 border border-dashed border-tinta-3 px-5 py-7 text-center">
            <span
              className="mx-auto mb-4 block h-px w-7 bg-tinta-3"
              aria-hidden="true"
            />
            <p className="text-sm leading-relaxed text-tinta-3">
              Nota tersusun sendiri begitu layanan dipilih.
            </p>
          </div>
        )}

        {state?.error && (
          <div className="mt-4 border border-red-800/40 bg-red-50 px-3.5 py-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-red-900">
              Order belum tersimpan
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-red-950">
              {state.error}
            </p>
          </div>
        )}

        <div className="mt-5">
          <TombolAksi saatMenunggu="Menyimpan order..." nonaktif={!tahap2 || total === 0}>
            Simpan order
          </TombolAksi>
          <p className="mt-2.5 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-tinta-3">
            {!tahap2
              ? "Isi nomor HP dulu"
              : total === 0
                ? "Pilih minimal satu layanan"
                : "Pesan WhatsApp terkirim otomatis"}
          </p>
        </div>
      </aside>
    </form>
  );
}
