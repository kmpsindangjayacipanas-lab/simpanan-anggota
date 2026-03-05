'use client';

import { useState, useEffect, useRef, Fragment } from 'react';
import { cn, formatRupiah } from '@/lib/utils';
import * as XLSX from 'xlsx';
import { 
  LayoutDashboard, 
  Wallet, 
  History, 
  PlusCircle, 
  ArrowUpRight,
  TrendingUp,
  CreditCard,
  PiggyBank,
  Users,
  Download,
  Upload,
  FileSpreadsheet,
  Printer,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { collection, addDoc, onSnapshot, query, orderBy, writeBatch, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const dynamic = 'force-dynamic';

// --- Types ---

type TransactionType = 'POKOK' | 'WAJIB' | 'SUKARELA';

interface Member {
  id: string;
  memberNo: string;
  fullName: string;
  joinDate: string; // ISO string
}

interface Transaction {
  id: string;
  date: string; // ISO string
  type: TransactionType;
  amount: number;
  periodMonth: number;
  periodYear: number;
  note?: string;
  memberId?: string;
  memberName?: string;
}

interface SavingsData {
  pokok: number;
  wajib: number;
  sukarela: number;
  transactions: Transaction[];
  members: Member[];
}

const INITIAL_DATA: SavingsData = {
  pokok: 0,
  wajib: 0,
  sukarela: 0,
  transactions: [],
  members: [],
};

// --- Components ---

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("bg-white rounded-xl shadow-sm border border-gray-100 p-6", className)}>
      {children}
    </div>
  );
}

function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  trend,
  colorClass 
}: { 
  title: string; 
  value: number; 
  icon: any; 
  trend?: string;
  colorClass: string;
}) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <h3 className="text-2xl font-bold mt-2 text-gray-900">{formatRupiah(value)}</h3>
          {trend && (
            <p className="text-xs text-green-600 mt-1 flex items-center">
              <TrendingUp className="w-3 h-3 mr-1" />
              {trend}
            </p>
          )}
        </div>
        <div className={cn("p-3 rounded-lg", colorClass)}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </Card>
  );
}

// --- Main Page ---

export default function Home() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'deposit' | 'history' | 'members' | 'rekap'>('dashboard');
  const [data, setData] = useState<SavingsData>(INITIAL_DATA);
  const [isLoaded, setIsLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Subscribe to Firebase Data
  useEffect(() => {
    console.log("Initializing Firebase Subscription...");
    console.log("API Key present:", !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY);
    
    // Subscribe to Members
    const membersQuery = query(collection(db, 'members'), orderBy('memberNo', 'asc'));
    const unsubscribeMembers = onSnapshot(membersQuery, (snapshot) => {
      const members = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Member[];
      
      setData(prev => ({ ...prev, members }));
    });

    // Subscribe to Transactions
    const transactionsQuery = query(collection(db, 'transactions'), orderBy('date', 'desc'));
    const unsubscribeTransactions = onSnapshot(transactionsQuery, (snapshot) => {
      const transactions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Transaction[];

      // Calculate totals
      const totals = transactions.reduce((acc, curr) => {
        const type = curr.type.toLowerCase() as keyof Pick<SavingsData, 'pokok' | 'wajib' | 'sukarela'>;
        acc[type] = (acc[type] || 0) + curr.amount;
        return acc;
      }, { pokok: 0, wajib: 0, sukarela: 0 });

      setData(prev => ({
        ...prev,
        transactions,
        pokok: totals.pokok,
        wajib: totals.wajib,
        sukarela: totals.sukarela
      }));
      
      setIsLoaded(true);
    });

    return () => {
      unsubscribeMembers();
      unsubscribeTransactions();
    };
  }, []);

  const handleDeposit = async (type: TransactionType, amount: number, periodMonth: number, periodYear: number, note: string, memberId: string, memberName: string) => {
    try {
      await addDoc(collection(db, 'transactions'), {
        date: new Date().toISOString(),
        type,
        amount,
        periodMonth,
        periodYear,
        note,
        memberId,
        memberName
      });
      setActiveTab('dashboard');
      alert('Simpanan berhasil disimpan!');
    } catch (error) {
      console.error("Error adding document: ", error);
      alert('Gagal menyimpan transaksi.');
    }
  };

  const handleMultiDeposit = async (transactionsData: any[]) => {
    try {
      const batch = writeBatch(db);
      transactionsData.forEach(data => {
         const docRef = doc(collection(db, 'transactions'));
         batch.set(docRef, {
            ...data,
            date: new Date().toISOString()
         });
      });
      await batch.commit();
      setActiveTab('dashboard');
      alert(`Berhasil menyimpan ${transactionsData.length} transaksi!`);
    } catch (error) {
      console.error("Error batch writing documents: ", error);
      alert('Gagal menyimpan transaksi massal.');
    }
  };

  const handleExportMembers = () => {
    const ws = XLSX.utils.json_to_sheet(data.members.map(m => ({
      'No. Anggota': m.memberNo,
      'Nama Lengkap': m.fullName,
      'Tanggal Bergabung': new Date(m.joinDate).toLocaleDateString('id-ID')
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Anggota");
    XLSX.writeFile(wb, "data-anggota-koperasi.xlsx");
  };

  const handleImportMembers = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const jsonData = XLSX.utils.sheet_to_json(ws) as any[];

        console.log("Importing data:", jsonData); // Debug log

        const batch = writeBatch(db);
        let count = 0;

        jsonData.forEach((row: any) => {
          if (row['Nama Lengkap'] || row['Nama']) {
            const docRef = doc(collection(db, 'members')); // Generate new ID
            
            // Handle join date parsing
            let joinDate = new Date().toISOString();
            if (row['Tanggal Bergabung']) {
               // Try to parse Excel date (if it's a number)
               if (typeof row['Tanggal Bergabung'] === 'number') {
                 const date = new Date((row['Tanggal Bergabung'] - (25567 + 2)) * 86400 * 1000);
                 joinDate = date.toISOString();
               } else {
                 // Try to parse string date
                 const parsedDate = new Date(row['Tanggal Bergabung']);
                 if (!isNaN(parsedDate.getTime())) {
                   joinDate = parsedDate.toISOString();
                 }
               }
            }

            const memberData = {
              memberNo: row['No. Anggota'] || row['No'] || `M-${Math.floor(Math.random() * 10000)}`,
              fullName: row['Nama Lengkap'] || row['Nama'],
              joinDate: joinDate
            };
            
            console.log("Adding member:", memberData); // Debug log
            batch.set(docRef, memberData);
            count++;
          }
        });

        await batch.commit();
        console.log("Batch commit successful");
        
        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
        alert(`Berhasil mengimpor ${count} anggota.`);
      } catch (error) {
        console.error("Error importing members: ", error);
        alert('Gagal mengimpor anggota. Cek Console untuk detail error.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleDownloadTemplate = () => {
    // Define headers
    const headers = ['No. Anggota', 'Nama Lengkap', 'Tanggal Bergabung'];
    
    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet([
      headers,
      ['KOP-001', 'John Doe', '2024-01-01'],
      ['KOP-002', 'Jane Smith', '2024-02-15']
    ]);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 15 }, // No. Anggota
      { wch: 30 }, // Nama Lengkap
      { wch: 20 }  // Tanggal Bergabung
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "template-anggota-baru.xlsx");
  };

  const handlePrintReceipt = (transaction: Transaction) => {
    const printWindow = window.open('', '', 'width=600,height=600');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Kuitansi Pembayaran</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
              .title { font-size: 24px; font-weight: bold; }
              .subtitle { font-size: 14px; color: #555; }
              .content { margin-bottom: 30px; }
              .row { display: flex; justify-content: space-between; margin-bottom: 10px; }
              .label { font-weight: bold; }
              .footer { text-align: right; margin-top: 50px; }
              .amount { font-size: 18px; font-weight: bold; border-top: 1px solid #ccc; padding-top: 10px; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="title">KOPERASI SIMPAN PINJAM</div>
              <div class="subtitle">Bukti Pembayaran Simpanan</div>
            </div>
            <div class="content">
              <div class="row">
                <span class="label">No. Transaksi:</span>
                <span>${transaction.id.slice(0, 8).toUpperCase()}</span>
              </div>
              <div class="row">
                <span class="label">Tanggal:</span>
                <span>${new Date(transaction.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </div>
               <div class="row">
                <span class="label">Anggota:</span>
                <span>${transaction.memberName || '-'}</span>
              </div>
              <div class="row">
                <span class="label">Jenis Simpanan:</span>
                <span>${transaction.type}</span>
              </div>
              <div class="row">
                <span class="label">Periode:</span>
                <span>${transaction.periodMonth && transaction.periodYear ? new Date(transaction.periodYear, transaction.periodMonth - 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }) : '-'}</span>
              </div>
              <div class="row">
                <span class="label">Keterangan:</span>
                <span>${transaction.note || '-'}</span>
              </div>
              <div class="row amount">
                <span class="label">Jumlah:</span>
                <span>${formatRupiah(transaction.amount)}</span>
              </div>
            </div>
            <div class="footer">
              <p>Petugas,</p>
              <br><br>
              <p>(_________________)</p>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }
  };

  if (!isLoaded) return <div className="flex h-screen items-center justify-center">Loading...</div>;

  const totalBalance = data.pokok + data.wajib + data.sukarela;

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      {/* DEBUG BANNER - DELETE LATER */}
      <div className="bg-red-600 text-white text-center py-2 px-4 font-bold">
        DEBUG MODE: Menggunakan Database 'simpanan' - Pastikan Environment Variable ada di Vercel!
      </div>
      
      {/* Sidebar / Navigation */}
      <div className="flex h-screen overflow-hidden">
        <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Wallet className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-800">Koperasi App</span>
            </div>
          </div>
          
          <nav className="flex-1 p-4 space-y-2">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={cn(
                "flex items-center w-full px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                activeTab === 'dashboard' 
                  ? "bg-blue-50 text-blue-700" 
                  : "text-gray-600 hover:bg-gray-50"
              )}
            >
              <LayoutDashboard className="w-5 h-5 mr-3" />
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('members')}
              className={cn(
                "flex items-center w-full px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                activeTab === 'members' 
                  ? "bg-blue-50 text-blue-700" 
                  : "text-gray-600 hover:bg-gray-50"
              )}
            >
              <Users className="w-5 h-5 mr-3" />
              Anggota Koperasi
            </button>
            <button
              onClick={() => setActiveTab('deposit')}
              className={cn(
                "flex items-center w-full px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                activeTab === 'deposit' 
                  ? "bg-blue-50 text-blue-700" 
                  : "text-gray-600 hover:bg-gray-50"
              )}
            >
              <PlusCircle className="w-5 h-5 mr-3" />
              Setor Simpanan
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={cn(
                "flex items-center w-full px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                activeTab === 'history' 
                  ? "bg-blue-50 text-blue-700" 
                  : "text-gray-600 hover:bg-gray-50"
              )}
            >
              <History className="w-5 h-5 mr-3" />
              Riwayat Transaksi
            </button>
             <button
              onClick={() => setActiveTab('rekap')}
              className={cn(
                "flex items-center w-full px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                activeTab === 'rekap' 
                  ? "bg-blue-50 text-blue-700" 
                  : "text-gray-600 hover:bg-gray-50"
              )}
            >
              <FileSpreadsheet className="w-5 h-5 mr-3" />
              Rekap Pembayaran
            </button>
          </nav>

          <div className="p-4 border-t border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold">
                A
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Anggota Koperasi</p>
                <p className="text-xs text-gray-500">ID: KOP-2024-001</p>
                <p className="text-[10px] text-gray-400 mt-1">v1.2.0 (Multi-Payment)</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          {/* Mobile Header */}
          <div className="md:hidden bg-white p-4 border-b flex justify-between items-center sticky top-0 z-10">
            <span className="font-bold text-lg">Koperasi App</span>
            <button onClick={() => setActiveTab('deposit')} className="bg-blue-600 text-white p-2 rounded-lg">
              <PlusCircle className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 md:p-8 max-w-7xl mx-auto">
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h1 className="text-2xl font-bold text-gray-900">Ringkasan Simpanan</h1>
                  <button 
                    onClick={() => setActiveTab('deposit')}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center transition-colors"
                  >
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Tambah Simpanan
                  </button>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatCard 
                    title="Total Simpanan" 
                    value={totalBalance} 
                    icon={Wallet} 
                    colorClass="bg-blue-500"
                    trend="+12% bulan ini"
                  />
                  <StatCard 
                    title="Simpanan Pokok" 
                    value={data.pokok} 
                    icon={CreditCard} 
                    colorClass="bg-purple-500"
                  />
                  <StatCard 
                    title="Simpanan Wajib" 
                    value={data.wajib} 
                    icon={ArrowUpRight} 
                    colorClass="bg-indigo-500"
                  />
                  <StatCard 
                    title="Simpanan Sukarela" 
                    value={data.sukarela} 
                    icon={PiggyBank} 
                    colorClass="bg-green-500"
                  />
                </div>

                {/* Recent Transactions Preview */}
                <div className="mt-8">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold text-gray-900">Transaksi Terakhir</h2>
                    <button 
                      onClick={() => setActiveTab('history')}
                      className="text-blue-600 text-sm font-medium hover:underline"
                    >
                      Lihat Semua
                    </button>
                  </div>
                  <Card className="overflow-hidden p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-50 text-gray-900 font-medium border-b border-gray-100">
                          <tr>
                            <th className="px-6 py-4">Tanggal</th>
                            <th className="px-6 py-4">Anggota</th>
                            <th className="px-6 py-4">Jenis</th>
                            <th className="px-6 py-4">Periode</th>
                            <th className="px-6 py-4 text-right">Jumlah</th>
                            <th className="px-6 py-4 text-center">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {data.transactions.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                Belum ada transaksi
                              </td>
                            </tr>
                          ) : (
                            data.transactions.slice(0, 5).map((t) => (
                              <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4">
                                  {new Date(t.date).toLocaleDateString('id-ID', {
                                    day: 'numeric', month: 'long', year: 'numeric'
                                  })}
                                </td>
                                <td className="px-6 py-4 font-medium">{t.memberName || '-'}</td>
                                <td className="px-6 py-4">
                                  <span className={cn(
                                    "px-2.5 py-1 rounded-full text-xs font-medium",
                                    t.type === 'POKOK' && "bg-purple-100 text-purple-700",
                                    t.type === 'WAJIB' && "bg-indigo-100 text-indigo-700",
                                    t.type === 'SUKARELA' && "bg-green-100 text-green-700",
                                  )}>
                                    {t.type}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-gray-600">
                                  {t.periodMonth && t.periodYear 
                                    ? new Date(t.periodYear, t.periodMonth - 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
                                    : '-'}
                                </td>
                                <td className="px-6 py-4 text-right font-medium text-gray-900">
                                  + {formatRupiah(t.amount)}
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <button
                                    onClick={() => handlePrintReceipt(t)}
                                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                                    title="Cetak Kuitansi"
                                  >
                                    <Printer className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>
              </div>
            )}

            {activeTab === 'deposit' && (
              <div className="max-w-2xl mx-auto space-y-6">
                <div className="flex items-center mb-6">
                  <button 
                    onClick={() => setActiveTab('dashboard')}
                    className="mr-4 p-2 hover:bg-gray-100 rounded-full md:hidden"
                  >
                    ←
                  </button>
                  <h1 className="text-2xl font-bold text-gray-900">Setor Simpanan Baru</h1>
                </div>
                
                <DepositForm onDeposit={handleDeposit} onMultiDeposit={handleMultiDeposit} members={data.members} transactions={data.transactions} />
              </div>
            )}

            {activeTab === 'history' && (
              <div className="space-y-6">
                 <div className="flex items-center mb-6">
                  <button 
                    onClick={() => setActiveTab('dashboard')}
                    className="mr-4 p-2 hover:bg-gray-100 rounded-full md:hidden"
                  >
                    ←
                  </button>
                  <h1 className="text-2xl font-bold text-gray-900">Riwayat Transaksi</h1>
                </div>

                <Card className="overflow-hidden p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-50 text-gray-900 font-medium border-b border-gray-100">
                          <tr>
                            <th className="px-6 py-4">Tanggal</th>
                            <th className="px-6 py-4">Anggota</th>
                            <th className="px-6 py-4">Jenis</th>
                            <th className="px-6 py-4">Periode</th>
                            <th className="px-6 py-4">Keterangan</th>
                            <th className="px-6 py-4 text-right">Jumlah</th>
                            <th className="px-6 py-4 text-center">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {data.transactions.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                                Belum ada transaksi
                              </td>
                            </tr>
                          ) : (
                            data.transactions.map((t) => (
                              <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4">
                                  {new Date(t.date).toLocaleDateString('id-ID', {
                                    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                  })}
                                </td>
                                <td className="px-6 py-4 font-medium">{t.memberName || '-'}</td>
                                <td className="px-6 py-4">
                                  <span className={cn(
                                    "px-2.5 py-1 rounded-full text-xs font-medium",
                                    t.type === 'POKOK' && "bg-purple-100 text-purple-700",
                                    t.type === 'WAJIB' && "bg-indigo-100 text-indigo-700",
                                    t.type === 'SUKARELA' && "bg-green-100 text-green-700",
                                  )}>
                                    {t.type}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-gray-600">
                                  {t.periodMonth && t.periodYear 
                                    ? new Date(t.periodYear, t.periodMonth - 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
                                    : '-'}
                                </td>
                                <td className="px-6 py-4">{t.note || '-'}</td>
                                <td className="px-6 py-4 text-right font-medium text-gray-900">
                                  + {formatRupiah(t.amount)}
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <button
                                    onClick={() => handlePrintReceipt(t)}
                                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                                    title="Cetak Kuitansi"
                                  >
                                    <Printer className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </Card>
              </div>
            )}

             {activeTab === 'rekap' && (
              <div className="space-y-6">
                 <div className="flex items-center mb-6">
                  <button 
                    onClick={() => setActiveTab('dashboard')}
                    className="mr-4 p-2 hover:bg-gray-100 rounded-full md:hidden"
                  >
                    ←
                  </button>
                  <h1 className="text-2xl font-bold text-gray-900">Rekap Pembayaran Anggota</h1>
                </div>
                
                <RekapView members={data.members} transactions={data.transactions} />
              </div>
            )}

            {activeTab === 'members' && (
              <div className="space-y-6">
                 <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                   <div className="flex items-center">
                    <button 
                      onClick={() => setActiveTab('dashboard')}
                      className="mr-4 p-2 hover:bg-gray-100 rounded-full md:hidden"
                    >
                      ←
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900">Data Anggota Koperasi</h1>
                  </div>
                  <div className="flex gap-2 w-full md:w-auto">
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 md:flex-none flex items-center justify-center bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Import Excel
                    </button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleImportMembers} 
                      accept=".xlsx, .xls" 
                      className="hidden" 
                    />
                    <button 
                      onClick={handleDownloadTemplate}
                      className="flex-1 md:flex-none flex items-center justify-center bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      <FileSpreadsheet className="w-4 h-4 mr-2" />
                      Template
                    </button>
                    <button 
                      onClick={handleExportMembers}
                      className="flex-1 md:flex-none flex items-center justify-center bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export Excel
                    </button>
                  </div>
                </div>

                <Card className="overflow-hidden p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-50 text-gray-900 font-medium border-b border-gray-100">
                          <tr>
                            <th className="px-6 py-4">No. Anggota</th>
                            <th className="px-6 py-4">Nama Lengkap</th>
                            <th className="px-6 py-4">Tanggal Bergabung</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {data.members.length === 0 ? (
                            <tr>
                              <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                                Belum ada data anggota. Silakan import data dari Excel.
                              </td>
                            </tr>
                          ) : (
                            data.members.map((m) => (
                              <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 font-medium text-gray-900">{m.memberNo}</td>
                                <td className="px-6 py-4">{m.fullName}</td>
                                <td className="px-6 py-4">
                                  {new Date(m.joinDate).toLocaleDateString('id-ID', {
                                    day: 'numeric', month: 'long', year: 'numeric'
                                  })}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                  
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm text-blue-800 flex items-start">
                    <FileSpreadsheet className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold mb-1">Format Import Excel:</p>
                      <p>Pastikan file Excel memiliki header kolom: <strong>No. Anggota</strong>, <strong>Nama Lengkap</strong>, dan <strong>Tanggal Bergabung</strong> (Opsional).</p>
                      <p className="mt-1 text-blue-600 text-xs">Format Tanggal: YYYY-MM-DD (Contoh: 2024-01-31).</p>
                    </div>
                  </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function DepositForm({ onDeposit, onMultiDeposit, members, transactions }: { onDeposit: (type: TransactionType, amount: number, periodMonth: number, periodYear: number, note: string, memberId: string, memberName: string) => void, onMultiDeposit: (transactions: any[]) => void, members: Member[], transactions: Transaction[] }) {
  const [type, setType] = useState<TransactionType>('SUKARELA');
  const [amount, setAmount] = useState<string>('');
  const [note, setNote] = useState('');
  const [periodMonth, setPeriodMonth] = useState(new Date().getMonth() + 1);
  const [periodYear, setPeriodYear] = useState(new Date().getFullYear());
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [hasPaidPokok, setHasPaidPokok] = useState(false);
  const [paidMonths, setPaidMonths] = useState<number[]>([]);
  const [isMultiMonth, setIsMultiMonth] = useState(false);
  const [duration, setDuration] = useState(1);

  // Check payment status when member or year changes
  useEffect(() => {
    if (!selectedMemberId) {
      setHasPaidPokok(false);
      setPaidMonths([]);
      return;
    }

    const member = members.find(m => m.id === selectedMemberId);
    if (!member) return;

    // Check Pokok
    const isPokokPaid = transactions.some(t => t.memberId === selectedMemberId && t.type === 'POKOK');
    setHasPaidPokok(isPokokPaid);
    
    // If Pokok is paid and currently selected, switch to Wajib
    if (isPokokPaid && type === 'POKOK') {
      setType('WAJIB');
    }

    // Check Wajib for selected year
    const paidWajibMonths = transactions
      .filter(t => t.memberId === selectedMemberId && t.type === 'WAJIB' && t.periodYear === periodYear)
      .map(t => t.periodMonth);
    setPaidMonths(paidWajibMonths);

  }, [selectedMemberId, transactions, periodYear, type]);

  // Auto-select next unpaid month for WAJIB (Run only when member changes or type changes to WAJIB)
  useEffect(() => {
    if (type !== 'WAJIB' || !selectedMemberId) return;
    
    const member = members.find(m => m.id === selectedMemberId);
    if (!member) return;

    const joinDate = new Date(member.joinDate);
    
    let checkMonth = joinDate.getMonth() + 1;
    let checkYear = joinDate.getFullYear();
    
    // Safety loop limit (e.g. 10 years ahead)
    let loopLimit = 0;
    const maxLoops = 120; 

    while (loopLimit < maxLoops) {
            const isPaid = transactions.some(t => 
            t.memberId === selectedMemberId && 
            t.type === 'WAJIB' && 
            t.periodMonth === checkMonth && 
            t.periodYear === checkYear
        );

        if (!isPaid) {
            setPeriodMonth(checkMonth);
            setPeriodYear(checkYear);
            break;
        }

        // Move to next month
        checkMonth++;
        if (checkMonth > 12) {
            checkMonth = 1;
            checkYear++;
        }
        loopLimit++;
    }
  }, [selectedMemberId, type, transactions]); // transactions dependency is needed to re-calc if data changes

  // Set default amounts
  useEffect(() => {
    if (type === 'POKOK') {
      setAmount('50000');
      setDuration(1);
      setIsMultiMonth(false);
      
      // Auto-set period to Join Date for POKOK
      if (selectedMemberId) {
         const member = members.find(m => m.id === selectedMemberId);
         if (member) {
            const joinDate = new Date(member.joinDate);
            setPeriodMonth(joinDate.getMonth() + 1);
            setPeriodYear(joinDate.getFullYear());
         }
      }
    } else if (type === 'WAJIB') {
      setAmount((10000 * duration).toString());
    } else {
      setAmount('');
      setDuration(1);
      setIsMultiMonth(false);
    }
  }, [type, duration, selectedMemberId, members]);

  // Helper to check if a specific month/year is valid (not before join date)
  const isDateBeforeJoin = (m: number, y: number) => {
     if (!selectedMemberId) return false;
     const member = members.find(m => m.id === selectedMemberId);
     if (!member) return false;
     
     const joinDate = new Date(member.joinDate);
     const targetDate = new Date(y, m - 1, 1);
     const memberJoinDate = new Date(joinDate.getFullYear(), joinDate.getMonth(), 1);
     
     return targetDate < memberJoinDate;
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;
    
    // Validate member
    if (!selectedMemberId) {
      alert("Silakan pilih anggota terlebih dahulu.");
      return;
    }

    const member = members.find(m => m.id === selectedMemberId);
    if (!member) return;

    // --- Check Join Date (Tidak boleh bayar sebelum bergabung) ---
    const joinDate = new Date(member.joinDate);
    // Use year and month for comparison (set date to 1 to avoid day mismatch)
    const memberJoinDate = new Date(joinDate.getFullYear(), joinDate.getMonth(), 1);
    
    // Calculate transactions list
    const newTransactions = [];
    let currentMonth = periodMonth;
    let currentYear = periodYear;
    
    const loopDuration = isMultiMonth ? duration : 1;

    for (let i = 0; i < loopDuration; i++) {
        // Handle year rollover
        if (currentMonth > 12) {
            currentMonth = 1;
            currentYear++;
        }

        // Validate Join Date for each month
        const targetDate = new Date(currentYear, currentMonth - 1, 1);
        if (targetDate < memberJoinDate) {
             alert(`Gagal: Periode ${new Date(currentYear, currentMonth - 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })} sebelum tanggal bergabung.`);
             return;
        }

        // Validate if already paid (Wajib Only)
        if (type === 'WAJIB') {
            const isPaid = transactions.some(t => 
                t.memberId === member.id && 
                t.type === 'WAJIB' && 
                t.periodMonth === currentMonth && 
                t.periodYear === currentYear
            );
            if (isPaid) {
                 const mName = new Date(currentYear, currentMonth - 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
                 alert(`Gagal: Periode ${mName} SUDAH LUNAS.`);
                 return;
            }
        }
        
        // Validate Pokok
        if (type === 'POKOK') {
           const hasPaidPokok = transactions.some(t => 
              t.memberId === member.id && 
              t.type === 'POKOK'
            );
            if (hasPaidPokok) {
              alert(`Anggota ${member.fullName} SUDAH LUNAS Simpanan Pokok.`);
              return;
            }
        }

        newTransactions.push({
             type,
             amount: type === 'WAJIB' ? 10000 : parseInt(amount),
             periodMonth: currentMonth,
             periodYear: currentYear,
             note: note + (loopDuration > 1 ? ` (Bulan ke-${i+1} dari ${loopDuration})` : ''),
             memberId: member.id,
             memberName: member.fullName
        });

        currentMonth++;
    }

    if (newTransactions.length === 1) {
        const t = newTransactions[0];
        onDeposit(t.type, t.amount, t.periodMonth, t.periodYear, note, t.memberId!, t.memberName!);
    } else {
        // Confirm total
        const totalAmount = newTransactions.reduce((sum, t) => sum + t.amount, 0);
        if (confirm(`Konfirmasi pembayaran untuk ${loopDuration} bulan?\nTotal: ${formatRupiah(totalAmount)}`)) {
            onMultiDeposit(newTransactions);
        } else {
            return;
        }
    }
    
    setNote('');
    if (type === 'SUKARELA') setAmount('');
    setDuration(1);
    setIsMultiMonth(false);
  };

  const isFixed = type === 'POKOK' || type === 'WAJIB';
  const isWajib = type === 'WAJIB';
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Pilih Anggota</label>
          <select
            value={selectedMemberId}
            onChange={(e) => setSelectedMemberId(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
            required
          >
            <option value="">-- Pilih Anggota --</option>
            {members.map(m => (
              <option key={m.id} value={m.id}>{m.memberNo} - {m.fullName}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Jenis Simpanan</label>
          <div className="grid grid-cols-3 gap-3">
            {(['POKOK', 'WAJIB', 'SUKARELA'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                disabled={t === 'POKOK' && hasPaidPokok}
                className={cn(
                  "py-2 px-4 rounded-lg text-sm font-medium border transition-all",
                  type === t 
                    ? "border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-100" 
                    : "border-gray-200 text-gray-600 hover:border-gray-300",
                  t === 'POKOK' && hasPaidPokok && "opacity-50 cursor-not-allowed bg-gray-100 text-gray-400 border-gray-200 hover:border-gray-200"
                )}
              >
                Simpanan {t.charAt(0) + t.slice(1).toLowerCase()}
                {t === 'POKOK' && hasPaidPokok && " (Lunas)"}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Periode Pembayaran</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Bulan Mulai</label>
              <select
                value={periodMonth}
                onChange={(e) => setPeriodMonth(parseInt(e.target.value))}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
              >
                {months.map((m, i) => {
                  const isPaid = paidMonths.includes(i + 1);
                  const isBeforeJoin = isDateBeforeJoin(i + 1, periodYear);
                  const isDisabled = (isPaid && type === 'WAJIB') || isBeforeJoin;
                  
                  return (
                    <option key={i} value={i + 1} disabled={isDisabled}>
                      {m} {isPaid && type === 'WAJIB' ? '(Lunas)' : ''} {isBeforeJoin ? '(Belum Bergabung)' : ''}
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Tahun</label>
              <select
                value={periodYear}
                onChange={(e) => setPeriodYear(parseInt(e.target.value))}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
             {/* Duration Input - Only for WAJIB */}
             {isWajib && (
                <div className="md:col-span-3">
                  <div className="flex items-center mb-3">
                    <input
                      id="multi-month"
                      type="checkbox"
                      checked={isMultiMonth}
                      onChange={(e) => setIsMultiMonth(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="multi-month" className="ml-2 text-sm font-medium text-gray-700">
                      Bayar Lebih dari 1 Bulan
                    </label>
                  </div>
                  
                  {isMultiMonth && (
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 animate-in fade-in slide-in-from-top-2 duration-200">
                      <label className="text-xs text-gray-500 mb-1 block">Lama (Bulan)</label>
                      <input
                        type="number"
                        min="2"
                        max="24"
                        value={duration}
                        onChange={(e) => setDuration(parseInt(e.target.value) || 2)}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white mb-2"
                      />
                      <div className="text-sm text-blue-600">
                        Membayar untuk: <strong>{duration} bulan</strong><br/>
                        Dari: {months[periodMonth-1]} {periodYear}<br/>
                        Sampai: {(() => {
                            let m = periodMonth + duration - 1;
                            let y = periodYear;
                            while (m > 12) { m -= 12; y++; }
                            return `${months[m-1]} ${y}`;
                        })()}
                      </div>
                    </div>
                  )}
                </div>
             )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Jumlah Setoran (Rp)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">Rp</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => !isFixed && setAmount(e.target.value)}
              readOnly={isFixed}
              placeholder="Masukkan jumlah..."
              className={cn(
                "w-full pl-10 pr-4 py-3 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all",
                isFixed ? "bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200" : "bg-white border-gray-300 text-gray-900"
              )}
            />
          </div>
          {isFixed && (
            <p className="text-xs text-gray-500 mt-1">
              * Jumlah simpanan {type.toLowerCase()} sudah ditetapkan sebesar {formatRupiah(type === 'POKOK' ? 50000 : 10000)}
              {isMultiMonth && duration > 1 && ` x ${duration} bulan = ${formatRupiah(10000 * duration)}`}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Catatan (Opsional)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Contoh: Setoran bulan Maret 2024"
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all min-h-[100px]"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors shadow-sm hover:shadow-md"
        >
          Konfirmasi Setoran
        </button>
      </form>
    </Card>
  );
}

function RekapView({ members, transactions }: { members: Member[], transactions: Transaction[] }) {
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [expandedMembers, setExpandedMembers] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  const toggleExpand = (id: string) => {
    setExpandedMembers(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleExportRekap = () => {
    const data = members.map(m => {
      // Check if paid Wajib for this period
      const hasPaidWajib = transactions.some(t => 
        t.memberId === m.id && 
        t.type === 'WAJIB' && 
        t.periodMonth === filterMonth && 
        t.periodYear === filterYear
      );
      
      // Check if ever paid Pokok
      const hasPaidPokok = transactions.some(t => 
        t.memberId === m.id && 
        t.type === 'POKOK'
      );

      // Calculate Total Saldo
      const memberTransactions = transactions.filter(t => t.memberId === m.id);
      const totalSaldo = memberTransactions.reduce((sum, t) => sum + t.amount, 0);

      // Get Paid Months for selected year
      const paidMonthsIndices = transactions
        .filter(t => t.memberId === m.id && t.type === 'WAJIB' && t.periodYear === filterYear)
        .map(t => t.periodMonth)
        .sort((a, b) => a - b);
      
      const paidMonthsList = paidMonthsIndices.map(idx => months[idx - 1]).join(', ');

      return {
        'No. Anggota': m.memberNo,
        'Nama Lengkap': m.fullName,
        'Status Wajib (Bulan Ini)': hasPaidWajib ? 'Lunas' : 'Belum Bayar',
        'Status Pokok': hasPaidPokok ? 'Lunas' : 'Belum Lunas',
        'Total Saldo': totalSaldo,
        [`Bulan Terbayar (${filterYear})`]: paidMonthsList || '-'
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rekap Pembayaran");
    XLSX.writeFile(wb, `Rekap_Pembayaran_${months[filterMonth-1]}_${filterYear}.xlsx`);
  };

  const handleImportRekap = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Implementasi import rekap (jika diperlukan logic khusus, saat ini hanya placeholder)
    alert("Fitur import rekap belum tersedia. Gunakan menu 'Setor Simpanan' untuk menambah data.");
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <Card>
      <div className="mb-6 flex flex-col md:flex-row justify-between items-end gap-4">
        <div className="flex gap-4 items-end">
          <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">Bulan (Filter Status)</label>
             <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(parseInt(e.target.value))}
                className="px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {months.map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
              </select>
          </div>
          <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">Tahun</label>
             <select
                value={filterYear}
                onChange={(e) => setFilterYear(parseInt(e.target.value))}
                className="px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
          </div>
        </div>
        
        <div className="flex gap-2">
           <button 
              onClick={handleExportRekap}
              className="flex items-center justify-center bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              Export Rekap
            </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-50 text-gray-900 font-medium border-b border-gray-100">
            <tr>
              <th className="w-10 px-6 py-4"></th>
              <th className="px-6 py-4">No. Anggota</th>
              <th className="px-6 py-4">Nama Lengkap</th>
              <th className="px-6 py-4 text-center">Status Wajib ({months[filterMonth - 1]})</th>
              <th className="px-6 py-4 text-center">Status Pokok</th>
              <th className="px-6 py-4 text-right">Total Saldo</th>
              <th className="px-6 py-4">Bulan Terbayar ({filterYear})</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {members.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  Belum ada data anggota.
                </td>
              </tr>
            ) : (
              members.map((m) => {
                const isExpanded = expandedMembers[m.id];
                
                // Check if paid Wajib for this period
                const hasPaidWajib = transactions.some(t => 
                  t.memberId === m.id && 
                  t.type === 'WAJIB' && 
                  t.periodMonth === filterMonth && 
                  t.periodYear === filterYear
                );
                
                // Check if ever paid Pokok
                const hasPaidPokok = transactions.some(t => 
                  t.memberId === m.id && 
                  t.type === 'POKOK'
                );

                // Calculate Total Saldo
                const memberTransactions = transactions.filter(t => t.memberId === m.id);
                const totalSaldo = memberTransactions.reduce((sum, t) => sum + t.amount, 0);

                // Get Paid Months for selected year (Wajib Only) for summary column
                const paidMonthsIndices = transactions
                  .filter(t => t.memberId === m.id && t.type === 'WAJIB' && t.periodYear === filterYear)
                  .map(t => t.periodMonth)
                  .sort((a, b) => a - b);
                
                const paidMonthsList = paidMonthsIndices.map(idx => months[idx - 1]).join(', ');

                // Calculate Full Payment History for Expanded View
                const historyByYear: Record<number, number[]> = {};
                if (isExpanded) {
                   transactions
                     .filter(t => t.memberId === m.id && t.type === 'WAJIB')
                     .forEach(t => {
                        if (!historyByYear[t.periodYear]) historyByYear[t.periodYear] = [];
                        if (!historyByYear[t.periodYear].includes(t.periodMonth)) {
                            historyByYear[t.periodYear].push(t.periodMonth);
                        }
                     });
                }

                return (
                  <Fragment key={m.id}>
                    <tr 
                      className={cn("hover:bg-gray-50 transition-colors cursor-pointer", isExpanded && "bg-blue-50/50")}
                      onClick={() => toggleExpand(m.id)}
                    >
                      <td className="px-6 py-4 text-center">
                        {isExpanded ? <ChevronDown className="w-4 h-4 text-blue-600" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900">{m.memberNo}</td>
                      <td className="px-6 py-4">{m.fullName}</td>
                      <td className="px-6 py-4 text-center">
                        {hasPaidWajib ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Lunas
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Belum Bayar
                          </span>
                        )}
                      </td>
                       <td className="px-6 py-4 text-center">
                        {hasPaidPokok ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Lunas
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Belum Lunas
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-gray-900">
                        {formatRupiah(totalSaldo)}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500 max-w-[200px] truncate" title={paidMonthsList}>
                        {paidMonthsList || '-'}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-gray-50 animate-in fade-in slide-in-from-top-1 duration-200">
                        <td colSpan={7} className="px-6 py-4 border-b border-gray-100">
                           <div className="pl-10">
                              <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center">
                                <History className="w-4 h-4 mr-2" />
                                Riwayat Pelunasan Simpanan Wajib
                              </h4>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {Object.keys(historyByYear).length > 0 ? (
                                    Object.keys(historyByYear)
                                      .sort((a, b) => Number(b) - Number(a))
                                      .map((yearStr) => {
                                        const year = Number(yearStr);
                                        const paidMonths = historyByYear[year].sort((a, b) => a - b);
                                        
                                        return (
                                          <div key={year} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                                            <div className="text-xs font-bold text-blue-600 mb-2 border-b pb-1 border-gray-100">
                                              Tahun {year}
                                            </div>
                                            <div className="flex flex-wrap gap-1.5">
                                              {paidMonths.map(monthIdx => (
                                                <span 
                                                  key={monthIdx} 
                                                  className="inline-flex items-center px-2 py-1 rounded text-[10px] font-medium bg-green-50 text-green-700 border border-green-100"
                                                >
                                                  {months[monthIdx - 1]}
                                                </span>
                                              ))}
                                            </div>
                                          </div>
                                        );
                                      })
                                ) : (
                                   <div className="col-span-3 text-sm text-gray-500 italic py-2">
                                      Belum ada riwayat pembayaran simpanan wajib.
                                   </div>
                                )}
                              </div>
                           </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}