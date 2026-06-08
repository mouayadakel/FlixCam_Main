/**
 * @file damage-analysis.service.ts
 * @description AI-powered damage detection comparing checkout and check-in photos.
 * @module lib/services
 */

import { prisma } from '@/lib/db/prisma'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { NotFoundError } from '@/lib/errors'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export class DamageAnalysisService {
  /**
   * Analyze potential damage by comparing before/after photos using Gemini Vision.
   */
  static async analyzeDamage(
    checkoutPhotoUrls: string[],
    checkinPhotoUrls: string[]
  ) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured')
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' })

    const prompt = `
      You are a professional cinema equipment inspector. 
      Compare the "BEFORE" (checkout) photos and "AFTER" (check-in) photos of this high-end cinema gear.
      Look for: 
      1. Scratches on lens glass or sensor.
      2. Dents, cracks, or heavy abrasions on the chassis.
      3. Missing components (caps, knobs, screws, cables).
      4. Any physical changes that aren't normal professional wear.

      Return a JSON object with:
      - damageDetected: boolean
      - confidence: number (0.0 to 1.0)
      - findings: string (Arabic detailed description of issues)
      - severity: "MINOR" | "MODERATE" | "SEVERE" | "TOTAL_LOSS"
      - estimatedRepairCategory: "CLEANING" | "REPAIR" | "REPLACEMENT"
      - highlights: Array<{ x: number, y: number, label: string }> // Rough coordinates if possible
    `

    try {
      // Helper to fetch and convert URLs to generative parts
      const photoParts = await Promise.all([
        ...checkoutPhotoUrls.map(url => this.urlToGenerativePart(url, 'BEFORE')),
        ...checkinPhotoUrls.map(url => this.urlToGenerativePart(url, 'AFTER'))
      ])

      const result = await model.generateContent([prompt, ...photoParts])
      const response = await result.response
      const text = response.text()
      
      // Clean up markdown code blocks if AI returns them
      const jsonStr = text.replace(/```json|```/g, '').trim()
      return JSON.parse(jsonStr)
    } catch (error) {
      console.error('Gemini Vision Error:', error)
      return {
        damageDetected: false,
        error: 'فشل تحليل الذكاء الاصطناعي حالياً',
        confidence: 0
      }
    }
  }

  private static async urlToGenerativePart(url: string, label: string) {
    const response = await fetch(url)
    const buffer = await response.arrayBuffer()
    return {
      inlineData: {
        data: Buffer.from(buffer).toString('base64'),
        mimeType: 'image/jpeg' // Assume jpeg for now, could be dynamic
      }
    }
  }

  /**
   * Trigger AI analysis for an existing claim
   */
  static async triggerAnalysis(claimId: string) {
    const claim = await (prisma as any).damageClaim.findUnique({
      where: { id: claimId },
      select: { checkoutPhotos: true, checkinPhotos: true }
    })

    if (!claim) throw new NotFoundError('DamageClaim', claimId)

    const analysis = await this.analyzeDamage(
      (claim.checkoutPhotos as string[]) || [],
      (claim.checkinPhotos as string[]) || []
    )

    return (prisma as any).damageClaim.update({
      where: { id: claimId },
      data: { aiAnalysis: analysis }
    })
  }
}
