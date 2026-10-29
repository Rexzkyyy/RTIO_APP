// ─── IndexedDB Offline Store for RTIO Scanner ──────────────────────────────
export interface OfflineTicket {
  id: string;
  transactionId?: string;
  barcodeString: string;
  holderName: string | null;
  holderPhone: string | null;
  holderGender: string | null;
  isValidated: boolean;
  checkedInAt: string | null;
  categoryName: string;
  categoryPrice: number;
  eventTitle: string;
  eventId: string;
  buyerName: string;
  buyerPhone: string;
  txStatus: string;
  totalTickets?: number;
  checkedInCount?: number;
  remainingCount?: number;
}

export interface PendingSyncItem {
  ticketId: string;
  barcodeString: string;
  holderName: string;
  checkedInAt: string;
  createdAt: number;
}

const DB_NAME = "rtio_scanner_offline_db";
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB is not supported in this environment"));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // 1. Store tickets
      if (!db.objectStoreNames.contains("tickets")) {
        const ticketStore = db.createObjectStore("tickets", { keyPath: "id" });
        ticketStore.createIndex("barcodeString", "barcodeString", { unique: false });
        ticketStore.createIndex("eventId", "eventId", { unique: false });
        ticketStore.createIndex("isValidated", "isValidated", { unique: false });
        ticketStore.createIndex("transactionId", "transactionId", { unique: false });
      }

      // 2. Store pending check-in syncs
      if (!db.objectStoreNames.contains("pending_sync")) {
        db.createObjectStore("pending_sync", { keyPath: "ticketId" });
      }

      // 3. Store metadata
      if (!db.objectStoreNames.contains("meta")) {
        db.createObjectStore("meta", { keyPath: "key" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ── Save tickets into IndexedDB ───────────────────────────────────────────────
export async function saveOfflineTickets(
  eventId: string,
  tickets: OfflineTicket[]
): Promise<{ count: number }> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(["tickets", "meta"], "readwrite");
    const ticketStore = tx.objectStore("tickets");
    const metaStore = tx.objectStore("meta");

    // Simpan semua tiket
    for (const ticket of tickets) {
      ticketStore.put(ticket);
    }

    // Catat waktu download & jumlah tiket
    metaStore.put({
      key: `event_${eventId}`,
      eventId,
      count: tickets.length,
      syncedAt: new Date().toISOString(),
    });

    tx.oncomplete = () => resolve({ count: tickets.length });
    tx.onerror = () => reject(tx.error);
  });
}

// ── Search tickets offline in IndexedDB ───────────────────────────────────────
export async function searchOfflineTickets(
  query: string,
  eventId?: string,
  statusFilter: "ALL" | "UNCHECKED" | "CHECKED" = "ALL"
): Promise<OfflineTicket[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("tickets", "readonly");
    const store = tx.objectStore("tickets");
    const request = store.openCursor();
    const results: OfflineTicket[] = [];

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        const ticket = cursor.value as OfflineTicket;

        // Filter event jika dispesifikasikan
        const eventMatch = !eventId || eventId === "ALL" || ticket.eventId === eventId;

        // Filter status check-in
        let statusMatch = true;
        if (statusFilter === "UNCHECKED") statusMatch = !ticket.isValidated;
        if (statusFilter === "CHECKED") statusMatch = ticket.isValidated;

        if (eventMatch && statusMatch) {
          const barcodeMatch = ticket.barcodeString.toLowerCase().includes(q);
          const nameMatch = (ticket.holderName || "").toLowerCase().includes(q);
          const buyerMatch = (ticket.buyerName || "").toLowerCase().includes(q);
          const phoneMatch =
            (ticket.holderPhone || "").toLowerCase().includes(q) ||
            (ticket.buyerPhone || "").toLowerCase().includes(q);

          if (barcodeMatch || nameMatch || buyerMatch || phoneMatch) {
            results.push(ticket);
            if (results.length >= 25) {
              return resolve(results);
            }
          }
        }
        cursor.continue();
      } else {
        resolve(results);
      }
    };

    request.onerror = () => reject(request.error);
  });
}

// ── Find exact ticket by Barcode offline ───────────────────────────────────────
export async function findOfflineTicketByBarcode(barcode: string): Promise<OfflineTicket | null> {
  const b = barcode.trim().toLowerCase();
  if (!b) return null;

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("tickets", "readonly");
    const store = tx.objectStore("tickets");
    const request = store.openCursor();

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        const ticket = cursor.value as OfflineTicket;
        if (ticket.barcodeString.toLowerCase() === b) {
          return resolve(ticket);
        }
        cursor.continue();
      } else {
        resolve(null);
      }
    };

    request.onerror = () => reject(request.error);
  });
}

// ── Perform Check-In Locally in IndexedDB (Supports Check-In All) ─────────────
export async function checkInTicketOffline(
  ticketId: string,
  checkInAll: boolean = false
): Promise<{
  success: boolean;
  status: "VALID" | "ALREADY_CHECKED_IN" | "NOT_APPROVED" | "NOT_FOUND";
  message: string;
  ticket?: OfflineTicket;
}> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(["tickets", "pending_sync"], "readwrite");
    const ticketStore = tx.objectStore("tickets");
    const pendingStore = tx.objectStore("pending_sync");

    const getReq = ticketStore.get(ticketId);

    getReq.onsuccess = () => {
      const ticket = getReq.result as OfflineTicket | undefined;
      if (!ticket) {
        return resolve({
          success: false,
          status: "NOT_FOUND",
          message: "Tiket tidak ditemukan di database offline.",
        });
      }

      if (ticket.txStatus !== "APPROVED") {
        return resolve({
          success: false,
          status: "NOT_APPROVED",
          message: `Pembayaran tiket belum diverifikasi (Status: ${ticket.txStatus}).`,
          ticket,
        });
      }

      const now = new Date().toISOString();

      // JIKA CHECK-IN SEMUA TIKET DALAM SATU TRANSAKSI SEKALIGUS
      if (checkInAll && ticket.transactionId) {
        const allTxTicketsReq = ticketStore.getAll();
        allTxTicketsReq.onsuccess = () => {
          const allTickets = (allTxTicketsReq.result as OfflineTicket[]).filter(
            (t) => t.transactionId === ticket.transactionId
          );

          const unchecked = allTickets.filter((t) => !t.isValidated);
          const total = allTickets.length;

          if (unchecked.length === 0) {
            return resolve({
              success: false,
              status: "ALREADY_CHECKED_IN",
              message: `Semua tiket (${total}/${total}) dalam transaksi ini sudah check-in.`,
              ticket,
            });
          }

          // Validasi semua yang belum
          for (const uTicket of unchecked) {
            const updated: OfflineTicket = {
              ...uTicket,
              isValidated: true,
              checkedInAt: now,
              checkedInCount: total,
              remainingCount: 0,
            };
            ticketStore.put(updated);
            pendingStore.put({
              ticketId: uTicket.id,
              barcodeString: uTicket.barcodeString,
              holderName: uTicket.holderName || uTicket.buyerName,
              checkedInAt: now,
              createdAt: Date.now(),
            });
          }

          resolve({
            success: true,
            status: "VALID",
            message: `Check-in offline berhasil untuk SEMUA tiket (${total}/${total})!`,
            ticket: {
              ...ticket,
              isValidated: true,
              checkedInAt: now,
              checkedInCount: total,
              remainingCount: 0,
            },
          });
        };
        allTxTicketsReq.onerror = () => reject(allTxTicketsReq.error);
        return;
      }

      // JIKA CHECK-IN 1 TIKET SPESIFIK
      if (ticket.isValidated) {
        if (ticket.transactionId) {
          const allTxTicketsReq = ticketStore.getAll();
          allTxTicketsReq.onsuccess = () => {
            const allTickets = (allTxTicketsReq.result as OfflineTicket[]).filter(
              (t) => t.transactionId === ticket.transactionId
            );
            const unchecked = allTickets.filter((t) => !t.isValidated);
            const nextUnchecked = unchecked[0];

            if (nextUnchecked) {
              const total = allTickets.length;
              const newCheckedCount = total - unchecked.length + 1;
              const remaining = Math.max(0, total - newCheckedCount);

              let updatedTarget: OfflineTicket | null = null;
              for (const t of allTickets) {
                const isTarget = t.id === nextUnchecked.id;
                const updated: OfflineTicket = {
                  ...t,
                  isValidated: isTarget ? true : t.isValidated,
                  checkedInAt: isTarget ? now : t.checkedInAt,
                  checkedInCount: newCheckedCount,
                  remainingCount: remaining,
                };
                ticketStore.put(updated);
                if (isTarget) updatedTarget = updated;
              }

              pendingStore.put({
                ticketId: nextUnchecked.id,
                barcodeString: nextUnchecked.barcodeString,
                holderName: nextUnchecked.holderName || nextUnchecked.buyerName,
                checkedInAt: now,
                createdAt: Date.now(),
              });

              return resolve({
                success: true,
                status: "VALID",
                message: `Check-in offline berhasil untuk tiket berikutnya! Kuota: ${newCheckedCount}/${total}`,
                ticket: updatedTarget || nextUnchecked,
              });
            }

            const dateStr = ticket.checkedInAt
              ? new Date(ticket.checkedInAt).toLocaleString("id-ID", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })
              : "Sebelumnya";
            return resolve({
              success: false,
              status: "ALREADY_CHECKED_IN",
              message: `Semua tiket rombongan sudah digunakan (Terakhir check-in pada ${dateStr}).`,
              ticket,
            });
          };
          allTxTicketsReq.onerror = () => reject(allTxTicketsReq.error);
          return;
        }

        const dateStr = ticket.checkedInAt
          ? new Date(ticket.checkedInAt).toLocaleString("id-ID", {
              dateStyle: "medium",
              timeStyle: "short",
            })
          : "Sebelumnya";
        return resolve({
          success: false,
          status: "ALREADY_CHECKED_IN",
          message: `Tiket sudah digunakan sebelumnya (Check-in pada ${dateStr}).`,
          ticket,
        });
      }

      if (ticket.transactionId) {
        const allTxTicketsReq = ticketStore.getAll();
        allTxTicketsReq.onsuccess = () => {
          const allTickets = (allTxTicketsReq.result as OfflineTicket[]).filter(
            (t) => t.transactionId === ticket.transactionId
          );
          const checked = allTickets.filter((t) => t.isValidated || t.id === ticket.id).length;
          const total = allTickets.length || ticket.totalTickets || 1;
          const remaining = Math.max(0, total - checked);

          let updatedTarget: OfflineTicket = {
            ...ticket,
            isValidated: true,
            checkedInAt: now,
            checkedInCount: checked,
            remainingCount: remaining,
          };

          for (const t of allTickets) {
            const isTarget = t.id === ticket.id;
            const updated: OfflineTicket = {
              ...t,
              isValidated: isTarget ? true : t.isValidated,
              checkedInAt: isTarget ? now : t.checkedInAt,
              checkedInCount: checked,
              remainingCount: remaining,
            };
            ticketStore.put(updated);
            if (isTarget) updatedTarget = updated;
          }

          const syncItem: PendingSyncItem = {
            ticketId: ticket.id,
            barcodeString: ticket.barcodeString,
            holderName: ticket.holderName || ticket.buyerName,
            checkedInAt: now,
            createdAt: Date.now(),
          };
          pendingStore.put(syncItem);

          resolve({
            success: true,
            status: "VALID",
            message:
              total > 1
                ? `Check-in offline berhasil untuk ${ticket.holderName || ticket.buyerName}! (${checked}/${total})`
                : `Check-in offline berhasil untuk ${ticket.holderName || ticket.buyerName}!`,
            ticket: updatedTarget,
          });
        };
        allTxTicketsReq.onerror = () => reject(allTxTicketsReq.error);
        return;
      }

      const total = ticket.totalTickets || 1;
      const newCheckedCount = (ticket.checkedInCount || 0) + 1;
      const remaining = Math.max(0, total - newCheckedCount);

      const updatedTicket: OfflineTicket = {
        ...ticket,
        isValidated: true,
        checkedInAt: now,
        checkedInCount: newCheckedCount,
        remainingCount: remaining,
      };

      ticketStore.put(updatedTicket);

      // Tambahkan ke antrean sinkronisasi server
      const syncItem: PendingSyncItem = {
        ticketId: ticket.id,
        barcodeString: ticket.barcodeString,
        holderName: ticket.holderName || ticket.buyerName,
        checkedInAt: now,
        createdAt: Date.now(),
      };
      pendingStore.put(syncItem);

      resolve({
        success: true,
        status: "VALID",
        message:
          total > 1
            ? `Check-in offline berhasil untuk ${ticket.holderName || ticket.buyerName}! (${newCheckedCount}/${total})`
            : `Check-in offline berhasil untuk ${ticket.holderName || ticket.buyerName}!`,
        ticket: updatedTicket,
      });
    };

    getReq.onerror = () => reject(getReq.error);
  });
}

// ── Get Pending Sync Queue ───────────────────────────────────────────────────
export async function getPendingSyncQueue(): Promise<PendingSyncItem[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("pending_sync", "readonly");
    const store = tx.objectStore("pending_sync");
    const req = store.getAll();

    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

// ── Remove items from sync queue after server synced ──────────────────────────
export async function clearPendingSyncQueue(ticketIds: string[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("pending_sync", "readwrite");
    const store = tx.objectStore("pending_sync");

    for (const id of ticketIds) {
      store.delete(id);
    }

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ── Get Offline Database Metadata & Stats ─────────────────────────────────────
export async function getOfflineStats(
  eventId?: string
): Promise<{
  totalTickets: number;
  checkedInTickets: number;
  pendingSyncCount: number;
  lastSyncedAt: string | null;
}> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(["tickets", "pending_sync", "meta"], "readonly");
      const ticketStore = tx.objectStore("tickets");
      const pendingStore = tx.objectStore("pending_sync");
      const metaStore = tx.objectStore("meta");

      let totalTickets = 0;
      let checkedInTickets = 0;
      let pendingSyncCount = 0;
      let lastSyncedAt: string | null = null;

      const cursorReq = ticketStore.openCursor();
      cursorReq.onsuccess = (e) => {
        const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          const t = cursor.value as OfflineTicket;
          if (!eventId || eventId === "ALL" || t.eventId === eventId) {
            totalTickets++;
            if (t.isValidated) checkedInTickets++;
          }
          cursor.continue();
        } else {
          // Hitung antrean pending
          const pendingReq = pendingStore.count();
          pendingReq.onsuccess = () => {
            pendingSyncCount = pendingReq.result;

            // Ambil meta sync
            const metaKey = eventId && eventId !== "ALL" ? `event_${eventId}` : null;
            if (metaKey) {
              const metaReq = metaStore.get(metaKey);
              metaReq.onsuccess = () => {
                if (metaReq.result) lastSyncedAt = metaReq.result.syncedAt;
                resolve({ totalTickets, checkedInTickets, pendingSyncCount, lastSyncedAt });
              };
            } else {
              resolve({ totalTickets, checkedInTickets, pendingSyncCount, lastSyncedAt });
            }
          };
        }
      };

      cursorReq.onerror = () => reject(cursorReq.error);
    });
  } catch {
    return {
      totalTickets: 0,
      checkedInTickets: 0,
      pendingSyncCount: 0,
      lastSyncedAt: null,
    };
  }
}
