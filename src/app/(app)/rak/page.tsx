import StatusRak, { type OrderAktif, type Slot } from "@/components/ui/StatusRak";
import KelolaSlot from "@/components/ui/KelolaSlot";
import SetelanWifi from "@/components/ui/SetelanWifi";
import { getProfil } from "@/lib/profil";
import { tanggalLengkap } from "@/lib/format";

export const dynamic = "force-dynamic";

// Perangkat melapor tiap 30 detik. Lewat 90 detik tanpa kabar berarti mati,
// dan itu harus dibedakan dari rak yang kebetulan kosong.
//
// Dipisah ke luar komponen bukan sekadar kerapian: `Date.now()` di dalam badan
// komponen kena aturan react-hooks/purity, yang mengira ini komponen client
// yang bisa dirender ulang kapan saja. Di sini halamannya Server Component
// force-dynamic — waktu dibaca sekali per permintaan, dan itu memang yang
// diinginkan.
function masihHidup(kontak: Date | null): boolean {
  return kontak ? Date.now() - kontak.getTime() < 90_000 : false;
}

// Alasannya sama dengan masihHidup() di atas: membaca jam di dalam badan
// komponen kena aturan react-hooks/purity. Nilainya diturunkan ke StatusRak
// sebagai titik awal hitungan "sudah berapa lama", lalu di browser jam itu
// berjalan sendiri.
function sekarangMs(): number {
  return Date.now();
}

const KOLOM_SLOT =
  "kode, terisi, terisi_sejak, terakhir_update, pesanan:pesanan_id(id, kode, pelanggan:pelanggan_id(nama))";

type PesananRingkas = { kode: string; pelanggan: { nama: string } | null };

export default async function HalamanRak() {
  const { db, laundry } = await getProfil();

  const [{ data: slot }, { data: perangkat }, { data: pesanan }] = await Promise.all([
    db.from("rak_slot").select(KOLOM_SLOT).order("kode"),
    // wifi_sandi_baru sengaja tidak ikut diambil. Nilainya tidak dibutuhkan
    // layar mana pun, dan sekali masuk ke props komponen ia ikut terkirim ke
    // browser dalam muatan RSC — sandi WiFi laundry tidak perlu pernah sampai
    // ke sana.
    db
      .from("rak_perangkat")
      .select("nama, terakhir_kontak, wifi_ssid, wifi_ssid_baru, wifi_percobaan, wifi_galat")
      .maybeSingle(),
    // Hanya order yang cuciannya mungkin ada di rak. DIAMBIL dan BATAL tidak
    // ikut — menawarkannya cuma memperpanjang daftar dengan pilihan yang
    // pasti ditolak action-nya.
    db
      .from("pesanan")
      .select("kode, pelanggan:pelanggan_id(nama)")
      .eq("laundry_id", laundry.id)
      .in("status", ["MASUK", "SIAP"])
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const kontak = perangkat?.terakhir_kontak
    ? new Date(perangkat.terakhir_kontak)
    : null;
  const hidup = masihHidup(kontak);

  const orderAktif: OrderAktif[] = ((pesanan ?? []) as unknown as PesananRingkas[]).map(
    (p) => ({ kode: p.kode, nama: p.pelanggan?.nama ?? "Tanpa nama" })
  );

  const slots = (slot ?? []) as unknown as Slot[];

  return (
    <div className="md:mx-auto md:max-w-xl">
      {/* Status perangkat naik ke atas. Kalau ia mati, seluruh isi halaman di
          bawahnya adalah kabar basi — itu harus terbaca lebih dulu, bukan
          ditemukan setelah kasir terlanjur memercayai kotak-kotak slotnya. */}
      {/* Peringatannya bertinta hitam, bukan warna baru: delapan warna di
          brief sudah cukup, dan garis tegas lebih terbaca di layar HP murah
          yang warnanya pucat daripada latar kuning muda. */}
      <section
        className={`flex items-baseline justify-between gap-3 border-b px-4 py-3 md:px-6 ${
          hidup ? "border-garis bg-aksen-muda" : "border-tinta bg-white"
        }`}
      >
        <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider">
          <span
            className={`h-2.5 w-2.5 shrink-0 rounded-full border ${
              hidup ? "border-aksen bg-aksen" : "animate-pulse border-2 border-tinta"
            }`}
            aria-hidden="true"
          />
          <span className={hidup ? "text-aksen" : "text-tinta"}>
            {hidup ? "Perangkat terhubung" : "Perangkat tidak melapor"}
          </span>
        </span>
        <span className="angka font-mono text-[10px] uppercase tracking-[0.14em] text-tinta-3">
          {kontak
            ? `Kabar terakhir ${tanggalLengkap(kontak.toISOString())}`
            : "Belum pernah melapor"}
        </span>
      </section>

      {!hidup && (
        <p className="border-b border-garis px-4 py-3 text-sm leading-relaxed text-tinta-2 md:px-6">
          Status di bawah adalah keadaan terakhir yang sempat dilaporkan, bukan
          keadaan rak sekarang. Periksa daya dan jaringan perangkatnya.
        </p>
      )}

      {!slots.length ? (
        <section className="px-4 py-8 md:px-6">
          <div className="border border-garis bg-white px-5 py-7 text-center">
            <span
              className="mx-auto mb-5 block h-px w-8 bg-aksen"
              aria-hidden="true"
            />
            <p className="text-lg font-bold tracking-tight">
              Pasang slot pertama
            </p>
            <p className="mt-2 text-sm leading-relaxed text-tinta-2">
              Rak fisik dipantau lewat sensor kecil di tiap slot. Daftarkan
              kodenya di sini — A1, A2, dan seterusnya — lalu statusnya tampil
              sendiri tanpa perlu dicatat manual.
            </p>
          </div>
          <div className="mt-4">
            <KelolaSlot slots={[]} />
          </div>
        </section>
      ) : (
        <>
          <StatusRak
            awal={slots}
            sekarang={sekarangMs()}
            orderAktif={orderAktif}
          />
          <KelolaSlot
            slots={slots.map((s) => ({ kode: s.kode, terisi: s.terisi }))}
          />
          <SetelanWifi
            hidup={hidup}
            wifi={{
              ssid: perangkat?.wifi_ssid ?? null,
              ssidBaru: perangkat?.wifi_ssid_baru ?? null,
              percobaan: perangkat?.wifi_percobaan ?? 0,
              galat: perangkat?.wifi_galat ?? null,
            }}
          />
        </>
      )}
    </div>
  );
}
