# MuseVibe Rebuild — Step 1: Frontend + Alur PRD Generator (TANPA BACKEND)

Bangun dari 0. Jangan menambal kode lama: hapus struktur aplikasi lama di branch ini dan buat struktur baru yang bersih.

## Aturan keras
- FRONTEND SAJA. Dilarang: route handler API, server action, database, auth, env/API key, fetch ke layanan luar. State hanya React state + localStorage (itu masih frontend).
- Jangan sentuh folder ~/prismaticvibe. Jangan ubah main. Kerja hanya di branch ini.
- Bahasa UI: Indonesia. Anti-AI-slop: tanpa gradasi ungu-biru lebar, tanpa emoji sebagai ikon, tanpa kartu generik berderet. Rapi, kontras, tipografi jelas.
- Logo user ada di public/logo-musevibe.jpg (JPEG latar hitam, hanya dipakai di atas latar gelap, jangan di-stretch).

## Stack
Next.js App Router + TypeScript strict + Tailwind CSS + Lucide icons. Animasi ringan secukupnya (Framer Motion boleh, GSAP dilarang).

## Alur yang dibangun (state machine, ini intinya)
Satu workspace PRD generator dengan langkah berurutan, user bisa mundur ke langkah sebelumnya kapan saja:
1. **Ide** — textarea ide produk (boleh berantakan/tidak lengkap) + tombol Lanjut.
2. **Pertanyaan klarifikasi** — maksimal 5 pertanyaan yang benar-benar mengubah isi PRD (target user, fitur inti, batasan, teknologi). Setiap pertanyaan boleh dijawab atau dilewati. Ada penghitung jawaban dan tombol Lewati semua.
3. **Draft PRD** — hasil gabungan ide + jawaban, tampil sebagai dokumen yang bisa dibaca (preview) dan dilihat sumber Markdown-nya (toggle preview/markdown). Bagian yang tidak dijawab di pertanyaan DITULIS EKSPLISIT sebagai asumsi, bukan ditebak diam-diam.
4. **Review per bagian** — setiap bagian PRD bisa diedit langsung, atau di-prompt ulang per bagian saja TANPA mengulang seluruh PRD.
5. **Versi** — setiap generate/edit menyimpan versi baru; user bisa kembali ke versi sebelumnya.
6. **Final** — tombol Kunci Final. Setelah Final, PRD terkunci; edit lanjutan hanya lewat versi baru (supaya turunan PRD tidak rusak diam-diam).

Isi PRD (ringkas saja, sesuai PRD generator yang sudah disepakati): ringkasan produk, target user, fitur inti + kriteria penerimaan tiap fitur, batasan teknis, daftar halaman/API secara garis besar.

## Data demo (jujur, bukan pura-pura AI)
- Generator di step ini adalah fungsi lokal di lib/ yang merangkai draft dari ide + jawaban + satu template PRD demo. TIDAK ada panggilan AI sungguhan di step ini.
- Tampilkan penanda kecil yang jelas di UI: "Demo frontend — generasi AI belum tersambung". Jangan pernah mengklaim draft ini hasil AI.
- Satu contoh demo konsisten: proyek "DuitKu" (pencatat keuangan pribadi) sebagai contoh isi awal, tapi alur harus tetap jalan untuk ide baru yang diketik user.

## Rute
- `/` — landing singkat: headline jelas, penjelasan alur dalam 4-6 langkah, satu CTA utama "Buka Workspace".
- `/workspace` — alur PRD generator di atas.

## Kriteria selesai (wajib lolos semua sebelum berhenti)
- `npm run build` lolos, `npx tsc --noEmit` lolos, `npm run lint` 0 error.
- Semua langkah alur bisa diklik dan state berpindah dengan benar; mundur ke langkah sebelumnya tidak menghapus input.
- Edit satu bagian PRD tidak mereset bagian lain; kembali ke versi lama benar-benar mengembalikan isi versi itu.
- Tombol Final mengunci PRD; edit setelah Final hanya lewat versi baru.
- Commit hasil di branch ini dengan pesan Conventional Commits. JANGAN push dulu — Muse yang memverifikasi lalu push.
- Jika ada yang mentok, berhenti dan tulis dengan jelas apa yang mentok di akhir laporan, jangan mengarang hasil.
