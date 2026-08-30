import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { ShieldAlert, Trash2, Mail, PlusCircle, ShieldCheck, Search, ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import AddAdminForm from "@/components/admin/AddAdminForm";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function AdminUsersPage({ searchParams }: Props) {
  const session = await getServerSession(authOptions);
  const currentUserEmail = session?.user?.email;

  // @ts-ignore
  if (session?.user?.adminRole === "VALIDATOR") {
    const { redirect } = await import("next/navigation");
    redirect("/admin/events");
  }

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
    include: { eventAccess: { include: { event: { select: { id: true, title: true } } } } },
    orderBy: { createdAt: 'desc' },
    skip,
    take: limit,
  });

  const allEvents = await prisma.event.findMany({
    select: { id: true, title: true },
    orderBy: { createdAt: 'desc' }
  });

  async function addAdminAction(formData: FormData) {
    "use server";
    const email = formData.get("email") as string;
    const role = formData.get("role") as "SUPER_ADMIN" | "VALIDATOR";
    const eventIds = formData.getAll("eventIds") as string[];
    
    if (!email) return;

    // Cek apakah sudah ada
    const existing = await prisma.admin.findUnique({ where: { email } });
    if (!existing) {
      const newAdmin = await prisma.admin.create({
        data: {
          email,
          name: email.split('@')[0],
          password: "GOOGLE_AUTH_ONLY",
          role: role || "SUPER_ADMIN"
        }
      });

      if (role === "VALIDATOR" && eventIds.length > 0) {
        await prisma.adminEventAccess.createMany({
          data: eventIds.map(id => ({ adminId: newAdmin.id, eventId: id }))
        });
      }
    } else {
      // If updating existing admin
      await prisma.admin.update({
        where: { email },
        data: { role: role || "SUPER_ADMIN" }
      });

      // Clear existing access
      await prisma.adminEventAccess.deleteMany({ where: { adminId: existing.id } });

      if (role === "VALIDATOR" && eventIds.length > 0) {
        await prisma.adminEventAccess.createMany({
          data: eventIds.map(id => ({ adminId: existing.id, eventId: id }))
        });
      }
    }
    revalidatePath("/admin/users");
  }

  async function deleteAdminAction(formData: FormData) {
    "use server";
    const session = await getServerSession(authOptions);
    const currentUserEmail = session?.user?.email;

    const id = formData.get("id") as string;
    const adminEmail = formData.get("email") as string;

    // Prevent self-deletion
    if (adminEmail === currentUserEmail) {
      return;
    }

    if (id) {
      await prisma.admin.delete({ where: { id } });
      revalidatePath("/admin/users");
    }
  }

  return (
    <div className="w-full space-y-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center">
            <ShieldCheck className="w-8 h-8 mr-3 text-emerald-500" />
            Kelola Akses Admin
          </h1>
          <p className="text-slate-500 mt-2 font-medium">
            Tambah atau hapus email yang diizinkan untuk login dan mengelola sistem ini.
          </p>
        </div>

        {/* Add Admin Form Component */}
        <AddAdminForm events={allEvents} action={addAdminAction} />

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
                  <div className="flex items-center gap-4 w-full sm:w-auto flex-1">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-lg shrink-0 ${
                      admin.role === 'SUPER_ADMIN' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'
                    }`}>
                      {admin.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-slate-800 truncate">
                          {admin.email}
                          {admin.email === currentUserEmail && (
                            <span className="ml-2 text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                              Anda
                            </span>
                          )}
                        </p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          admin.role === 'SUPER_ADMIN' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {admin.role === 'SUPER_ADMIN' ? 'SUPER ADMIN' : 'VALIDATOR'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">
                        Ditambahkan pada {new Date(admin.createdAt).toLocaleDateString('id-ID')}
                      </p>
                      {admin.role === 'VALIDATOR' && admin.eventAccess && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {admin.eventAccess.map((access: any) => (
                            <span key={access.eventId} className="inline-flex items-center gap-1 text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                              {access.event.title}
                            </span>
                          ))}
                          {admin.eventAccess.length === 0 && (
                            <span className="text-[10px] text-red-500 font-medium italic">Belum ada event yang di-assign</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {admin.email !== currentUserEmail ? (
                    <form action={deleteAdminAction}>
                      <input type="hidden" name="id" value={admin.id} />
                      <input type="hidden" name="email" value={admin.email} />
                      <button 
                        type="submit"
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Cabut Akses"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </form>
                  ) : (
                    <div className="p-2 w-9 h-9" />
                  )}
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
  );
}
