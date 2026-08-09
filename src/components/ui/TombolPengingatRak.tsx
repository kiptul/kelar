"use client";

import { useActionState } from "react";
import { kirimPengingatRak } from "@/app/(app)/rak/actions";
import TombolAksi from "@/components/ui/TombolAksi";

// Muncul hanya pada cucian yang sudah menginap di rak dan masih tertaut ke
// order yang belum diambil.
//
// Pesannya dikirim sebagai jenis PENGINGAT_RAK — terpisah dari pengingat
// terjadwal H+1/H+3/H+7 supaya keduanya tidak berebut baris notifikasi_log.
// Sekali terkirim, tombol ini menolak mengirim lagi untuk order yang sama;
// itu pagarnya, bukan kegagalan.
export default function TombolPengingatRak({ kode }: { kode: string }) {
  const [hasil, aksi] = useActionState(kirimPengingatRak, null);

  return (
    <form action={aksi} className="mt-3">
      <input type="hidden" name="kode" value={kode} />
      <TombolAksi saatMenunggu="Mengirim pengingat...">
        Kirim pengingat WhatsApp
      </TombolAksi>

      {hasil && (
        <p
          className={`mt-2 border-l-[3px] px-3 py-2.5 text-sm leading-relaxed ${
            hasil.ok
              ? "border-aksen bg-aksen-muda text-aksen"
              : "border-tinta bg-white text-tinta-2"
          }`}
        >
          {hasil.ok ? "Pengingat terkirim. " : ""}
          {hasil.alasan}
        </p>
      )}
    </form>
  );
}
