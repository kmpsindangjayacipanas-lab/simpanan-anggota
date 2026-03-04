# Aplikasi Simpanan Koperasi

Aplikasi manajemen simpanan anggota koperasi yang modern dan profesional. Dibangun menggunakan Next.js, TypeScript, dan Tailwind CSS.

## Fitur

- **Dashboard**: Ringkasan total simpanan dan grafik tren (mock).
- **Jenis Simpanan**:
  - **Simpanan Pokok**: Fixed Rp 50.000
  - **Simpanan Wajib**: Fixed Rp 10.000
  - **Simpanan Sukarela**: Nominal bebas
- **Riwayat Transaksi**: Pencatatan setiap setoran.
- **Penyimpanan Lokal**: Data tersimpan di browser (localStorage) sehingga tidak hilang saat di-refresh.

## Cara Menjalankan (Local)

1.  Pastikan Node.js sudah terinstall.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Jalankan server development:
    ```bash
    npm run dev
    ```
4.  Buka [http://localhost:3000](http://localhost:3000) di browser.

## Cara Upload ke GitHub

1.  Buat repository baru di GitHub (kosong).
2.  Jalankan perintah berikut di terminal proyek ini:

    ```bash
    git init
    git add .
    git commit -m "Initial commit: Aplikasi Simpanan Koperasi"
    git branch -M main
    git remote add origin https://github.com/USERNAME/NAMA-REPO-ANDA.git
    git push -u origin main
    ```

    *(Ganti `USERNAME` dan `NAMA-REPO-ANDA` dengan detail repository GitHub Anda)*

## Cara Deploy ke Vercel

1.  Buka [Vercel](https://vercel.com) dan login/daftar.
2.  Klik **"Add New..."** -> **"Project"**.
3.  Pilih repository GitHub yang baru saja Anda upload.
4.  Klik **"Import"**.
5.  Biarkan setting default (Next.js preset).
6.  Klik **"Deploy"**.

Dalam beberapa menit, aplikasi Anda akan online!
