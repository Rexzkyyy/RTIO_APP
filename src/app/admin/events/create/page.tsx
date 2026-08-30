"use client";

import { Calendar as CalendarIcon, MapPin, Tag, Users, CheckCircle2, Plus, Trash2, Image as ImageIcon, Ticket } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import imageCompression from "browser-image-compression";
import { createEvent } from "./actions";

export default function CreateEventPage() {
  const [tickets, setTickets] = useState([{ 
    id: 1, 
    name: "", 
    price: "", 
    quota: "", 
    hasDiscount: false,
    discountPrice: "",
    discountStartDate: "",
    discountEndDate: ""
  }]);

  const formatPrice = (value: string) => {
    const numberString = value.replace(/\D/g, "");
    if (!numberString) return "";
    return parseInt(numberString, 10).toLocaleString("id-ID");
  };

  const handleTicketChange = (id: number, field: string, value: string) => {
    setTickets(tickets.map(t => {
      if (t.id === id) {
        if (field === "price" || field === "discountPrice") {
          return { ...t, [field]: formatPrice(value) };
        }
        return { ...t, [field]: value };
      }
      return t;
    }));
  };
  const [bankAccounts, setBankAccounts] = useState([{ id: 1, bank: "", number: "", name: "" }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [ticketImagePreview, setTicketImagePreview] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [slug, setSlug] = useState("");

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    const generatedSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
    setSlug(generatedSlug);
  };

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
    setTickets([...tickets, { 
      id: Date.now(), 
      name: "", 
      price: "", 
      quota: "",
      hasDiscount: false,
      discountPrice: "",
      discountStartDate: "",
      discountEndDate: ""
    }]);
  };

  const removeTicket = (id: number) => {
    if (tickets.length > 1) {
      setTickets(tickets.filter(t => t.id !== id));
    }
  };

  const toggleDiscount = (id: number) => {
    setTickets(tickets.map(t => t.id === id ? { ...t, hasDiscount: !t.hasDiscount } : t));
  };

  const addBankAccount = () => {
    setBankAccounts([...bankAccounts, { id: Date.now(), bank: "", number: "", name: "" }]);
  };

  const removeBankAccount = (id: number) => {
    if (bankAccounts.length > 1) {
      setBankAccounts(bankAccounts.filter(b => b.id !== id));
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Buat Event Baru</h1>
          <p className="text-slate-500 mt-1">Lengkapi detail event Anda di bawah ini.</p>
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
            
            // Compress banner
            const bannerFile = formData.get("bannerImage") as File;
            if (bannerFile && bannerFile.size > 0) {
              const compressedBanner = await imageCompression(bannerFile, options);
              formData.set("bannerImage", compressedBanner, bannerFile.name);
            }

            // Compress ticket
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
            const res = await createEvent(formData);
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
                        <p className="mb-2 text-sm text-slate-500 text-center"><span className="font-semibold">Upload Banner</span></p>
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
                        <Ticket className="w-8 h-8 mb-3 text-slate-400" />
                        <p className="mb-2 text-sm text-slate-500 text-center"><span className="font-semibold">Upload Desain Tiket</span></p>
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
                  onChange={handleTitleChange}
                  required
                  placeholder="Misal: Konser Kemerdekaan 2026"
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                />
              </div>
              
              <input 
                type="hidden" 
                name="slug"
                value={slug}
              />

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">Deskripsi Event</label>
                <textarea 
                  name="description"
                  required
                  rows={4}
                  placeholder="Jelaskan secara detail tentang event Anda..."
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                ></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Artis / Penampil (Pisahkan dengan koma)</label>
                <input 
                  type="text" 
                  name="artists"
                  placeholder="Dewa 19, Slank, Raisa"
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Sponsor (Pisahkan dengan koma)</label>
                <input 
                  type="text" 
                  name="sponsors"
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
                    required
                    placeholder="Misal: Gelora Bung Karno"
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
              {tickets.map((ticket, index) => (
                <div key={ticket.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <div className="md:col-span-4">
                    <label className="block text-xs font-medium text-slate-700 mb-1">Nama Kategori (Level)</label>
                    <input 
                      type="text" 
                      name="ticketName[]"
                      required
                      placeholder="Misal: VIP, Presale 1"
                      className="w-full px-3 py-2 rounded-md border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm"
                    />
                  </div>
                  <div className="md:col-span-4">
                    <label className="block text-xs font-medium text-slate-700 mb-1">Harga (Rp)</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                        <Tag className="h-4 w-4 text-slate-400" />
                      </div>
                      <input 
                        type="text"
                        inputMode="numeric"
                        name="ticketPrice[]"
                        required
                        value={ticket.price}
                        onChange={(e) => handleTicketChange(ticket.id, 'price', e.target.value)}
                        placeholder="Misal: 150.000"
                        className="w-full pl-8 px-3 py-2 rounded-md border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm"
                      />
                    </div>
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-xs font-medium text-slate-700 mb-1">Kuota</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                        <Users className="h-4 w-4 text-slate-400" />
                      </div>
                      <input 
                        type="number" 
                        name="ticketQuota[]"
                        required
                        min="1"
                        placeholder="100"
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
                  
                  {/* Discount Checkbox */}
                  <div className="md:col-span-12 mt-2">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={ticket.hasDiscount}
                        onChange={() => toggleDiscount(ticket.id)}
                        className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                      />
                      <span className="text-sm font-medium text-slate-700">Aktifkan Diskon Berbatas Waktu?</span>
                    </label>
                    <input type="hidden" name="hasDiscount[]" value={ticket.hasDiscount ? "true" : "false"} />
                  </div>

                  {/* Discount Inputs */}
                  {ticket.hasDiscount && (
                    <div className="md:col-span-12 grid grid-cols-1 md:grid-cols-3 gap-4 mt-2 bg-emerald-50 p-4 rounded-lg border border-emerald-100">
                      <div>
                        <label className="block text-xs font-medium text-emerald-800 mb-1">Harga Diskon (Rp)</label>
                        <input 
                          type="text" 
                          inputMode="numeric"
                          name="discountPrice[]" 
                          required 
                          value={ticket.discountPrice}
                          onChange={(e) => handleTicketChange(ticket.id, 'discountPrice', e.target.value)}
                          placeholder="Misal: 100.000"
                          className="w-full px-3 py-2 rounded-md border border-emerald-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-emerald-800 mb-1">Mulai Diskon (WIB)</label>
                        <input 
                          type="datetime-local" 
                          name="discountStartDate[]" 
                          required 
                          className="w-full px-3 py-2 rounded-md border border-emerald-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-emerald-800 mb-1">Selesai Diskon (WIB)</label>
                        <input 
                          type="datetime-local" 
                          name="discountEndDate[]" 
                          required 
                          className="w-full px-3 py-2 rounded-md border border-emerald-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm"
                        />
                      </div>
                    </div>
                  )}
                  {!ticket.hasDiscount && (
                    <>
                      <input type="hidden" name="discountPrice[]" value="" />
                      <input type="hidden" name="discountStartDate[]" value="" />
                      <input type="hidden" name="discountEndDate[]" value="" />
                    </>
                  )}
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
                  placeholder="628123456789"
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Instagram (Username atau Link)</label>
                <input 
                  type="text" 
                  name="instagram"
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
              {bankAccounts.map((account, index) => (
                <div key={account.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <div className="md:col-span-3">
                    <label className="block text-xs font-medium text-slate-700 mb-1">Nama Bank (Misal: BCA)</label>
                    <input 
                      type="text" 
                      name="bankName[]"
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
                <span>Menyimpan Data...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-6 h-6 mr-2" />
                  Simpan & Buka Pendaftaran
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
