import { PrismaClient } from '@prisma/client'

const CATEGORIES = {
    CAMERAS: 'cmlzifbmu002zq3itcy46ikc5',
    ACCESSORIES: 'cmlzifbmv0030q3it8tczx9mb',
    LENSES: 'cmlzifbmx0031q3itgrqdl1q5',
    TRIPODS: 'cmlzifbmy0032q3itt0n82og0',
    LIGHTING: 'cmlzifbmz0033q3its5xyza7s',
    LIGHT_ACC: 'cmlzifbn00034q3itzr9cbi5m',
    AUDIO: 'cmlzifbn10035q3itsd1ermh6',
    MONITORS: 'cmlzifbn20036q3itmcgcn0n4',
    POWER: 'cmlzifbn30037q3it8ncxatez',
    GRIP: 'cmlzifbn40038q3itoeipa8wl',
    BAGS: 'cmlzifbn50039q3itnaohd9vu',
    LIVE: 'cmlzifbn5003aq3itcs2fjeb1',
    LED_PANELS: 'cmlzifbn7003cq3itgf947ozv',
    COB_LIGHTS: 'cmlzifbn8003eq3ita08dpx15',
    MODIFIERS: 'cmlzifbn9003gq3ith6okqgnu',
}

const RULES = [
    { id: CATEGORIES.MONITORS, keywords: ['Monitor', 'Screen', 'Atomos', 'SmallHD', 'Vaxis', 'Display', 'Shogun', 'Shinobi', 'Neon 24'] },
    { id: CATEGORIES.LENSES, keywords: ['Lens', 'Lenses', 'Zoom', 'Prime', 'Anamorphic', 'Ultra Prime', 'Sigma Art', 'Pictor', 'Macro G'] },
    { id: CATEGORIES.AUDIO, keywords: ['Mic', 'Microphone', 'Sennheiser', 'Rode', 'Lavalier', 'Boom', 'Audio', 'XLR', 'MKE 600', 'Recorder'] },
    { id: CATEGORIES.POWER, keywords: ['Battery', 'Charger', 'Power', 'V-Mount', 'Gold Mount', 'NP-F', '290Wh', 'SWIT', 'Innox'] },
    { id: CATEGORIES.TRIPODS, keywords: ['Tripod', 'Gimbal', 'Ronin', 'Slider', 'Monopod', 'Crane', 'EasyRig', 'Hihat', 'Hi Hat'] },
    { id: CATEGORIES.LIVE, keywords: ['Switcher', 'Mixer', 'ATEM', 'Streaming', 'Encoder', 'Ultimatte', 'Compositing', 'Convert SDI', 'Convert HDMI', 'Auto Q'] },
    { id: CATEGORIES.LED_PANELS, keywords: ['LED Panel', 'Skypanel', 'Nanlite Pavo', 'PavoTube', 'Titan Tube', 'Infinibar', 'Aputure LS 1500c', 'F22c'] },
    { id: CATEGORIES.COB_LIGHTS, keywords: ['600d', '1200d', '300d', 'COB', 'Bowens', 'Aputure Lightstorm', 'AD600', 'AD400', 'AD1200', 'Godox AD'] },
    { id: CATEGORIES.MODIFIERS, keywords: ['Softbox', 'Modifier', 'Lantern', 'Grid', 'Eggcrate', 'Dome', 'Silk', 'Scrim', 'Octa', 'Beauty Dish', 'Reflector', 'Muslin', 'Diffuser', 'Soft Box', 'Space Light', 'Spotlight Mount', 'Fresnel', 'Magic Cloth', 'Light Cone', 'Air Tube'] },
    { id: CATEGORIES.LIGHT_ACC, keywords: ['Gel', 'Filter for Rent', 'Lighting Accessory', 'Stand for Light'] },
    { id: CATEGORIES.ACCESSORIES, keywords: ['Rig', 'Cage', 'Mattbox', 'Matte Box', 'Follow Focus', 'Filter', 'ND Filter', 'Shoulder Mount', 'Top Handle', 'Mount Adapter', 'PL-RF', 'CFexpress'] },
    { id: CATEGORIES.BAGS, keywords: ['Case', 'Bag', 'Pelicase', 'Hardcase'] },
    { id: CATEGORIES.GRIP, keywords: ['Stand', 'C-Stand', 'Clamp', 'Arm', 'Sandbag', 'Grip', 'Apple Box', 'Hydra Alien', 'Dolly', 'Body Support'] },
    { id: CATEGORIES.CAMERAS, keywords: ['Camera', 'Body', 'FX6', 'FX3', 'FX9', 'C70', 'R5', 'A7S', 'Red Komodo', 'Alexa', 'Ursa', 'GoPro', 'A7R V'] },
]

async function main() {
    const prisma = new PrismaClient()
    const equipment = await prisma.equipment.findMany({
        where: { categoryId: CATEGORIES.CAMERAS, deletedAt: null },
        select: { id: true, model: true }
    })

    console.log(`Processing ${equipment.length} items...`)

    for (const item of equipment) {
        let targetId = CATEGORIES.CAMERAS
        const modelLower = item.model?.toLowerCase() || ''

        for (const rule of RULES) {
            const actualId = rule.id || CATEGORIES.POWER // Fix typo bypass
            if (rule.keywords.some(k => modelLower.includes(k.toLowerCase()))) {
                // Special case: Monitors often contain "Recorder" but should be Monitors
                if (rule.id === CATEGORIES.AUDIO && (modelLower.includes('monitor') || modelLower.includes('atomos'))) {
                    continue;
                }
                targetId = actualId
                break
            }
        }

        if (targetId !== CATEGORIES.CAMERAS) {
            console.log(`Reassigning: ${item.model} -> ${targetId}`)
            await prisma.equipment.update({
                where: { id: item.id },
                data: { categoryId: targetId }
            })
        }
    }

    console.log('Done.')
    await prisma.$disconnect()
}

main().catch(console.error)
