// Notification and Service Worker Management for Medication and Insulin Alarms
import { MedicationLog, InsulinLog } from "../types";

let swRegistration: ServiceWorkerRegistration | null = null;
let schedulerInterval: any = null;

// Track already sent notifications for the current day to avoid duplicates
const NOTIFIED_STORAGE_KEY = "glyco_notified_doses_v1";

function getNotifiedCache(): Record<string, number> {
  try {
    const raw = localStorage.getItem(NOTIFIED_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function recordNotificationSent(dedupKey: string) {
  try {
    const cache = getNotifiedCache();
    cache[dedupKey] = Date.now();
    
    // Clean up entries older than 48 hours
    const cutoff = Date.now() - 48 * 60 * 60 * 1000;
    const cleaned: Record<string, number> = {};
    for (const [k, timestamp] of Object.entries(cache)) {
      if (timestamp > cutoff) {
        cleaned[k] = timestamp;
      }
    }
    localStorage.setItem(NOTIFIED_STORAGE_KEY, JSON.stringify(cleaned));
  } catch (e) {
    console.warn("Falha ao salvar deduplicação de notificação:", e);
  }
}

function isAlreadyNotified(dedupKey: string): boolean {
  const cache = getNotifiedCache();
  return Boolean(cache[dedupKey]);
}

/**
 * Register Service Worker for background notifications
 */
export async function registerNotificationServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    console.warn("[NOTIFICATIONS]: Service Worker não é suportado neste ambiente.");
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    swRegistration = registration;
    console.log("[NOTIFICATIONS]: Service Worker registrado com sucesso:", registration.scope);
    return registration;
  } catch (error) {
    console.warn("[NOTIFICATIONS]: Erro ao registrar Service Worker:", error);
    return null;
  }
}

/**
 * Check current notification permission
 */
export function getNotificationPermission(): "granted" | "denied" | "default" | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission;
}

/**
 * Request notification permission from user
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      await registerNotificationServiceWorker();
      return true;
    }
    return false;
  } catch (error) {
    console.error("[NOTIFICATIONS]: Erro ao solicitar permissão:", error);
    return false;
  }
}

/**
 * Send an immediate notification (via Service Worker if available, fallback to Notification API)
 */
export async function sendNotification(title: string, options: {
  body: string;
  tag?: string;
  medId?: string;
  icon?: string;
}) {
  if (getNotificationPermission() !== "granted") {
    console.warn("[NOTIFICATIONS]: Permissão de notificação não concedida.");
    return false;
  }

  const defaultIcon = "/favicon.ico";

  try {
    if (swRegistration && "showNotification" in swRegistration) {
      await swRegistration.showNotification(title, {
        body: options.body,
        icon: options.icon || defaultIcon,
        badge: defaultIcon,
        tag: options.tag || `glyco-${Date.now()}`,
        vibrate: [200, 100, 200],
        data: { url: "/?view=medicamentos", medId: options.medId },
      } as any);
      return true;
    }

    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: "TRIGGER_NOTIFICATION",
        title,
        body: options.body,
        tag: options.tag,
        medId: options.medId,
      });
      return true;
    }

    if ("Notification" in window) {
      new Notification(title, {
        body: options.body,
        icon: options.icon || defaultIcon,
        tag: options.tag,
      });
      return true;
    }
  } catch (err) {
    console.error("[NOTIFICATIONS]: Falha ao disparar notificação:", err);
  }

  return false;
}

/**
 * Sends a test notification to verify audio, banner and vibration
 */
export async function sendTestNotification(): Promise<boolean> {
  return sendNotification("⏰ Lembrete de Teste - Glyco AI", {
    body: "Suas notificações de medicamentos e insulina estão ativas e funcionando perfeitamente!",
    tag: `test-notification-${Date.now()}`,
  });
}

/**
 * Start the background medication check ticker
 */
export function startMedicationScheduler(config: {
  userId: string;
  getMedications: () => MedicationLog[];
  getInsulinLogs: () => InsulinLog[];
  isEnabled: () => boolean;
  onNotificationTriggered?: (item: { type: "med" | "insulin"; name: string; dose: string | number; time: string }) => void;
}) {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
  }

  // Register SW initially
  registerNotificationServiceWorker();

  const checkSchedule = () => {
    if (!config.isEnabled() || getNotificationPermission() !== "granted") {
      return;
    }

    const now = new Date();
    const currentHours = String(now.getHours()).padStart(2, "0");
    const currentMinutes = String(now.getMinutes()).padStart(2, "0");
    const currentTimeStr = `${currentHours}:${currentMinutes}`;
    const todayDateStr = now.toISOString().split("T")[0];

    // 1. Check Oral Medications
    const meds = config.getMedications();
    for (const med of meds) {
      if (med.status === "aplicado") continue; // already taken
      
      if (med.timeScheduled === currentTimeStr) {
        const dedupKey = `${config.userId}_med_${med.id}_${todayDateStr}_${med.timeScheduled}`;
        if (!isAlreadyNotified(dedupKey)) {
          recordNotificationSent(dedupKey);

          sendNotification(`⏰ Hora do Medicamento: ${med.name}`, {
            body: `Está na hora de tomar ${med.dose} de ${med.name}. Abra o Glyco AI para confirmar a tomada.`,
            tag: `med-${med.id}-${todayDateStr}`,
            medId: med.id,
          });

          config.onNotificationTriggered?.({
            type: "med",
            name: med.name,
            dose: med.dose,
            time: med.timeScheduled,
          });
        }
      }
    }

    // 2. Check Insulin Applications
    const insulins = config.getInsulinLogs();
    for (const ins of insulins) {
      if (ins.status === "aplicado") continue; // already taken

      if (ins.timeScheduled === currentTimeStr) {
        const dedupKey = `${config.userId}_ins_${ins.id}_${todayDateStr}_${ins.timeScheduled}`;
        if (!isAlreadyNotified(dedupKey)) {
          recordNotificationSent(dedupKey);

          const insTitle = ins.customName || `Insulina ${ins.type.replace("_", " ").toUpperCase()}`;
          sendNotification(`💉 Hora da Insulina: ${insTitle}`, {
            body: `Dose programada de ${ins.doseUnits} UI${ins.applicationSite ? ` no ${ins.applicationSite}` : ""}. Registre sua aplicação no Glyco AI.`,
            tag: `ins-${ins.id}-${todayDateStr}`,
            medId: ins.id,
          });

          config.onNotificationTriggered?.({
            type: "insulin",
            name: insTitle,
            dose: `${ins.doseUnits} UI`,
            time: ins.timeScheduled,
          });
        }
      }
    }
  };

  // Run check immediately and every 20 seconds
  checkSchedule();
  schedulerInterval = setInterval(checkSchedule, 20000);

  return () => {
    if (schedulerInterval) {
      clearInterval(schedulerInterval);
      schedulerInterval = null;
    }
  };
}
