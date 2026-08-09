// Nomor WhatsApp pengelola Kelar — bukan nomor laundry.
//
// Dipakai di dua tempat yang keduanya buntu tanpanya: tombol "Tanya lewat
// WhatsApp" di halaman depan, dan kalimat "hubungi admin" di pengaturan.
// Keduanya memeriksa isinya dulu dan tidak menampilkan apa pun selama kosong,
// karena elemen yang tidak berfungsi lebih buruk daripada elemen yang tidak
// ada — tautan wa.me ke nomor kosong membuka halaman galat WhatsApp, dan
// "hubungi admin" tanpa nomor cuma saran yang tidak bisa diikuti.
//
// Format 62..., tanpa tanda baca. Tampilannya diurus hpCantik().
export const NOMOR_ADMIN = "";
