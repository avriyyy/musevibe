---
name: musevibe-generation-quality
description: Menjaga hasil generasi AI MuseVibe tetap faktual, sesuai format yang diminta, konsisten dengan konteks proyek, dan memiliki diagram Mermaid yang valid. Gunakan saat membuat atau mengubah prompt, generator, validator, fallback, atau dokumen PRD/TRD/AFD/DBD/BSD/IPD, tugas, saran halaman, dan prototipe.
---

# Kualitas Generasi MuseVibe

Gunakan aturan ini setiap kali membuat atau memperbaiki perilaku generasi AI di repo MuseVibe. Baca `AGENTS.md` dan telusuri prompt serta validator yang sudah ada sebelum mengubahnya. Pertahankan perubahan lokal pengguna dan konfigurasi model yang sudah dipilih.

## Sumber fakta dan ketidakpastian

- Perlakukan ide, jawaban setup, brief/dokumen yang disetujui, dan sumber yang diberikan sebagai dasar fakta. Jangan mengarang riset pengguna, angka pasar, metrik, harga, perilaku kompetitor, tanggal, integrasi, atau keputusan produk.
- Pisahkan fakta, rekomendasi, dan hal yang belum diputuskan. Bila perlu membuat keputusan untuk melengkapi artefak, tandai secara eksplisit `Assumption:` atau `Hypothesis:`; jangan menyajikannya sebagai kebutuhan yang telah dikonfirmasi.
- Jaga konsistensi dengan brief dan batasan terbaru. Jika fakta penting tidak tersedia, nyatakan keterbatasan atau pertanyaan terbuka.

## Format dan validasi

- Ikuti format, bahasa, skema, judul bagian, urutan, panjang, dan cakupan yang diminta. Jangan menambah pengantar atau bagian ekstra jika output harus berupa JSON, Markdown, HTML, atau format ketat lainnya.
- Validasi hasil secara deterministik sebelum menyimpannya: struktur wajib, urutan bagian, field JSON, batas jumlah, placeholder, dan ketentuan produk. Jangan mengandalkan instruksi prompt saja.
- Untuk semua dokumen, validasi struktur, konten wajib, placeholder, serta diagram Mermaid yang diminta sebelum menyimpan. Jika jawaban AI tetap tidak valid setelah satu perbaikan, atau provider gagal, jangan membuat fallback lokal: biarkan dokumen kosong/belum selesai dan tampilkan error yang bisa dicoba ulang.
- Diagram Mermaid harus memakai deklarasi tipe pada baris pertama, ID sederhana, label yang di-quote bila perlu, pagar kode tertutup, dan operator kardinalitas ER yang didukung. Hindari HTML, directive, dan styling yang tidak diminta.
- Jangan pernah mengklaim bahwa model menjawab, tes lulus, atau fakta telah diverifikasi jika sumber atau hasil alat tidak mendukungnya.

## Dokumen yang belum tersedia

Dokumen PRD/TRD/AFD/DBD/BSD/IPD hanya dianggap selesai jika keluaran AI lolos validator deterministik. Saat provider gagal atau hasil tetap tidak valid setelah satu perbaikan, jangan menyimpan atau menampilkan outline lokal; pertahankan dokumen valid atau edit pengguna yang sudah ada, dan biarkan dokumen baru tetap kosong dengan error retryable.

## Implementasi dan regresi

- Gunakan kontrak runtime bersama di `src/lib/generation-quality.ts`; selaraskan aturan prompt khusus di `src/lib/plan.ts`, `src/lib/prd-contract.ts`, dan `src/lib/docs.ts` tanpa membuat aturan yang saling bertentangan.
- Tempatkan normalisasi/validasi Mermaid di `src/lib/mermaid-quality.ts`, lalu gunakan hasil yang sama untuk pemeriksaan generasi dan render `src/components/Mermaid.tsx`.
- Tambahkan tes untuk klaim/format, diagram valid dan tidak valid, label fallback, serta kontrak model. Jalankan tes, pemeriksaan TypeScript/lint, dan build yang tersedia; laporkan kegagalan yang berasal dari perubahan sebelumnya secara terpisah.
