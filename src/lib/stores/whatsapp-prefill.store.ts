import { create } from 'zustand'

interface WhatsAppPrefillState {
  messageOverride: string | null
  setMessageOverride: (message: string | null) => void
}

export const useWhatsAppPrefillStore = create<WhatsAppPrefillState>((set) => ({
  messageOverride: null,
  setMessageOverride: (message) => set({ messageOverride: message }),
}))
