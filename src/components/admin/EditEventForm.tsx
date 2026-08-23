"use client";

import { Calendar as CalendarIcon, MapPin, Tag, Users, CheckCircle2, Plus, Trash2, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { updateEvent } from "@/app/admin/events/[id]/edit/actions";
import imageCompression from "browser-image-compression";

export function EditEventForm({ event }: { event: any }) {
  // Initialize ticket states from database, or fallback to one empty ticket
  const initialTickets = event.ticketCategories.length > 0 
    ? event.ticketCategories.map((t: any) => ({
        id: t.id,
        name: t.name,
        price: t.price.toString(),
        quota: t.quota.toString(),
        isNew: false
      }))
    : [{ id: Date.now().toString(), name: "", price: "", quota: "", isNew: true }];

  const initialBankAccounts = (event.bankAccounts && Array.isArray(event.bankAccounts) && event.bankAccounts.length > 0)
    ? event.bankAccounts.map((b: any, index: number) => ({
        id: Date.now() + index,
        bank: b.bank || "",
        number: b.number || "",
        name: b.name || ""
      }))
    : [{ id: Date.now(), bank: "", number: "", name: "" }];

  const [tickets, setTickets] = useState(initialTickets);
  const [bankAccounts, setBankAccounts] = useState(initialBankAccounts);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(event.bannerUrl || null);
  const [ticketImagePreview, setTicketImagePreview] = useState<string | null>(event.ticketDesignUrl || null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleTicketImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setTicketImagePreview(URL.createObjectURL(file));
    }
  };

  const addTicket = () => {
    setTickets([...tickets, { id: Date.now().toString(), name: "", price: "", quota: "", isNew: true }]);
  };

  const removeTicket = (id: string) => {
    if (tickets.length > 1) {
      setTickets(tickets.filter((t: any) => t.id !== id));
    }
  };

  const addBankAccount = () => {
    setBankAccounts([...bankAccounts, { id: Date.now(), bank: "", number: "", name: "" }]);
  };

  const removeBankAccount = (id: number) => {
    if (bankAccounts.length > 1) {
      setBankAccounts(bankAccounts.filter((b: any) => b.id !== id));
    }
  };

  // Convert Date to string format required by input type="datetime-local"
  const formatDateForInput = (date: Date) => {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Edit Event</h1>
          <p className="text-slate-500 mt-1">Ubah detail event Anda di bawah ini.</p>
        </div>
        <Link 
          href="/admin/events" 
          className="px-4 py-2 bg-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-300 transition-colors"
        >
          Batal
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {errorMsg && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 m-8 mb-0 rounded-r-lg flex items-center">
            <span className="text-red-800 text-sm font-medium">{errorMsg}</span>
          </div>
        )}
        <form action={async (formData) => {
          setErrorMsg(null);
          setIsSubmitting(true);
          
          let compressionError = false;
          try {
            const options = { maxSizeMB: 0.5, maxWidthOrHeight: 1280, useWebWorker: true };
            
            const bannerFile = formData.get("bannerImage") as File;
            if (bannerFile && bannerFile.size > 0) {
              const compressedBanner = await imageCompression(bannerFile, options);
              formData.set("bannerImage", compressedBanner, bannerFile.name);
            }

            const ticketFile = formData.get("ticketDesignImage") as File;
            if (ticketFile && ticketFile.size > 0) {
              const compressedTicket = await imageCompression(ticketFile, options);
              formData.set("ticketDesignImage", compressedTicket, ticketFile.name);
            }
          } catch (error) {
            console.error(error);
            setErrorMsg("Gagal memproses gambar. Pastikan format gambar valid.");
            setIsSubmitting(false);
            compressionError = true;
          }

          if (!compressionError) {
            const res = await updateEvent(event.id, formData);
            if (res?.error) {
               setErrorMsg(res.error);
               setIsSubmitting(false);
            }
          }
        }} className="p-8 space-y-8">
          
          {/* Bagian 1: Detail Dasar & Banner */}
          <div>
            <h3 className="text-lg font-semibold text-slate-800 border-b pb-2 mb-4">1. Detail & Banner Event</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-2">Gambar Banner</label>
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors overflow-hidden relative">
                    {imagePreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={imagePreview} alt="Preview Banner" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <ImageIcon className="w-8 h-8 mb-3 text-slate-400" />
                        <p className="mb-2 text-sm text-slate-500 text-center"><span className="font-semibold">Klik untuk upload ulang</span></p>
                        <p className="text-xs text-slate-500 text-center">Biarkan kosong jika tidak mengubah</p>
                      </div>
                    )}
                    <div className={imagePreview ? "absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity" : "hidden"}>
                       <p className="text-white font-medium text-sm">Ganti</p>
                    </div>
                    <input type="file" name="bannerImage" onChange={handleImageChange} className="hidden" accept="image/png, image/jpeg, image/webp" />
                  </label>
                </div>
              </div>

              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-2">Desain Tiket (Opsional)</label>
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors overflow-hidden relative">
                    {ticketImagePreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={ticketImagePreview} alt="Preview Tiket" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <ImageIcon className="w-8 h-8 mb-3 text-slate-400" />
                        <p className="mb-2 text-sm text-slate-500 text-center"><span className="font-semibold">Upload Desain Tiket</span></p>
                        <p className="text-xs text-slate-500 text-center">Biarkan kosong jika tidak mengubah</p>
                      </div>
                    )}
                    <div className={ticketImagePreview ? "absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity" : "hidden"}>
                       <p className="text-white font-medium text-sm">Ganti</p>
                    </div>
                    <input type="file" name="ticketDesignImage" onChange={handleTicketImageChange} className="hidden" accept="image/png, image/jpeg, image/webp" />
                  </label>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">Nama Event</label>
                <input 
                  type="text" 
                  name="title"
                  defaultValue={event.title}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">URL Slug</label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-slate-300 bg-slate-50 text-slate-500 sm:text-sm">
                    rtiotix.com/event/
                  </span>
                  <input 
                    type="text" 
                    name="slug"
                    defaultValue={event.slug}
                    required
                    className="flex-1 block w-full px-4 py-3 rounded-none rounded-r-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">Deskripsi Event</label>
                <textarea 
                  name="description"
                  defaultValue={event.description}
                  required
                  rows={4}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                ></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Artis / Penampil (Pisahkan dengan koma)</label>
                <input 
                  type="text" 
                  name="artists"
                  defaultValue={event.artists?.join(", ")}
                  placeholder="Dewa 19, Slank, Raisa"
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Sponsor (Pisahkan dengan koma)</label>
                <input 
                  type="text" 
                  name="sponsors"
                  defaultValue={event.sponsors?.join(", ")}
                  placeholder="Telkomsel, Gojek, Tokopedia"
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                />
              </div>

            </div>
          </div>

          {/* Bagian 2: Waktu & Lokasi */}
          <div>
            <h3 className="text-lg font-semibold text-slate-800 border-b pb-2 mb-4">2. Waktu & Lokasi</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Tanggal Pelaksanaan</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <CalendarIcon className="h-5 w-5 text-slate-400" />
                  </div>
                  <input 
                    type="datetime-local" 
                    name="eventDate"
                    defaultValue={formatDateForInput(event.eventDate)}
                    required
                    className="block w-full pl-10 px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Lokasi / Tempat</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MapPin className="h-5 w-5 text-slate-400" />
                  </div>
                  <input 
                    type="text" 
                    name="location"
                    defaultValue={event.location}
                    required
                    className="block w-full pl-10 px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Bagian 3: Tiket */}
          <div>
            <div className="flex justify-between items-center border-b pb-2 mb-4">
              <h3 className="text-lg font-semibold text-slate-800">3. Kategori Tiket</h3>
              <button 
                type="button" 
                onClick={addTicket}
                className="flex items-center text-sm text-emerald-600 hover:text-emerald-700 font-medium"
              >
                <Plus className="w-4 h-4 mr-1" />
                Tambah Kategori
              </button>
            </div>
            
            <div className="space-y-4">
              {tickets.map((ticket: any, index: number) => (
                <div key={ticket.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-slate-50 p-4 rounded-lg border border-slate-200">
                  {/* Hidden field to keep track of existing ticket IDs */}
                  {!ticket.isNew && <input type="hidden" name="ticketId[]" value={ticket.id} />}
                  {ticket.isNew && <input type="hidden" name="ticketId[]" value="NEW" />}

                  <div className="md:col-span-3">
                    <label className="block text-xs font-medium text-slate-700 mb-1">Nama Kategori (Level)</label>
                    <input 
                      type="text" 
                      name="ticketName[]"
                      defaultValue={ticket.name}
                      required
                      className="w-full px-3 py-2 rounded-md border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-xs font-medium text-slate-700 mb-1">Harga (Rp)</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                        <Tag className="h-4 w-4 text-slate-400" />
                      </div>
                      <input 
                        type="text" 
                        name="ticketPrice[]"
                        defaultValue={ticket.price}
                        required
                        placeholder="150000"
                        className="w-full pl-8 px-3 py-2 rounded-md border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm"
                      />
                    </div>
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-xs font-medium text-slate-700 mb-1">Harga Coret (Opsional)</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                        <Tag className="h-4 w-4 text-slate-400 opacity-50" />
                      </div>
                      <input 
                        type="text" 
                        name="ticketOriginalPrice[]"
                        defaultValue={ticket.originalPrice || ""}
                        placeholder="250000"
                        className="w-full pl-8 px-3 py-2 rounded-md border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm"
                      />
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-slate-700 mb-1">Kuota</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                        <Users className="h-4 w-4 text-slate-400" />
                      </div>
                      <input 
                        type="number" 
                        name="ticketQuota[]"
                        defaultValue={ticket.quota}
                        required
                        min="1"
                        className="w-full pl-8 px-3 py-2 rounded-md border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm"
                      />
                    </div>
                  </div>
                  <div className="md:col-span-1 flex justify-end">
                    <button 
                      type="button" 
                      onClick={() => removeTicket(ticket.id)}
                      disabled={tickets.length === 1}
                      className={`p-2 rounded-md ${tickets.length === 1 ? 'text-slate-300 cursor-not-allowed' : 'text-red-500 hover:bg-red-50'}`}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bagian 4: Media Sosial */}
          <div>
            <h3 className="text-lg font-semibold text-slate-800 border-b pb-2 mb-4">4. Media Sosial (Opsional)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">WhatsApp Admin (contoh: 62812...)</label>
                <input 
                  type="text" 
                  name="whatsapp"
                  defaultValue={event.whatsapp || ""}
                  placeholder="628123456789"
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Instagram (Username atau Link)</label>
                <input 
                  type="text" 
                  name="instagram"
                  defaultValue={event.instagram || ""}
                  placeholder="@event_keren"
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Bagian 5: Informasi Rekening Pembayaran */}
          <div>
            <div className="flex justify-between items-center border-b pb-2 mb-4">
              <h3 className="text-lg font-semibold text-slate-800">5. Informasi Rekening Pembayaran</h3>
              <button 
                type="button" 
                onClick={addBankAccount}
                className="flex items-center text-sm text-emerald-600 hover:text-emerald-700 font-medium"
              >
                <Plus className="w-4 h-4 mr-1" />
                Tambah Rekening
              </button>
            </div>
            
            <div className="space-y-4">
              {bankAccounts.map((account: any, index: number) => (
                <div key={account.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <div className="md:col-span-3">
                    <label className="block text-xs font-medium text-slate-700 mb-1">Nama Bank (Misal: BCA)</label>
                    <input 
                      type="text" 
                      name="bankName[]"
                      defaultValue={account.bank}
                      required
                      placeholder="BCA"
                      className="w-full px-3 py-2 rounded-md border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm"
                    />
                  </div>
                  <div className="md:col-span-4">
                    <label className="block text-xs font-medium text-slate-700 mb-1">Nomor Rekening</label>
                    <input 
                      type="text" 
                      name="bankNumber[]"
                      defaultValue={account.number}
                      required
                      placeholder="1234567890"
                      className="w-full px-3 py-2 rounded-md border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm"
                    />
                  </div>
                  <div className="md:col-span-4">
                    <label className="block text-xs font-medium text-slate-700 mb-1">Atas Nama</label>
                    <input 
                      type="text" 
                      name="bankAccountName[]"
                      defaultValue={account.name}
                      required
                      placeholder="PT RTIO Ticketing"
                      className="w-full px-3 py-2 rounded-md border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm"
                    />
                  </div>
                  <div className="md:col-span-1 flex justify-end">
                    <button 
                      type="button" 
                      onClick={() => removeBankAccount(account.id)}
                      disabled={bankAccounts.length === 1}
                      className={`p-2 rounded-md ${bankAccounts.length === 1 ? 'text-slate-300 cursor-not-allowed' : 'text-red-500 hover:bg-red-50'}`}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-6 border-t">
            <button 
              type="submit"
              disabled={isSubmitting}
              className={`w-full flex justify-center items-center px-6 py-4 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 focus:ring-4 focus:ring-emerald-500/50 transition-all text-lg shadow-lg shadow-emerald-500/30 ${isSubmitting ? 'opacity-70 cursor-wait' : ''}`}
            >
              {isSubmitting ? (
                <span>Menyimpan Perubahan...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-6 h-6 mr-2" />
                  Simpan Perubahan
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
