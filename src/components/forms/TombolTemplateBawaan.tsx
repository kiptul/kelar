"use client";

import { useActionState } from "react";
import TombolAksi from "@/components/ui/TombolAksi";
import {
  pasangTemplateBawaan,
  type Hasil,
} from "@/app/(app)/pengaturan/actions";

// Jalan keluar untuk laundry yang terlanjur dibuat tanpa template.
//
// Sebelumnya layar kosongnya cuma menyuruh menghubungi admin — buntu untuk
// keadaan yang sebenarnya bisa dibereskan sendiri, dan selama buntu itu tidak
// ada satu pun pesan yang bisa terkirim ke pelanggan.
export default function TombolTemplateBawaan() {
  // Aksinya tidak butuh argumen apa pun. Dibungkus di sini, bukan diberi
  // parameter boneka di sisi server — parameter yang ada hanya untuk memuaskan
  // bentuk useActionState akan tampak seperti sesuatu yang lupa dipakai.
  const [hasil, aksi] = useActionState<Hasil, FormData>(
    async () => pasangTemplateBawaan(),
    null,
  );

  return (
    <form action={aksi} className="mt-5">
      <TombolAksi saatMenunggu="Memasang...">Pasang template bawaan</TombolAksi>

      {hasil?.error && (
        <p className="mt-3 border-l-[3px] border-red-800 bg-red-50 px-3 py-2.5 text-left text-sm text-red-900">
          {hasil.error}
        </p>
      )}
      {hasil?.pesan && (
        <p className="mt-3 border-l-[3px] border-aksen bg-aksen-muda px-3 py-2.5 text-left text-sm text-aksen">
          {hasil.pesan}
        </p>
      )}
    </form>
  );
}
