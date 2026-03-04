'use client';

import { useState, useEffect } from 'react';
import { cn, formatRupiah } from '@/lib/utils';
import { 
  LayoutDashboard, 
  Wallet, 
  History, 
  PlusCircle, 
  ArrowUpRight,
  TrendingUp,
  CreditCard,
  PiggyBank
} from 'lucide-react';

// --- Types ---

type TransactionType = 'POKOK' | 'WAJIB' | 'SUKARELA';

interface Transaction {
  id: string;
  date: string; // ISO string
  type: TransactionType;
  amount: number;
  note?: string;
}

interface SavingsData {
  pokok: number;
  wajib: number;
  sukarela: number;
  transactions: Transaction[];
}

const INITIAL_DATA: SavingsData = {
  pokok: 0,
  wajib: 0,
  sukarela: 0,
  transactions: [],
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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'deposit' | 'history'>('dashboard');
  const [data, setData] = useState<SavingsData>(INITIAL_DATA);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load data from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('koperasi-data');
    if (saved) {
      try {
        setData(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse data", e);
      }
    }
    setIsLoaded(true);
  }, []);

  // Save data to localStorage
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('koperasi-data', JSON.stringify(data));
    }
  }, [data, isLoaded]);

  const handleDeposit = (type: TransactionType, amount: number, note: string) => {
    const newTransaction: Transaction = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      type,
      amount,
      note,
    };

    setData(prev => ({
      ...prev,
      [type.toLowerCase()]: prev[type.toLowerCase() as keyof Omit<SavingsData, 'transactions'>] + amount,
      transactions: [newTransaction, ...prev.transactions],
    }));

    setActiveTab('dashboard');
  };

  if (!isLoaded) return null; // or a loading spinner

  const totalBalance = data.pokok + data.wajib + data.sukarela;

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
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
          </nav>

          <div className="p-4 border-t border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold">
                A
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Anggota Koperasi</p>
                <p className="text-xs text-gray-500">ID: KOP-2024-001</p>
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
                            <th className="px-6 py-4">Jenis</th>
                            <th className="px-6 py-4">Keterangan</th>
                            <th className="px-6 py-4 text-right">Jumlah</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {data.transactions.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
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
                                <td className="px-6 py-4">{t.note || '-'}</td>
                                <td className="px-6 py-4 text-right font-medium text-gray-900">
                                  + {formatRupiah(t.amount)}
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
                
                <DepositForm onDeposit={handleDeposit} />
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
                            <th className="px-6 py-4">Jenis</th>
                            <th className="px-6 py-4">Keterangan</th>
                            <th className="px-6 py-4 text-right">Jumlah</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {data.transactions.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
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
                                <td className="px-6 py-4">{t.note || '-'}</td>
                                <td className="px-6 py-4 text-right font-medium text-gray-900">
                                  + {formatRupiah(t.amount)}
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
          </div>
        </main>
      </div>
    </div>
  );
}

function DepositForm({ onDeposit }: { onDeposit: (type: TransactionType, amount: number, note: string) => void }) {
  const [type, setType] = useState<TransactionType>('SUKARELA');
  const [amount, setAmount] = useState<string>('');
  const [note, setNote] = useState('');

  // Set default amounts
  useEffect(() => {
    if (type === 'POKOK') setAmount('50000');
    else if (type === 'WAJIB') setAmount('10000');
    else setAmount('');
  }, [type]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;
    
    onDeposit(type, parseInt(amount), note);
    // Reset handled by parent changing view usually, but if not:
    setNote('');
    if (type === 'SUKARELA') setAmount('');
  };

  const isFixed = type === 'POKOK' || type === 'WAJIB';

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Jenis Simpanan</label>
          <div className="grid grid-cols-3 gap-3">
            {(['POKOK', 'WAJIB', 'SUKARELA'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={cn(
                  "py-2 px-4 rounded-lg text-sm font-medium border transition-all",
                  type === t 
                    ? "border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-100" 
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                )}
              >
                Simpanan {t.charAt(0) + t.slice(1).toLowerCase()}
              </button>
            ))}
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
