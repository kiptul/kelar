import type { JenisNotifikasi } from "@/lib/types";

// Kalimat awal tiap jenis pesan WhatsApp.
//
// Ditaruh di modul biasa, bukan di dalam berkas "use server", karena dua
// tempat memakainya: konsol superadmin saat membuat laundry baru, dan tombol
// "Pasang template bawaan" di /pengaturan/pesan untuk laundry yang terlanjur
// dibuat tanpa template. Berkas "use server" hanya boleh mengekspor fungsi
// async, jadi konstanta ini tidak bisa tinggal di sana.
//
// Kalimatnya sengaja sopan dan pendek — pemilik laundry diharapkan
// menggantinya dengan gaya bicaranya sendiri, dan kalimat yang terlalu panjang
// membuat orang enggan menyuntingnya sama sekali.
export const TEMPLATE_AWAL: { jenis: JenisNotifikasi; isi: string }[] = [
  {
    jenis: "SIAP",
    isi: "Halo {nama}, cucian Anda ({kode}) sudah selesai dan siap diambil. Terima kasih.",
  },
  {
    jenis: "REMINDER_H1",
    isi: "Halo {nama}, cucian Anda ({kode}) sudah siap sejak kemarin. Kami tunggu ya.",
  },
  {
    jenis: "REMINDER_H3",
    isi: "Halo {nama}, cucian Anda ({kode}) masih kami simpan. Silakan diambil kapan saja.",
  },
  {
    jenis: "REMINDER_H7",
    isi: "Halo {nama}, cucian Anda ({kode}) sudah seminggu siap diambil. Mohon dikonfirmasi ya.",
  },
  {
    jenis: "TERIMA_KASIH",
    isi: "Terima kasih {nama} sudah menggunakan layanan kami. Sampai jumpa lagi!",
  },
  {
    jenis: "PENGINGAT_RAK",
    isi: "Halo {nama}, cucian Anda ({kode}) sudah selesai dan masih kami simpan di rak. Silakan diambil ya.",
  },
];
