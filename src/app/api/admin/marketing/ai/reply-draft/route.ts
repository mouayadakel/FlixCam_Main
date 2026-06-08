import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { auth } from '@/lib/auth'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { eventId, leadName, leadMessage } = await req.json()
    if (!eventId && !leadMessage) return NextResponse.json({ error: 'Missing Data' }, { status: 400 })

    let context = ""

    if (eventId) {
      // 1. Fetch Event & Related Data
      const event = await prisma.marketingEvent.findUnique({
        where: { id: eventId }
      })
      if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

      const metadata = (event.metadata as any) || {}
      const entityId = event.entityId
      const entityType = event.entityType

      context = `User Action: ${event.eventType}\n`
      if (metadata.utm_source) context += `Source: ${metadata.utm_source}\n`
      
      // Attempt to get entity name for context
      if (entityId) {
        if (entityType === 'Equipment') {
          const product = await prisma.productTranslation.findFirst({
            where: { productId: entityId, locale: 'ar' }
          })
          if (product) context += `Product Interest: ${product.name}\n`
        } else if (entityType === 'Studio') {
          const studio = await prisma.studio.findUnique({
            where: { id: entityId }
          })
          if (studio) context += `Studio Interest: ${studio.name}\n`
        }
      }
    } else {
      context = `Lead Name: ${leadName || 'Unknown'}\nDetails: ${leadMessage}`
    }

    // 2. AI Generate Draft
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'AI API Key not configured' }, { status: 500 })

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const prompt = `You are a sales assistant for FlixCam (Premium Cinema Rental in KSA).
Draft a friendly and professional WhatsApp follow-up message in Arabic for this potential lead.
CONTEXT:
${context}

GOAL:
Encourage them to complete their booking or ask if they need help with technical specifications.
The tone should be upscale, helpful, and not pushy.

OUTPUT: 
Return ONLY the text of the message.`

    const result = await model.generateContent(prompt)
    const draft = result.response.text().trim()

    return NextResponse.json({ draft })
  } catch (error: any) {
    console.error('AI Draft failed:', error)
    return NextResponse.json({ error: 'Failed to generate draft' }, { status: 500 })
  }
}
