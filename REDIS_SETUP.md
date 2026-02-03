# Redis Setup Guide

Redis is required for background job processing (BullMQ). Follow these steps to install and start Redis.

## macOS Installation

### Option 1: Homebrew (Recommended)
```bash
# Install Redis
brew install redis

# Start Redis as a service (starts automatically on boot)
brew services start redis

# Or start Redis manually (for testing)
redis-server
```

### Option 2: Docker
```bash
# Run Redis in Docker container
docker run -d -p 6379:6379 --name redis redis:alpine

# To stop: docker stop redis
# To start: docker start redis
```

## Verify Installation

```bash
# Check if Redis is running
redis-cli ping
# Should return: PONG

# Or check with Homebrew
brew services list | grep redis
```

## Configuration

Add to your `.env` file:
```env
REDIS_URL=redis://localhost:6379
```

## Troubleshooting

### Redis not found
If `brew install redis` fails:
1. Update Homebrew: `brew update`
2. Install: `brew install redis`

### Port already in use
If port 6379 is already in use:
1. Find the process: `lsof -i :6379`
2. Kill it: `kill -9 <PID>`
3. Or use a different port in `.env`: `REDIS_URL=redis://localhost:6380`

### Connection refused
- Make sure Redis is running: `redis-cli ping`
- Check Redis logs: `brew services list` or `docker logs redis`
- Verify the URL in `.env` matches your Redis instance

## Production

For production, use a managed Redis service:
- **Redis Cloud**: https://redis.com/cloud
- **AWS ElastiCache**: https://aws.amazon.com/elasticache/
- **DigitalOcean Managed Redis**: https://www.digitalocean.com/products/managed-databases

Update `REDIS_URL` in production environment variables.
