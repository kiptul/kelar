"use client";

import { useState } from "react";
import { ubahStatus } from "@/app/(app)/order/[id]/actions";
import TombolAksi from "@/components/ui/TombolAksi";

// Membatalkan order tidak bisa diurungkan, jadi minta konfirmasi dulu.
//
// Konfirmasinya digambar sendiri, bukan confirm() bawaan browser. Dialog
// sistem muncul di luar halaman dengan huruf dan tombol milik OS — di tengah
// aplikasi yang seluruhnya bermetafora nota kertas, ia terasa seperti pesan
// dari aplikasi lain. Panel di tempat juga bisa menjelaskan akibatnya dengan
// kalimat penuh, yang tidak muat di dialog satu baris.
export default function TombolBatalOrder({ id }: { id: string }) {
  const [minta, setMinta] = useState(false);

  if (!minta) {
    return (
      <button
        type="button"
        onClick={() => setMinta(true)}
        className="flex h-12 w-full items-center justify-center border border-garis font-mono text-[10px] uppercase tracking-[0.22em] text-tinta-2 active:bg-kertas"
      >
        Batalkan order
      </button>
    );
  }

  return (
    <div className="muncul border border-tinta bg-white p-3.5">
      <p className="text-sm leading-relaxed text-tinta-2">
        Order dibatalkan dan tidak bisa dikembalikan ke Masuk. Catatan
        layanannya tetap tersimpan.
      </p>

      <div className="mt-3 flex gap-2">
        <form action={ubahStatus} className="flex-1">
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="status" value="BATAL" />
          <TombolAksi saatMenunggu="Membatalkan...">Ya, batalkan</TombolAksi>
        </form>
        <button
          type="button"
          onClick={() => setMinta(false)}
          className="flex-1 border border-garis font-mono text-[10px] uppercase tracking-[0.22em] text-tinta-2 active:bg-kertas"
        >
          Urung
        </button>
      </div>
    </div>
  );
}
