import { getRedisClient } from '../src/lib/queue/redis.client'

async function main() {
    const redis = getRedisClient()

    console.log('Connecting to Redis...')

    if (redis.status !== 'ready') {
        await new Promise((resolve, reject) => {
            redis.once('ready', resolve)
            redis.once('error', reject)
            // Timeout after 5s
            setTimeout(() => reject(new Error('Redis connection timeout')), 5000)
        })
    }

    console.log('Redis connected.')

    const keys = await redis.keys('cache:equipmentList:*')
    console.log(`Found ${keys.length} equipmentList keys to delete.`)

    if (keys.length > 0) {
        await redis.del(...keys)
        console.log('Deleted equipmentList keys.')
    }

    const homeKeys = await redis.keys('cache:public-home-*')
    console.log(`Found ${homeKeys.length} home keys to delete.`)
    if (homeKeys.length > 0) {
        await redis.del(...homeKeys)
        console.log('Deleted home keys.')
    }

    process.exit(0)
}

main().catch(err => {
    console.error(err)
    process.exit(1)
})
