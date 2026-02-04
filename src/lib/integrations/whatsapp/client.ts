/**
 * @file whatsapp/client.ts
 * @description WhatsApp Business API client for sending template messages
 *              to clients (booking confirmations, payment reminders, etc.).
 * @module integrations/whatsapp
 * @see /docs/features/notifications/WHATSAPP.md
 * @author Engineering Team
 * @created 2026-01-28
 */

export interface WhatsAppTemplateParams {
  to: string
  templateName: string
  language: string
  parameters: string[]
}

export interface WhatsAppMessageResponse {
  messaging_product: string
  contacts: Array<{
    input: string
    wa_id: string
  }>
  messages: Array<{
    id: string
  }>
}

export interface WhatsAppError {
  error: {
    message: string
    type: string
    code: number
    error_subcode?: number
    fbtrace_id?: string
  }
}

/**
 * WhatsAppClient - Handles all interactions with WhatsApp Business API
 */
export class WhatsAppClient {
  private accessToken: string
  private phoneNumberId: string
  private baseUrl: string

  constructor(accessToken: string, phoneNumberId: string) {
    this.accessToken = accessToken
    this.phoneNumberId = phoneNumberId
    this.baseUrl = 'https://graph.facebook.com/v18.0'
  }

  /**
   * Send a template message
   * @param params - Template message parameters
   * @returns Message response
   */
  async sendTemplate(
    params: WhatsAppTemplateParams
  ): Promise<WhatsAppMessageResponse> {
    try {
      const response = await fetch(
        `${this.baseUrl}/${this.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: params.to,
            type: 'template',
            template: {
              name: params.templateName,
              language: { code: params.language },
              components: [
                {
                  type: 'body',
                  parameters: params.parameters.map((param) => ({
                    type: 'text',
                    text: param,
                  })),
                },
              ],
            },
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        const error = data as WhatsAppError
        throw new Error(
          `WhatsApp API error: ${error.error.message} (Code: ${error.error.code})`
        )
      }

      return data as WhatsAppMessageResponse
    } catch (error: any) {
      if (error instanceof Error) {
        throw error
      }
      throw new Error(`Failed to send WhatsApp message: ${error.message}`)
    }
  }

  /**
   * Send booking confirmation message
   * @param phoneNumber - Client phone number
   * @param bookingNumber - Booking number
   * @param startDate - Booking start date
   * @param totalAmount - Total booking amount
   * @param language - Language code (ar or en)
   */
  async sendBookingConfirmation(
    phoneNumber: string,
    bookingNumber: string,
    startDate: string,
    totalAmount: string,
    language: 'ar' | 'en' = 'ar'
  ): Promise<WhatsAppMessageResponse> {
    const templateName = language === 'ar' 
      ? 'booking_confirmation_ar' 
      : 'booking_confirmation_en'

    return this.sendTemplate({
      to: phoneNumber,
      templateName,
      language,
      parameters: [bookingNumber, startDate, totalAmount],
    })
  }

  /**
   * Send payment reminder message
   * @param phoneNumber - Client phone number
   * @param bookingNumber - Booking number
   * @param amount - Payment amount
   * @param dueDate - Payment due date
   * @param language - Language code (ar or en)
   */
  async sendPaymentReminder(
    phoneNumber: string,
    bookingNumber: string,
    amount: string,
    dueDate: string,
    language: 'ar' | 'en' = 'ar'
  ): Promise<WhatsAppMessageResponse> {
    const templateName = language === 'ar' 
      ? 'payment_reminder_ar' 
      : 'payment_reminder_en'

    return this.sendTemplate({
      to: phoneNumber,
      templateName,
      language,
      parameters: [bookingNumber, amount, dueDate],
    })
  }

  /**
   * Send return reminder message
   * @param phoneNumber - Client phone number
   * @param bookingNumber - Booking number
   * @param returnDate - Return date
   * @param language - Language code (ar or en)
   */
  async sendReturnReminder(
    phoneNumber: string,
    bookingNumber: string,
    returnDate: string,
    language: 'ar' | 'en' = 'ar'
  ): Promise<WhatsAppMessageResponse> {
    const templateName = language === 'ar' 
      ? 'return_reminder_ar' 
      : 'return_reminder_en'

    return this.sendTemplate({
      to: phoneNumber,
      templateName,
      language,
      parameters: [bookingNumber, returnDate],
    })
  }

  /**
   * Validate phone number format
   * @param phoneNumber - Phone number to validate
   * @returns True if valid
   */
  static validatePhoneNumber(phoneNumber: string): boolean {
    // Remove all non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '')
    
    // Check if it's a valid international format (with country code)
    // Saudi Arabia: +966XXXXXXXXX (12 digits total)
    // International: 1-15 digits
    return cleaned.length >= 10 && cleaned.length <= 15
  }

  /**
   * Format phone number for WhatsApp (E.164 format)
   * @param phoneNumber - Phone number to format
   * @returns Formatted phone number
   */
  static formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, '')
    
    // If it starts with 0 (Saudi local format), remove the 0
    if (cleaned.startsWith('0') && cleaned.length === 10) {
      cleaned = cleaned.substring(1)
    }
    
    // If it doesn't start with country code, assume Saudi Arabia (+966)
    if (!cleaned.startsWith('966') && cleaned.length === 9) {
      return `966${cleaned}`
    }
    
    // If it already has country code, return as is
    if (cleaned.startsWith('966')) {
      return cleaned
    }
    
    return cleaned
  }
}
