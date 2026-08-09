"use client";

import { useEffect, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabase/client";
import { lamaSejak } from "@/lib/format";
import TautkanSlot from "@/components/ui/TautkanSlot";
import { lepasSlot } from "@/app/(app)/rak/actions";

export type Slot = {
  kode: string;
  terisi: boolean;
  terisi_sejak: string | null;
  terakhir_update: string;
  pesanan: { id: string; kode: string; pelanggan: { nama: string } | null } | null;
};

export type OrderAktif = { kode: string; nama: string };

// Kolom yang dibaca ulang saat ada kabar realtime. Disimpan sebagai konstanta
// supaya bentuknya tidak pernah menyimpang dari yang dipakai di halaman —
// ketidakcocokan di antara keduanya baru terasa saat slot berubah, jauh dari
// tempat salahnya.
const KOLOM = "kode, terisi, terisi_sejak, terakhir_update, pesanan:pesanan_id(id, kode, pelanggan:pelanggan_id(nama))";

// Cucian yang menginap selewat ini ditandai. Angkanya menyusul irama pengingat
// WhatsApp yang sudah ada (H+1/H+3/H+7): H+3 adalah titik ketika sistem mulai
// menganggap cucian benar-benar terlantar, bukan sekadar belum sempat diambil.
const AMBANG_MENGENDAP_JAM = 72;

function jamSejak(ts: string | null, sekarang: number): number {
  return ts ? (sekarang - new Date(ts).getTime()) / 3_600_000 : 0;
}

export default function StatusRak({
  awal,
  sekarang: sekarangAwal,
  orderAktif,
}: {
  awal: Slot[];
  sekarang: number;
  orderAktif: OrderAktif[];
}) {
  const [slots, setSlots] = useState<Slot[]>(awal);

  // Waktu acuan datang dari server untuk render pertama, lalu berjalan sendiri
  // di browser. Membaca Date.now() langsung saat render membuat hasil di server
  // dan di browser berbeda beberapa milidetik, dan React melaporkannya sebagai
  // ketidakcocokan hidrasi.
  const [sekarang, setSekarang] = useState(sekarangAwal);

  useEffect(() => {
    const jam = setInterval(() => setSekarang(Date.now()), 60_000);
    return () => clearInterval(jam);
  }, []);

  useEffect(() => {
    const db = supabaseBrowser();
    let kanal: RealtimeChannel | null = null;
    let jam: ReturnType<typeof setInterval> | null = null;

    const ambilUlang = async () => {
      const { data } = await db.from("rak_slot").select(KOLOM).order("kode");
      if (data) setSlots(data as unknown as Slot[]);
    };

    (async () => {
      // Token sesi harus diserahkan ke Realtime SEBELUM berlangganan. Kalau
      // tidak, koneksinya dianggap anonim, RLS menutup semuanya, dan kabar
      // perubahan tidak pernah datang — tanpa error apa pun di konsol.
      const { data: sesi } = await db.auth.getSession();
      if (sesi.session) {
        db.realtime.setAuth(sesi.session.access_token);
      }

      kanal = db
        .channel("rak")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "rak_slot" },
          // Muatan realtime hanya berisi baris rak_slot mentah — nama pelanggan
          // dan kode order ada di tabel lain, jadi tidak ikut. Menambal state
          // dari muatan akan membuat slot yang baru terisi tampil tanpa
          // pemiliknya sampai halaman dimuat ulang. Satu kueri ulang per
          // perubahan jauh lebih murah daripada layar yang setengah benar.
          () => void ambilUlang()
        )
        .subscribe((status) => {
          // Realtime bisa gagal karena hal di luar kendali aplikasi: publikasi
          // belum aktif, atau websocket diblokir jaringan laundry. Kalau itu
          // terjadi, status rak diambil berkala supaya layar tetap benar —
          // lebih lambat, tapi tidak pernah menampilkan rak yang salah.
          if (status === "SUBSCRIBED") {
            if (jam) {
              clearInterval(jam);
              jam = null;
            }
          } else if (!jam) {
            jam = setInterval(ambilUlang, 4000);
          }
        });
    })();

    return () => {
      if (jam) clearInterval(jam);
      if (kanal) db.removeChannel(kanal);
    };
  }, []);

  const terisi = slots.filter((s) => s.terisi).length;

  // Kode slot berbentuk huruf-lalu-angka (A1, B12), jadi hurufnya sekaligus
  // menandai rak mana. Tidak perlu kolom terpisah di database untuk itu.
  const rak = [...new Set(slots.map((s) => s.kode[0]))].sort();

  // Yang butuh tindakan kasir, bukan sekadar dilihat: sudah terisi tapi belum
  // ketahuan punya siapa, atau sudah terlalu lama menginap.
  const perluTindakan = slots.filter(
    (s) =>
      s.terisi &&
      (!s.pesanan || jamSejak(s.terisi_sejak, sekarang) >= AMBANG_MENGENDAP_JAM)
  );

  const tertaut = slots.filter((s) => s.pesanan);

  // Order yang sudah punya tempat, dipetakan ke slotnya. Dipakai memberi tanda
  // di daftar pilihan: tanpa itu, memindahkan cucian ke slot lain terlihat
  // sama persis dengan menautkan order yang belum ditaruh di mana-mana.
  const ditempatkan: Record<string, string> = {};
  for (const s of tertaut) {
    if (s.pesanan) ditempatkan[s.pesanan.kode] = s.kode;
  }

  return (
    <>
      <section className="border-b border-garis px-4 py-4 md:px-6">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-tinta-2">
            Isi rak
          </h2>
          <span className="angka font-mono text-[11px] text-tinta-3">
            {terisi} dari {slots.length} terisi
          </span>
        </div>

        {rak.map((huruf) => {
          const isiRak = slots.filter((s) => s.kode[0] === huruf);
          const terisiRak = isiRak.filter((s) => s.terisi).length;

          return (
            <div key={huruf} className="mt-4 first:mt-3">
              {/* Judul rak selalu tampil, bukan hanya saat raknya lebih dari
                  satu. Rak yang tidak bernama membuat kasir menghitung sendiri
                  slot mana milik rak mana begitu rak kedua dipasang, dan
                  hitungan per rak itulah yang dia cari saat berdiri di depannya. */}
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <h3 className="font-mono text-[10px] uppercase tracking-[0.22em] text-tinta-3">
                  Rak {huruf}
                </h3>
                <span className="angka font-mono text-[10px] uppercase tracking-[0.14em] text-tinta-3">
                  {terisiRak}/{isiRak.length} terisi
                </span>
              </div>

              <ul className="grid grid-cols-3 gap-2">
                {isiRak.map((s) => {
                  const lama = jamSejak(s.terisi_sejak, sekarang);
                  const mengendap = s.terisi && lama >= AMBANG_MENGENDAP_JAM;
                  const tanpaOrder = s.terisi && !s.pesanan;
                  // Dua-duanya perlu tindakan, jadi dua-duanya ditandai sama:
                  // tinta tegas, bukan warna baru. Slot yang cuma "terisi dan
                  // beres" tidak perlu berteriak.
                  const perlu = mengendap || tanpaOrder;

                  return (
                    <li
                      key={s.kode}
                      className={`border border-l-[3px] px-2.5 py-2.5 transition-colors duration-300 ${
                        !s.terisi
                          ? "border-garis border-l-garis bg-kertas-terang"
                          : perlu
                            ? "border-tinta border-l-tinta bg-white"
                            : "border-aksen border-l-aksen bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span
                          aria-hidden="true"
                          className={`h-2 w-2 shrink-0 rounded-full border ${
                            !s.terisi
                              ? "border-tinta-3"
                              : perlu
                                ? "border-tinta bg-tinta"
                                : "border-aksen bg-aksen"
                          }`}
                        />
                        <span className="angka font-mono text-base font-semibold leading-none">
                          {s.kode}
                        </span>
                      </div>

                      <p
                        className={`mt-1.5 font-mono text-[10px] uppercase tracking-[0.14em] ${
                          !s.terisi
                            ? "text-tinta-3"
                            : perlu
                              ? "text-tinta"
                              : "text-aksen"
                        }`}
                      >
                        {s.terisi ? "Terisi" : "Kosong"}
                      </p>

                      {/* Kode order jauh lebih berguna daripada kata "Terisi" —
                          itu yang dicocokkan kasir dengan nota di tangannya. */}
                      <p className="angka mt-1.5 truncate font-mono text-[11px] font-semibold">
                        {s.terisi ? (s.pesanan?.kode ?? "Tanpa order") : "—"}
                      </p>
                      {s.terisi && (
                        <p className="truncate text-[11px] leading-tight text-tinta-2">
                          {s.pesanan?.pelanggan?.nama ?? "Belum ketahuan"}
                        </p>
                      )}

                      <p
                        className={`angka mt-2 border-t border-garis pt-1.5 font-mono text-[9px] uppercase tracking-[0.14em] ${
                          mengendap ? "font-semibold text-tinta" : "text-tinta-3"
                        }`}
                      >
                        {!s.terisi
                          ? "Siap dipakai"
                          : s.terisi_sejak
                            ? mengendap
                              ? `Menginap ${lamaSejak(s.terisi_sejak, sekarang)}`
                              : lamaSejak(s.terisi_sejak, sekarang)
                            : "—"}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </section>

      {perluTindakan.length > 0 && (
        <section className="border-b border-garis px-4 py-4 md:px-6">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-tinta-2">
              Perlu dibereskan
            </h2>
            <span className="angka font-mono text-[10px] uppercase tracking-[0.14em] text-tinta-3">
              {perluTindakan.length} hal
            </span>
          </div>

          <ul className="mt-3 space-y-3">
            {perluTindakan.map((s) => {
              const mengendap = jamSejak(s.terisi_sejak, sekarang) >= AMBANG_MENGENDAP_JAM;

              return (
                <li key={s.kode} className="border border-tinta bg-white p-3.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="angka font-mono text-sm font-semibold">
                      Slot {s.kode}
                    </span>
                    <span className="angka font-mono text-[10px] uppercase tracking-[0.14em] text-tinta-2">
                      {mengendap ? "Menginap" : "Belum tertaut"}
                    </span>
                  </div>

                  {s.pesanan ? (
                    <>
                      <p className="mt-1.5 text-sm leading-relaxed text-tinta-2">
                        {s.pesanan.pelanggan?.nama ?? "Order ini"}{" "}
                        <span className="angka font-mono">
                          ({s.pesanan.kode})
                        </span>{" "}
                        sudah{" "}
                        {s.terisi_sejak
                          ? lamaSejak(s.terisi_sejak, sekarang)
                          : "lama"}{" "}
                        di rak. Hubungi pelanggannya supaya raknya lekas kosong.
                      </p>

                      <form action={lepasSlot} className="mt-3">
                        <input type="hidden" name="kode" value={s.kode} />
                        <button className="border border-garis px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-tinta-2 active:bg-kertas">
                          Lepas tautan
                        </button>
                      </form>
                    </>
                  ) : (
                    <>
                      <p className="mt-1.5 text-sm leading-relaxed text-tinta-2">
                        Sensor melihat ada cucian di {s.kode}
                        {s.terisi_sejak && (
                          <> sejak {lamaSejak(s.terisi_sejak, sekarang)} lalu</>
                        )}
                        , tapi belum tertaut ke order mana pun. Pilih ordernya
                        supaya kasir berikutnya tidak menebak.
                      </p>
                      <TautkanSlot
                        kode={s.kode}
                        orderAktif={orderAktif}
                        ditempatkan={ditempatkan}
                      />
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Slot yang sudah punya pemilik keluar dari "Perlu dibereskan" — memang
          seharusnya, itu daftar masalah. Tapi tanpa daftar ini, salah pilih
          order jadi tidak bisa dibatalkan: satu-satunya tombol Lepas ada di
          daftar yang tidak lagi memuatnya. */}
      {slots.length > 0 && (
        <section className="border-b border-garis px-4 py-4 md:px-6">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-tinta-2">
              Tautan slot
            </h2>
            <span className="angka font-mono text-[10px] uppercase tracking-[0.14em] text-tinta-3">
              {tertaut.length} tautan
            </span>
          </div>

          {/* Bagiannya tetap tampil walau kosong. Judul yang hilang-timbul
              membuat kasir mengira fiturnya tidak ada, lalu mencarinya di
              tempat lain — sedangkan kalimat kosongnya justru bisa menyebutkan
              dari mana tautan itu dibuat. */}
          {!tertaut.length ? (
            <p className="mt-3 text-sm leading-relaxed text-tinta-3">
              Belum ada slot yang tertaut ke order. Tautkan dari daftar perlu
              dibereskan di atas, atau dari layar detail order.
            </p>
          ) : (
          <ul className="mt-3 divide-y divide-garis border border-garis bg-white">
            {tertaut.map((s) => (
              <li
                key={s.kode}
                className="flex items-center justify-between gap-3 px-3.5 py-3"
              >
                <div className="min-w-0">
                  <p className="angka font-mono text-sm font-semibold">
                    {s.kode}
                    <span className="mx-1.5 text-tinta-3">·</span>
                    {s.pesanan?.kode}
                  </p>
                  {s.pesanan?.pelanggan && (
                    <p className="truncate text-sm text-tinta-2">
                      {s.pesanan.pelanggan.nama}
                    </p>
                  )}
                </div>

                <form action={lepasSlot} className="shrink-0">
                  <input type="hidden" name="kode" value={s.kode} />
                  <button className="font-mono text-[11px] uppercase tracking-wider text-tinta-2 underline underline-offset-4 active:opacity-70">
                    Lepas
                  </button>
                </form>
              </li>
            ))}
          </ul>
          )}
        </section>
      )}
    </>
  );
}
