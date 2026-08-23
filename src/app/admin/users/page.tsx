import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { ShieldAlert, Trash2, Mail, PlusCircle, ShieldCheck, Search, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Sidebar } from "@/components/admin/Sidebar";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function AdminUsersPage({ searchParams }: Props) {
  const params = await searchParams;
  const q = typeof params.q === 'string' ? params.q : '';
  const pageStr = typeof params.page === 'string' ? params.page : '1';
  const page = parseInt(pageStr, 10) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (q) {
    where.OR = [
      { email: { contains: q, mode: 'insensitive' as const } },
      { name: { contains: q, mode: 'insensitive' as const } },
    ];
  }

  const totalAdmins = await prisma.admin.count({ where });
  const totalPages = Math.ceil(totalAdmins / limit);

  const admins = await prisma.admin.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip,
    take: limit,
  });

  async function addAdminAction(formData: FormData) {
    "use server";
    const email = formData.get("email") as string;
    
    if (!email) return;

    // Cek apakah sudah ada
    const existing = await prisma.admin.findUnique({ where: { email } });
    if (!existing) {
      await prisma.admin.create({
        data: {
          email,
          name: email.split('@')[0],
          password: "GOOGLE_AUTH_ONLY" // dummy password
        }
      });
    }
    revalidatePath("/admin/users");
  }

  async function deleteAdminAction(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    if (id) {
      await prisma.admin.delete({ where: { id } });
      revalidatePath("/admin/users");
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 md:pl-64 flex flex-col">
      <Sidebar />
      <div className="flex-1 p-6 md:p-8 max-w-5xl mx-auto w-full pt-24 md:pt-8 pb-32">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center">
            <ShieldCheck className="w-8 h-8 mr-3 text-emerald-500" />
            Kelola Akses Admin
          </h1>
          <p className="text-slate-500 mt-2 font-medium">
            Tambah atau hapus email yang diizinkan untuk login dan mengelola sistem ini.
          </p>
        </div>

        {/* Add Admin Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
            <PlusCircle className="w-5 h-5 mr-2 text-emerald-500" />
            Daftarkan Admin Baru
          </h2>
          <form action={addAdminAction} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <Mail className="h-5 w-5" />
              </div>
              <input 
                type="email" 
                name="email"
                required
                placeholder="Masukkan email Google (misal: budi@gmail.com)"
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-slate-700 placeholder:text-slate-400"
              />
            </div>
            <button 
              type="submit"
              className="py-3 px-6 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-md transition-all whitespace-nowrap active:scale-95"
            >
              Simpan Akses
            </button>
          </form>
          <div className="mt-4 p-3 bg-blue-50 text-blue-700 text-sm rounded-lg flex items-start">
            <ShieldAlert className="w-5 h-5 mr-2 shrink-0 mt-0.5 opacity-70" />
            <p>
              <strong>Informasi:</strong> Akun yang didaftarkan wajib menggunakan email Google (Gmail atau Google Workspace). Sistem otomatis memverifikasi melalui Google Login.
            </p>
          </div>
        </div>

        {/* List of Admins */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-slate-800">Daftar Admin Aktif</h2>
              <span className="bg-slate-200 text-slate-600 text-xs font-black px-2.5 py-1 rounded-md">
                {totalAdmins} Total
              </span>
            </div>
            
            <form className="relative w-full sm:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input 
                type="text" 
                name="q"
                defaultValue={q}
                placeholder="Cari email admin..." 
                className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <input type="hidden" name="page" value="1" />
            </form>
          </div>
          
          <div className="divide-y divide-slate-100">
            {admins.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                {q ? 'Admin tidak ditemukan.' : 'Belum ada admin yang terdaftar.'}
              </div>
            ) : (
              admins.map(admin => (
                <div key={admin.id} className="p-4 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center font-black text-lg shrink-0">
                      {admin.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 truncate">{admin.email}</p>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">
                        Ditambahkan pada {new Date(admin.createdAt).toLocaleDateString('id-ID')}
                      </p>
                    </div>
                  </div>
                  
                  <form action={deleteAdminAction}>
                    <input type="hidden" name="id" value={admin.id} />
                    <button 
                      type="submit"
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Cabut Akses"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </form>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 pt-6">
            {page > 1 ? (
              <Link href={`/admin/users?q=${encodeURIComponent(q)}&page=${page - 1}`} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 shadow-sm">
                <ChevronLeft className="w-5 h-5" />
              </Link>
            ) : (
              <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg text-slate-300 cursor-not-allowed">
                <ChevronLeft className="w-5 h-5" />
              </div>
            )}
            
            <span className="text-sm font-medium text-slate-600 mx-2">
              Hal {page} dari {totalPages}
            </span>

            {page < totalPages ? (
              <Link href={`/admin/users?q=${encodeURIComponent(q)}&page=${page + 1}`} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 shadow-sm">
                <ChevronRight className="w-5 h-5" />
              </Link>
            ) : (
              <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg text-slate-300 cursor-not-allowed">
                <ChevronRight className="w-5 h-5" />
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
