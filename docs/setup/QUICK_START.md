# Quick Start Guide - Bulk Import System

## ✅ Prerequisites Check

1. **Redis is Running** ✅

   ```bash
   redis-cli ping
   # Should return: PONG
   ```

2. **Environment Variables** ✅
   - `.env` file has been updated with required variables
   - Update the placeholder values with your actual credentials:
     - `CLOUDINARY_CLOUD_NAME`
     - `CLOUDINARY_API_KEY`
     - `CLOUDINARY_API_SECRET`
     - `OPENAI_API_KEY` (or `GEMINI_API_KEY`)

## 🚀 Starting the System

### Step 1: Start Redis (if not already running)

```bash
brew services start redis
# Or check status: brew services list | grep redis
```

### Step 2: Start Background Workers

Open a **new terminal window** and run:

```bash
cd "/Users/mohammedalakel/Desktop/Website Final/FlixCam.rent"
npm run worker:all
```

You should see:

```
Starting background workers...
✓ Import worker started
✓ AI processing worker started
✓ Image processing worker started

All workers are running. Press Ctrl+C to stop.
```

**Keep this terminal open** - workers need to run continuously.

### Step 3: Start Development Server

In your **main terminal**, run:

```bash
cd "/Users/mohammedalakel/Desktop/Website Final/FlixCam.rent"
npm run dev
```

## 🧪 Testing the Import

1. Navigate to: `http://localhost:3000/admin/inventory/import`
2. Upload an Excel file (`.xlsx` or `.csv`)
3. Map sheets to categories
4. (Optional) Select specific rows to import
5. (Optional) Click "Preview AI" to see AI suggestions
6. Click "Start Import"
7. Monitor progress in real-time

## 📝 Important Notes

- **Workers must be running** for background processing (AI, images)
- **Import will work** even without AI/image credentials, but those features will be skipped
- **Redis must be running** for job queues to work
- Use **quoted paths** when `cd`-ing due to spaces in directory name

## 🔧 Troubleshooting

### "Cannot find module" errors

```bash
npm install
```

### Redis connection errors

```bash
# Check Redis is running
redis-cli ping

# Start Redis if needed
brew services start redis
```

### Workers not processing jobs

- Make sure workers are running (`npm run worker:all`)
- Check Redis connection: `redis-cli ping`
- Verify `.env` has `REDIS_URL=redis://localhost:6379`

### Import works but AI/images don't process

- Check AI provider credentials in `.env`
- Check Cloudinary credentials in `.env`
- Workers will log errors if credentials are missing

## 📚 Documentation

- `REDIS_SETUP.md` - Redis installation guide
- `IMPLEMENTATION_VERIFICATION.md` - Complete feature checklist
- `IMPLEMENTATION_COMPLETE.md` - Detailed implementation status
