import { PrismaClient } from '@prisma/client'

const CATEGORIES = [
    { id: 'cmlzifbmu002zq3itcy46ikc5', name: 'Cameras' },
    { id: 'cmlzifbmv0030q3it8tczx9mb', name: 'Camera Accessories' },
    { id: 'cmlzifbmx0031q3itgrqdl1q5', name: 'Lenses' },
    { id: 'cmlzifbmy0032q3itt0n82og0', name: 'Tripods & Gimbals' },
    { id: 'cmlzifbmz0033q3its5xyza7s', name: 'Lighting' },
    { id: 'cmlzifbn00034q3itzr9cbi5m', name: 'Light Accessories' },
    { id: 'cmlzifbn10035q3itsd1ermh6', name: 'Audio' },
    { id: 'cmlzifbn20036q3itmcgcn0n4', name: 'Monitors' },
    { id: 'cmlzifbn30037q3it8ncxatez', name: 'Batteries & Power' },
    { id: 'cmlzifbn40038q3itoeipa8wl', name: 'Grip & Support' },
    { id: 'cmlzifbn50039q3itnaohd9vu', name: 'Cases & Bags' },
    { id: 'cmlzifbn5003aq3itcs2fjeb1', name: 'Live & Mixing' },
    { id: 'cmlzifbn7003cq3itgf947ozv', name: 'LED Panels' },
    { id: 'cmlzifbn8003eq3ita08dpx15', name: 'COB Lights' },
    { id: 'cmlzifbn9003gq3ith6okqgnu', name: 'Softboxes & Modifiers' },
]

const RULES = [
    { cat: 'Lenses', keywords: ['Lens', 'Lenses', 'Zoom', 'Prime', 'Anamorphic'] },
    { cat: 'Audio', keywords: ['Mic', 'Microphone', 'Recorder', 'Audio', 'Sennheiser', 'Rode', 'Zoom H'] },
    { cat: 'Monitors', keywords: ['Monitor', 'Screen', 'Atomos', 'SmallHD', 'TV', 'Display'] },
    { cat: 'Tripods & Gimbals', keywords: ['Tripod', 'Gimbal', 'Ronin', 'Slider', 'Monopod', 'Crane', 'EasyRig'] },
    { cat: 'Batteries & Power', keywords: ['Battery', 'Charger', 'Power', 'V-Mount', 'Gold Mount', 'Adapter', 'Cable'] },
    { cat: 'Lighting', keywords: ['Light', 'LED', 'Flash', 'Aputure', 'Nanlite', 'NanLux', 'Arri Skypanel', 'Softbox'] },
    { cat: 'LED Panels', keywords: ['LED Panel', 'Skypanel', 'Nanlite Pavo', 'PavoTube'] },
    { cat: 'COB Lights', keywords: ['600d', '1200d', '300d', 'COB', 'Bowens'] },
    { cat: 'Live & Mixing', keywords: ['Switcher', 'Mixer', 'ATEM', 'Streaming', 'Encoder', 'Blackmagic Design Ultimatte'] },
    { cat: 'Cases & Bags', keywords: ['Case', 'Bag', 'Pelicase', 'Hardcase'] },
    { cat: 'Camera Accessories', keywords: ['Rig', 'Cage', 'Mattbox', 'Follow Focus', 'Filter', 'ND Filter', 'Shoulder Mount', 'Top Handle'] },
    { cat: 'Grip & Support', keywords: ['Stand', 'C-Stand', 'Clamp', 'Arm', 'Sandbag', 'Grip'] },
    { cat: 'Cameras', keywords: ['Camera', 'Body', 'FX6', 'FX3', 'FX9', 'C70', 'R5', 'A7S', 'Red Komodo', 'Alexa', 'Ursa'] },
]

async function main() {
    const prisma = new PrismaClient()
    const equipment = await prisma.equipment.findMany({
        where: { categoryId: 'cmlzifbmu002zq3itcy46ikc5', deletedAt: null },
        select: { id: true, model: true }
    })

    console.log(`Auditing ${equipment.length} items currently in "Cameras"...`)

    const mapping: Record<string, typeof equipment> = {}
    CATEGORIES.forEach(c => mapping[c.name] = [])

    equipment.forEach(item => {
        let found = false
        const modelLower = item.model?.toLowerCase() || ''

        // Check specific rules
        for (const rule of RULES) {
            if (rule.keywords.some(k => modelLower.includes(k.toLowerCase()))) {
                mapping[rule.cat].push(item)
                found = true
                break
            }
        }

        if (!found) {
            mapping['Cameras'].push(item) // Fallback
        }
    })

    Object.entries(mapping).forEach(([cat, items]) => {
        if (items.length > 0) {
            console.log(`\n--- Proposed for ${cat} (${items.length} items) ---`)
            items.forEach(i => console.log(`  - ${i.model}`))
        }
    })

    await prisma.$disconnect()
}

main().catch(console.error)
