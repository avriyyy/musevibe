# DESIGN.md — MuseVibe

Patokan visual MuseVibe. Agent yang membangun UI **wajib** membaca dokumen ini sebelum menulis komponen apa pun. Dokumen ini menang atas selera template generik.

> Aturan anti-AI-slop berlaku penuh (lihat Bagian 4).

## 1. Logo yang dipakai

- File: `public/logo-musevibe.jpg` — huruf M gradasi biru-ungu-pink + wordmark "MuseVibe", background HITAM pekat (JPEG, bukan transparan).
- Pakai apa adanya: jangan diubah warnanya, jangan dipotong, jangan diregangkan, jangan diberi background terang, jangan ditumpuk teks di atasnya.
- Pakai hanya di: navigasi (kecil, object-contain, tile hitam menyatu), hero (satu lockup besar di atas background gelap), footer (kecil, satu kali).
- Jangan dipakai sebagai background section, jangan diulang di setiap section, jangan di atas background terang.

## 2. Token desain (kontrak)

### Warna — tema gelap (utama)
| Token | Nilai | Pakai untuk |
|---|---|---|
| `--bg` | `#05060A` | Background halaman |
| `--surface` | `#0E1017` | Kartu, panel |
| `--surface-2` | `#14141D` | Hover / permukaan ketiga |
| `--border` | `rgba(255,255,255,0.08)` | Border kartu, tabel, input |
| `--border-strong` | `rgba(255,255,255,0.14)` | Border fokus / kartu aktif |
| `--text` | `#F4F4F5` | Teks utama |
| `--muted` | `#A1A1AA` | Teks sekunder, deskripsi |
| `--muted-2` | `#71717A` | Tersier, footnote, placeholder |

### Aksen — dari logo, hemat saja
| Token | Nilai |
|---|---|
| `--blue` | `#1E6BFF` |
| `--violet` | `#7C3AED` |
| `--pink` | `#F472B6` |
| `--gradient-logo` | `linear-gradient(135deg, #1E6BFF, #7C3AED, #F472B6)` |

Aturan gradient: HANYA untuk garis tipis 1-2px, 1-2 kata kunci di headline hero, hover CTA, dan dekorasi opacity rendah. TIDAK untuk background section penuh, background kartu besar, atau tombol utama penuh.

### Tipografi
- Font: Geist/system sans untuk UI, Geist Mono HANYA untuk kode. Tanpa font display dekoratif.
- Headline hero: 48-64px desktop (32-40px mobile), Bold, line-height 1.05, tracking -0.02em, maksimal 2 baris.
- Judul section: 28-32px, Semibold, tracking -0.01em.
- Body: 16-17px, line-height 1.6, muted untuk deskripsi.
- Label kecil/eyebrow: 12-13px, uppercase, letter-spacing 0.08em, muted.
- Teks sekunder minimal 14px. Tidak ada teks abu-abu paling muda berukuran kecil.

### Bentuk dan jarak
- Radius: kartu 12px, tombol 10px, input 10px, pill 999px. Jangan radius 24px+ untuk semua kartu.
- Bayangan minimal: kartu pakai border, bukan shadow tebal. Shadow hanya dropdown/modal.
- Jarak section: 96-128px desktop (64px mobile).
- Lebar konten: maksimal 1120px landing, 1280px aplikasi.

## 3. Struktur halaman — tab per langkah (bukan diagram langkah)

Landing dan workspace TIDAK menampilkan 5 langkah sebagai diagram/grafik yang sama berulang-ulang. Setiap langkah adalah SATU TAB dengan halamannya sendiri, dan isi tiap tab harus sesuai dengan artefak langkah itu:

| Tab | Judul | Isi halaman tab (wajib sesuai artefak) |
|---|---|---|
| 1 | Prompt | Input prompt pengguna + 5 pertanyaan klarifikasi + jawaban, dalam bentuk percakapan/form yang rapi, bukan kartu slogan. |
| 2 | Spesifikasi (PRD) | Dokumen PRD lengkap dengan **markdown preview**: judul, ringkasan, fitur, batasan, kriteria penerimaan, diagram (erDiagram/flowchart) sebagai gambar/teks yang bisa dibaca. Bukan ringkasan 3 baris. |
| 3 | Rencana Kerja | Daftar tugas terurut P0→P1→P2, masing-masing dengan kriteria penerimaan, dependensi, dan status todo/doing/done/blocked. Bukan sekadar daftar nama tugas. |
| 4 | Desain | Design system: token warna, tipografi, dan preview per halaman (kartu komponen + contoh halaman), dengan tombol adjust/approve yang jelas. |
| 5 | Kode | Scaffold kode: file tree + preview kode per file (syntax-highlighted, bisa dibaca), plus status build/typecheck. |

Aturan tab:
- Satu tab aktif dalam satu waktu, transisi halus, URL/state tab jelas (deep-link per tab bila memungkinkan).
- Tab bar: maksimal 5 tab, label pendek dan konsisten di seluruh situs ("Prompt, Spesifikasi, Rencana Kerja, Desain, Kode" — jangan "Tugas" di satu tempat dan "Rencana Kerja" di tempat lain).
- Setiap tab punya satu aksi utama yang jelas, bukan 5 tombol sekaligus.
- Di mobile, tab bar bisa di-scroll horizontal atau jadi daftar vertikal, tanpa overflow dan tanpa teks terpotong.

## 4. Anti-AI-slop

Dilarang:
- Background gradient penuh (ungu-biru) di hero, kartu, atau tombol.
- Copy generik tanpa isi yang bisa dicek: "revolusioner", "seamless", "empower", "cutting-edge", "unlock the power", "supercharge", "solusi inovatif terdepan".
- Emoji sebagai ikon utama, sparkle di setiap heading, ilustrasi 3D stok, foto stok, testimoni/statistik/logo pelanggan palsu.
- Heading yang semua katanya gradient dan tebal. Maksimal 1-2 kata kunci gradient di hero.
- Kartu fitur yang hanya bilang "AI canggih, mudah, aman, cepat" tanpa contoh konkret.

Wajib:
- Copy spesifik dan bisa dicek dari alur nyata: tulis prompt, jawab 5 pertanyaan, dapat PRD Markdown, pecah jadi tugas, lihat desain, dapat scaffold kode.
- Contoh nyata di halaman: satu contoh proyek end-to-end yang sama di semua tab (prompt yang sama → PRD yang sama → tugas yang sama → desain yang sama → kode yang sama), bukan contoh acak per tab.
- Bahasa utama Bahasa Indonesia; istilah produk (PRD, MCP, CLI, Template) boleh dalam bahasa Inggris sebagai nama fitur.
- Satu halaman, satu pesan utama: MuseVibe adalah workflow prompt → PRD → tugas → desain → kode.

## 5. Animasi — SATU library saja + Three.js wireframe

- Animasi UI (transisi tab, fade/slide masuk, hover, layout): **Framer Motion saja**.
- **GSAP DILARANG dipakai** di proyek ini: jangan import gsap di komponen mana pun, dan hapus dari dependensi bila tidak dipakai.
- Three.js (React Three Fiber + drei): dipakai untuk SATU komponen 3D wireframe di hero — graph Prompt → Spesifikasi → Rencana Kerja → Desain → Kode dalam gaya wireframe, rotasi lambat, parallax mouse halus, tanpa OrbitControls yang mengacaukan scroll, dan di-disable/diperkecil di mobile agar tidak berat.
- Jangan pakai animasi berat lain, jangan animasi setiap elemen sekaligus, jangan animasi yang memperlambat halaman atau menutupi teks.

## 6. Checklist sebelum design dianggap selesai

- [ ] Logo hanya di nav, hero, footer, di atas gelap, tidak diregangkan.
- [ ] Tidak ada background gradient penuh di section mana pun.
- [ ] Gradient hanya garis tipis / 1-2 kata headline / hover CTA.
- [ ] Setiap tab menampilkan artefak yang sesuai (PRD = markdown preview, tugas = daftar + acceptance criteria, desain = token + preview halaman, kode = file tree + preview kode).
- [ ] Nama tab konsisten di semua tempat.
- [ ] Hanya Framer Motion untuk animasi UI; tidak ada import GSAP.
- [ ] Komponen Three.js wireframe ada di hero, halus, tidak mengganggu scroll, ringan di mobile.
- [ ] Kontras teks cukup, teks sekunder minimal 14px.
- [ ] Mobile: tab tidak overflow, teks tidak terpotong, dekorasi 3D diperkecil/disembunyikan bila berat.
