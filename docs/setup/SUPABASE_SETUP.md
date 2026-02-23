# Supabase Setup Guide

**Date**: January 27, 2026  
**Status**: Setup Required

## Overview

This guide will help you set up Supabase for the FlixCam.rent project. Supabase will be used for:

- Authentication (replacing NextAuth)
- Database (PostgreSQL with Row Level Security)
- Storage (for equipment images, contracts, etc.)
- Realtime subscriptions (for live updates)

---

## Step 1: Create Supabase Project

1. Go to https://supabase.com
2. Sign up or log in
3. Click "New Project"
4. Fill in the details:
   - **Name**: `flixcam-rent`
   - **Database Password**: Generate a strong password (save it!)
   - **Region**: Choose closest to Saudi Arabia (e.g., `ap-southeast-1`)
   - **Pricing Plan**: Free tier is fine for development
5. Click "Create new project"
6. Wait 2-3 minutes for project to initialize

---

## Step 2: Get API Keys

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)
   - **service_role key** (starts with `eyJ...`) - **KEEP THIS SECRET!**

---

## Step 3: Run Database Schema

1. In Supabase dashboard, go to **SQL Editor**
2. Click "New query"
3. Copy the contents of `supabase/schema.sql` (we'll create this next)
4. Paste into the SQL Editor
5. Click "Run" (or press Cmd/Ctrl + Enter)
6. Verify all tables are created (should see 60+ tables)

---

## Step 4: Enable Row Level Security (RLS)

After running the schema, enable RLS on all tables:

```sql
-- Enable RLS on all tables
ALTER TABLE equipment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
-- ... (add for all tables)
```

**Note**: We'll create RLS policies in the next step.

---

## Step 5: Create RLS Policies

Run the RLS policies from `supabase/rls-policies.sql` (we'll create this).

These policies will:

- Allow authenticated users to read their own data
- Allow admins to read/write all data
- Restrict access based on user roles

---

## Step 6: Configure Environment Variables

1. Copy `.env.example` to `.env.local`:

   ```bash
   cp .env.example .env.local
   ```

2. Add your Supabase credentials to `.env.local`:

   ```env
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

3. **Never commit `.env.local` to git!**

---

## Step 7: Create Storage Buckets

1. In Supabase dashboard, go to **Storage**
2. Create the following buckets:
   - `equipment-images` (public)
   - `contracts` (private)
   - `invoices` (private)
   - `user-documents` (private)

3. Set bucket policies (we'll create these in the SQL file)

---

## Step 8: Create Initial Admin User

1. In Supabase dashboard, go to **Authentication** → **Users**
2. Click "Add user" → "Create new user"
3. Fill in:
   - **Email**: `admin@flixcam.rent`
   - **Password**: (set a strong password)
   - **Auto Confirm User**: ✅ (check this)
4. Click "Create user"
5. Note the user ID (UUID)

6. In SQL Editor, run:
   ```sql
   -- Assign super_admin role to the user
   INSERT INTO user_roles (user_id, role_id)
   SELECT
     'USER_UUID_HERE', -- Replace with actual user ID
     id
   FROM roles
   WHERE name = 'super_admin';
   ```

---

## Step 9: Verify Setup

1. Test connection:

   ```bash
   npm run dev
   ```

2. Visit `http://localhost:3000/login`
3. Try logging in with the admin user you created
4. Check browser console for any errors

---

## Troubleshooting

### "Invalid API key"

- Double-check your `.env.local` file
- Make sure you copied the full key (they're long!)
- Restart your dev server after changing `.env.local`

### "Table does not exist"

- Make sure you ran the schema SQL file completely
- Check SQL Editor for any errors
- Verify tables exist in **Table Editor**

### "RLS policy violation"

- Make sure RLS policies are created
- Check user role assignments
- Verify user is authenticated

### "Connection refused"

- Check your Supabase project is active (not paused)
- Verify the project URL is correct
- Check your internet connection

---

## Next Steps

After Supabase is set up:

1. ✅ Phase 0 is complete
2. ⏭️ Proceed to Phase 1: Authentication & RBAC
3. Test login/logout functionality
4. Test middleware with different roles

---

## Support

- Supabase Docs: https://supabase.com/docs
- Supabase Discord: https://discord.supabase.com
- Project Issues: Check `docs/` folder for more documentation
