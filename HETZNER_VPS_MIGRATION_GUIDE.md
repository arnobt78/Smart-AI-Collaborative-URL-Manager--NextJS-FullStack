# 🚀 Complete Hetzner VPS Migration Guide

## MongoDB, PostgreSQL & Backend Migration from Free Tiers to Self-Hosted VPS

---

## 🤖 QUICK REFERENCE FOR AI ASSISTANTS / DEVELOPERS

**When this file is attached to a new project, here's what you need to know immediately:**

### 🎯 What This Guide Is For

This guide documents the migration from free-tier database services (NeonDB, MongoDB Atlas, Supabase) and backend hosting (Render) to a self-hosted Hetzner VPS running PostgreSQL, MongoDB, and backends via Coolify. It provides step-by-step instructions for:

- Setting up the VPS infrastructure
- Migrating Next.js projects (Drizzle ORM)
- Migrating Prisma projects
- Migrating .NET/C# ASP.NET Core backends
- Database creation and data migration patterns
- Backend deployment to Coolify
- Security configurations
- Backup strategies

### 🖥️ Current Infrastructure Setup

**VPS Server:**

- **IP Address:** `77.42.71.87`
- **Location:** Helsinki (hel1), Finland
- **OS:** Ubuntu 24.04 LTS
- **SSH User:** `deploy` (with sudo privileges)
- **SSH Command:** `ssh deploy@77.42.71.87`
- **Coolify UI:** `http://77.42.71.87:8000`

**PostgreSQL Container:**

- **Container Name:** `xok0c8w8808g8080og4gccwc`
- **Image:** `postgres:17-alpine`
- **Internal Port:** `5432` (Docker network only)
- **Exposed Port (Vercel):** `25432` (for external access from Vercel/Netlify)
- **Resource Limits:** 2GB RAM
- **Status:** ✅ Running and healthy

**MongoDB Container:**

- **Container Name:** `t08sgc800wo08co48480ksgw`
- **Image:** `mongo:7`
- **Internal Port:** `27017` (Docker network only)
- **Exposed Port (Vercel):** `25433` (for external access from Vercel/Netlify)
- **Resource Limits:** 2GB RAM
- **Status:** ✅ Running and healthy

### 📝 Connection String Patterns

**For Vercel/Netlify Frontends (Production):**

```bash
DATABASE_URL="postgresql://username:password@77.42.71.87:25432/database_name"
DIRECT_URL="postgresql://username:password@77.42.71.87:25432/database_name"
```

**For Coolify Deployments (Internal):**

```bash
DATABASE_URL="postgresql://username:password@xok0c8w8808g8080og4gccwc:5432/database_name"
DIRECT_URL="postgresql://username:password@xok0c8w8808g8080og4gccwc:5432/database_name"
```

**MongoDB Connection (For Vercel/Netlify Frontends - Production):**

```bash
DATABASE_URL="mongodb://username:password@77.42.71.87:25433/database_name?authSource=database_name&replicaSet=rs0"
```

**MongoDB Connection (For Coolify Deployments - Internal):**

```bash
DATABASE_URL="mongodb://username:password@t08sgc800wo08co48480ksgw:27017/database_name?authSource=database_name&replicaSet=rs0"
```

**⚠️ Important:** Prisma requires MongoDB to be configured as a replica set. Ensure you've completed the replica set configuration steps (see Prisma MongoDB Migration section).

### 🗄️ Database Naming Conventions

**Pattern:** `{project_name}_db` and `{project_name}_user`

**Examples:**

- Project: `job-tracker` → Database: `job_tracker_db`, User: `job_tracker_user`
- Project: `next-store` → Database: `next_store_db`, User: `next_store_user`
- Project: `multi-ai-chatbot` → Database: `multi_ai_chatbot_db`, User: `multi_ai_chatbot_user`
- Project: `lama-blog` → Database: `lama_blog_db`, User: `lama_blog_user`

**Password Convention:** Usually follows pattern `mIst20081400XX` (where XX is project-specific)

### 🔧 Common Migration Patterns

**1. Prisma Projects (PostgreSQL):**

- Use `prisma db push` (NOT `migrate dev`) - avoids shadow database requirement
- Update `.env` with Hetzner VPS connection strings
- Run `prisma generate` then `prisma db push`
- Create seed script for CSV data migration if needed

**1b. Prisma Projects (MongoDB):**

- Use `prisma db push` (no migrations needed for MongoDB)
- Update `.env` from `mongodb+srv://...` to `mongodb://...`
- Expose MongoDB port `25433` in Coolify
- Create database and user in MongoDB container
- Run `prisma generate` then `prisma db push`

**2. Next.js/Drizzle Projects:**

- Replace `@neondatabase/serverless` with `pg` package
- Replace `drizzle-orm/neon-http` with `drizzle-orm/node-postgres`
- Add `export const runtime = "nodejs"` to all API routes using database
- Use lazy imports in `auth.ts` if middleware uses database

**3. CSV Data Migration:**

- Create `prisma/seed.ts` (for Prisma) or `database/migrate-from-csv.ts` (for Drizzle)
- Use `csv-parse` package for parsing
- Use `upsert` pattern for idempotent migrations
- Install `tsx` as dev dependency for running TypeScript seed scripts

### 📁 Key Files and Locations

**Database Connection:**

- Prisma: `utils/db.ts` or `lib/db.ts` (PrismaClient singleton)
- Drizzle: `database/drizzle.ts` or `lib/db.ts` (Pool + drizzle instance)

**Server Actions:**

- Location: `utils/actions.ts` (Next.js Server Actions with "use server")
- Pattern: All actions call `authenticateAndRedirect()` for security

**Environment Variables:**

- Local: `.env` or `.env.local`
- Vercel: Dashboard → Settings → Environment Variables
- Always update both `DATABASE_URL` and `DIRECT_URL` (for Prisma)

**Seed Scripts:**

- Prisma: `prisma/seed.ts`
- Drizzle: `database/migrate-from-csv.ts` or `database/seed.ts`
- Run with: `npm run db:seed` or `tsx prisma/seed.ts`

### 🔐 Security Notes

- **PostgreSQL Port 25432:** Exposed for Vercel access, protected by password authentication
- **Database Ports (5432, 27017):** Internal Docker network only, NOT publicly exposed
- **User Isolation:** Each project has its own database and user (not shared)
- **Firewall:** Hetzner Cloud Firewall + UFW (defense in depth)
- **Backups:** Automated daily backups at 2 AM (PostgreSQL), keeps last 7 days

### ⚠️ Common Issues and Solutions

**1. Prisma Shadow Database Error:**

- **Solution:** Use `prisma db push` instead of `prisma migrate dev`
- **Reason:** User doesn't have CREATEDB permission

**2. Next.js Edge Runtime Error:**

- **Error:** "The edge runtime does not support Node.js 'crypto' module"
- **Solution:**
  - Add `export const runtime = "nodejs"` to API routes
  - Use lazy imports in `auth.ts` for middleware

**3. Permission Denied for Schema:**

- **Solution:** Grant schema privileges (see Prisma migration section)
- **SQL:** `GRANT ALL ON SCHEMA public TO username;`

**4. Connection Timeout:**

- **Check:** Firewall rules (Hetzner + UFW)
- **Check:** Port exposure (25432 for Vercel, 5432 for internal)
- **Check:** Database container is running

### 🚀 Quick Migration Checklist

For a new project migration:

1. ✅ **Identify Project Type** (Prisma or Drizzle/Next.js)
2. ✅ **SSH to VPS:** `ssh deploy@77.42.71.87`
3. ✅ **Create Database:** Connect to PostgreSQL container and create DB + user
4. ✅ **Grant Privileges:** Run schema privilege grants (important for Prisma)
5. ✅ **Update .env:** Add Hetzner VPS connection strings
6. ✅ **Update Code:**
   - Prisma: No code changes needed (just connection string)
   - Drizzle: Update driver imports and add runtime configs
7. ✅ **Run Migration:**
   - Prisma: `prisma generate` → `prisma db push`
   - Drizzle: `npx drizzle-kit push`
8. ✅ **Migrate Data:** Run seed script if CSV data exists
9. ✅ **Update Vercel:** Add environment variables in Vercel dashboard
10. ✅ **Test:** Verify locally and in production

### 📊 Current Projects on VPS

**Migrated Projects:**

- `daily_urlist_db` - Prisma project (URL list management)
- `university_library_db` - Drizzle/Next.js project (library management)
- `multi_ai_chatbot_db` - Prisma project (AI chatbot analytics)
- `next_store_db` - Prisma project (e-commerce platform)
- `recipe_spoonacular_db` - Prisma project (recipe management)
- `job_tracker_db` - Prisma project (job application tracker - Next.js 14+, Clerk, React Query)
- `motor_engine_db` - .NET/C# ASP.NET Core backend (motor monitoring system - December 26, 2025)

**Project Details:**

- All projects use the same PostgreSQL container (`xok0c8w8808g8080og4gccwc`)
- Each project has its own database and dedicated user
- Frontends deployed on Vercel/Netlify, databases on Hetzner VPS
- Backends deployed on Hetzner VPS via Coolify (avoiding Render cold starts)
- PostgreSQL port 25432 exposed for Vercel/Netlify access (password-protected)

**All projects share the same PostgreSQL container** - each has its own database.

### 🔗 Important Links

- **Hetzner Cloud Console:** <https://console.hetzner.cloud>
- **Coolify UI:** <http://77.42.71.87:8000>
- **Author Portfolio:** <https://arnob-mahmud.vercel.app/>

### 📚 Documentation Sections

- **Quick Start:** Section 2 - For immediate migration steps
- **Prisma Migration:** Section 8 - Detailed Prisma-specific instructions
- **Next.js Migration:** Section 7 - Drizzle/Next.js specific instructions
- **.NET Backend Deployment:** Section 9.5 - ASP.NET Core backend deployment to Coolify
- **Troubleshooting:** End of document - Common issues and solutions

### 🎨 Project-Specific Patterns

**Job Tracker Project (job-tracker):**

- **Tech Stack:** Next.js 14.2.35, TypeScript, Prisma, Clerk, React Query, PostgreSQL
- **Database:** `job_tracker_db` / `job_tracker_user`
- **Password:** `mIst2008140013`
- **Models:** Job, Task, Tour, Token
- **Features:** CRUD operations, search/filter, pagination, stats dashboard, CSV/Excel export
- **Seed Data:** 255 jobs migrated from CSV
- **Connection:** Vercel frontend → Hetzner VPS PostgreSQL (port 25432)

**Common Patterns Across Projects:**

- All use Prisma ORM with `prisma db push` (no migrations)
- All have seed scripts in `prisma/seed.ts` for CSV data migration
- All use `upsert` pattern for idempotent data seeding
- All follow naming convention: `{project_name}_db` and `{project_name}_user`
- All frontends deployed on Vercel, databases on Hetzner VPS

### 💡 Pro Tips for AI Assistants

1. **Always check project type first** - Prisma vs Drizzle determines migration approach
2. **Connection strings differ** - Vercel uses IP:port, Coolify uses container name
3. **Schema privileges are critical** - Prisma needs explicit schema grants
4. **Use `db push` not `migrate`** - Shadow database permission issues
5. **CSV migration pattern** - Always use `upsert` for safe re-runs
6. **Environment variables** - Update both local `.env` and Vercel dashboard
7. **Test locally first** - Verify connection before deploying to production

---

## ✅ PROGRESS TRACKING

### Completed Steps ✓

- [x] **Hetzner Account Creation** - Account created, billing verified, 2FA enabled, DPA configured
- [x] **Server Purchase** - CX33 server purchased in Helsinki (hel1): `77.42.71.87`
- [x] **Initial VPS Security** - System updated, non-root user created, SSH secured
- [x] **SSH Configuration** - Root login disabled, password auth disabled, key-based auth only
- [x] **Firewall (UFW)** - Configured with OpenSSH, HTTP (80), HTTPS (443), Coolify (8000)
- [x] **Fail2Ban** - Installed and enabled (protecting SSH)
- [x] **Automatic Security Updates** - Enabled and configured
- [x] **Swap** - 2GB swap file created and activated
- [x] **Docker Installation** - Docker 27.0 installed and running
- [x] **Coolify Installation** - Coolify 4.0.0-beta.454 installed and running
- [x] **Coolify Admin Account** - Admin account created successfully
- [x] **Environment Variables Backup** - `.env` file backed up securely
- [x] **Coolify Server Validation** - Localhost server validated successfully (SSH keys configured, UFW rules added, passwordless sudo enabled)
- [x] **PostgreSQL Database Deployment** - PostgreSQL 17-alpine container deployed and running (`xok0c8w8808g8080og4gccwc`)
- [x] **MongoDB Database Deployment** - MongoDB 7 container deployed and running (`t08sgc800wo08co48480ksgw`)
- [x] **Database Security Verification** - Both databases verified as secure (network isolated, not exposed externally, proper permissions)
- [x] **Hetzner Cloud Firewall** - Network-level firewall configured and tested (4 rules: SSH, HTTP, HTTPS, Coolify UI)
- [x] **PostgreSQL Database Creation** - Created `daily_urlist_db` database with dedicated user
- [x] **Data Migration** - Migrated all existing data from CSV files to PostgreSQL (users, lists, sessions, comments, activities)
- [x] **PostgreSQL Exposure** - Exposed PostgreSQL port 25432 for Vercel access (Hetzner Firewall + UFW configured)
- [x] **Vercel Integration** - Connected Vercel frontend to Hetzner PostgreSQL (production working)
- [x] **Automated Backups** - PostgreSQL daily backups configured (cron job: 2 AM daily, keeps last 7 days)
- [x] **Resource Monitoring** - htop installed, Coolify metrics accessible
- [x] **Next.js Project Migration** - Migrated `university-library` project from NeonDB to Hetzner VPS PostgreSQL (December 20, 2025)
  - [x] Database driver updated (Neon → pg)
  - [x] Edge runtime issues resolved (lazy imports + runtime config)
  - [x] CSV data migration completed
  - [x] Production deployment verified
- [x] **Prisma Project Migration** - Migrated `multi-ai-chatbot` project from NeonDB to Hetzner VPS PostgreSQL (December 21, 2025)
  - [x] Database created: `multi_ai_chatbot_db` with user `multi_ai_chatbot_user`
  - [x] Prisma schema pushed successfully (using `prisma db push` instead of migrations)
  - [x] Analytics tracking verified (Event, Session, ProviderStats tables)
  - [x] Production deployment verified (Vercel + Hetzner VPS)
  - [x] All analytics calculations verified and working correctly
- [x] **Prisma Project Migration (E-commerce)** - Migrated `next-store` project from NeonDB to Hetzner VPS PostgreSQL (December 21, 2025)
  - [x] Database created: `next_store_db` with user `next_store_user`
  - [x] Prisma schema pushed successfully (using `prisma db push`)
  - [x] CSV data migration completed (Products, Carts, CartItems, Orders, Reviews)
  - [x] Seed script created (`prisma/seed.ts`) with CSV parsing support
  - [x] Production deployment verified (Vercel + Hetzner VPS)
- [x] **Prisma Project Migration (Job Tracker)** - Migrated `job-tracker` project from Supabase to Hetzner VPS PostgreSQL (December 21, 2025)
  - [x] Database created: `job_tracker_db` with user `job_tracker_user`
  - [x] Prisma schema pushed successfully (using `prisma db push`)
  - [x] CSV data migration completed (255 jobs migrated from Job.csv)
  - [x] Seed script created (`prisma/seed.ts`) with CSV parsing support
  - [x] Production deployment verified (Vercel + Hetzner VPS)

### Current Status

**Server Details:**

- IP Address: `77.42.71.87`
- Location: Helsinki (hel1), Finland
- OS: Ubuntu 24.04 LTS
- User: `deploy` (with sudo privileges)
- Coolify UI: `http://77.42.71.87:8000`

**Database Status:**

- **PostgreSQL:** ✅ Running and healthy (container: `xok0c8w8808g8080og4gccwc`)

  - Resource limits: 2GB RAM
  - Network: Internal only (not exposed)
  - SSL: Disabled (acceptable for internal-only use)
  - Status: Ready for project databases

- **MongoDB:** ✅ Running and healthy (container: `t08sgc800wo08co48480ksgw`)
  - Resource limits: 2GB RAM
  - Network: Internal only (not exposed)
  - SSL: Disabled (acceptable for internal-only use)
  - Status: Ready for project databases

**Security Status:**

- ✅ Network isolation: Databases only accessible via Docker network
- ✅ Firewall: Properly configured, database ports not exposed
- ✅ Resource limits: Configured appropriately
- ✅ Auto-restart: Enabled (`unless-stopped`)
- ✅ Data persistence: Volumes configured
- ✅ Connectivity: Verified and working

See `DATABASE_SECURITY_VERIFICATION.md` for complete security audit report.

### Next Steps 🎯

- [x] **Configure Hetzner Cloud Firewall** - Network-level firewall configured and tested ✅
- [x] **Create Project Databases** - Created `daily_urlist_db` in PostgreSQL ✅
- [x] **Data Migration** - Migrated all existing data to PostgreSQL ✅
- [x] **Backup Strategy** - Automated PostgreSQL backups configured ✅
- [x] **Monitoring** - Resource monitoring set up (htop, Coolify metrics) ✅
- [ ] **Repeat for Other Projects** - Migrate remaining projects using same pattern
- [ ] **Backend Deployment** - Deploy backend applications to Coolify (if needed)
- [ ] **SSL/HTTPS Setup** - Configure domains and SSL certificates (optional)

---

## 📋 TABLE OF CONTENTS

1. [Why This Migration?](#-why-this-migration)
2. [Quick Start for New Projects](#-quick-start-for-new-projects) ⚡ **START HERE**
3. [Account Creation & Server Purchase](#-account-creation--server-purchase)
4. [Initial VPS Setup & Security](#️-initial-vps-setup--security)
5. [Coolify Installation & Configuration](#-coolify-installation--configuration)
6. [Database Setup (PostgreSQL & MongoDB)](#️-database-setup)
7. [Next.js Project Migration (NeonDB → PostgreSQL)](#-nextjs-project-migration-neondb--postgresql) ⭐ **Drizzle Projects**
8. [Prisma Project Migration (NeonDB → PostgreSQL)](#️-prisma-project-migration-neondb--postgresql) ⭐ **Prisma PostgreSQL Projects**
9. [Prisma MongoDB Project Migration (MongoDB Atlas → MongoDB VPS)](#-prisma-mongodb-project-migration-mongodb-atlas--mongodb-vps) ⭐ **Prisma MongoDB Projects**
10. [Backend Deployment](#-backend-deployment)

- [.NET/C# Backend Deployment (ASP.NET Core)](#-netc-backend-deployment-aspnet-core) ⭐ **.NET Projects**

1. [Frontend Integration](#-frontend-integration)
2. [Security Best Practices](#-security-best-practices)
3. [Backup Strategy](#-backup-strategy)
4. [Cost Analysis](#-cost-analysis)
5. [Is This a Good Idea?](#-is-this-a-good-idea)

---

## ⚡ QUICK START FOR NEW PROJECTS

**If you're copying this guide to a new project, follow these steps:**

### Step 1: Identify Your Project Type

**Is your project using:**

- **Prisma ORM?** → Go to [Prisma Project Migration]
  (#-prisma-project-migration-neondb--postgresql)
- **Drizzle ORM (Next.js)?** → Go to [Next.js Project Migration](#-nextjs-project-migration-neondb--postgresql)
- **.NET/C# ASP.NET Core Backend?** → Go to [.NET/C# Backend Deployment](#-netc-backend-deployment-aspnet-core)
- **Other?** → Follow general [Database Setup](#️-database-setup) section

### Step 2: Create Database on VPS

**SSH into your VPS:**

```bash
ssh deploy@77.42.71.87
```

**Connect to PostgreSQL:**

```bash
sudo docker exec -it xok0c8w8808g8080og4gccwc psql -U postgres
```

**Create database and user:**

```sql
-- Replace 'your_project' with your actual project name
CREATE DATABASE your_project_db;
CREATE USER your_project_user WITH PASSWORD 'your_strong_password';
GRANT ALL PRIVILEGES ON DATABASE your_project_db TO your_project_user;

-- Connect to new database
\c your_project_db

-- Grant schema privileges (important for Prisma/Drizzle)
GRANT ALL ON SCHEMA public TO your_project_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_project_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_project_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO your_project_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO your_project_user;

-- Exit
\q
```

### Step 3: Update Connection String

**Local `.env` file:**

```bash
DATABASE_URL="postgresql://your_project_user:password@77.42.71.87:25432/your_project_db"
```

**Vercel Production:**

- Go to Vercel Dashboard → Settings → Environment Variables
- Update `DATABASE_URL` with same connection string
- Save and redeploy

### Step 4: Run Migration

**For Prisma projects:**

```bash
npm run prisma:generate
npm run prisma:push  # Use 'push' not 'migrate dev'
```

**For Drizzle/Next.js projects:**

```bash
npm run db:migrate
# Or: npx drizzle-kit push
```

### Step 5: Verify

**Test locally:**

```bash
npm run dev
# Test your app, verify database operations work
```

**Test production:**

- Deploy to Vercel
- Use the app
- Verify data is being saved

**View database:**

```bash
npm run prisma:studio  # For Prisma projects
# Opens at http://localhost:5555
```

### Prisma Quick Reference

**Server Details:**

- IP: `77.42.71.87`
- PostgreSQL Container: `xok0c8w8808g8080og4gccwc`
- Port (Vercel): `25432`
- Port (Internal): `5432`

**Connection Strings:**

```bash
# Vercel/Production
postgresql://user:password@77.42.71.87:25432/database

# Coolify/Internal
postgresql://user:password@xok0c8w8808g8080og4gccwc:5432/database
```

**Common Issues:**

- **Prisma shadow database error?** → Use `prisma db push` instead of `migrate dev`
- **Permission denied?** → Grant schema privileges (see Step 2)
- **Edge runtime error (Next.js)?** → Add `export const runtime = "nodejs"` to API routes

---

## 🎯 WHY THIS MIGRATION?

### Problem Statement

**Current Setup (Free Tiers):**

- **MongoDB Atlas Free Tier**: Databases pause after inactivity, cold starts, unpredictable delays
- **NeonDB/Supabase Free Tier**: PostgreSQL databases sleep, connection timeouts, no guaranteed uptime
- **Render Free Tier**: Backend services cold start (30-60 seconds), spin down after inactivity, random pauses
- **Issues:**
  - ❌ No notification before database pause
  - ❌ First request after pause takes 30-60 seconds
  - ❌ Unpredictable downtime
  - ❌ No control over infrastructure
  - ❌ Limited resources and quotas
  - ❌ Multiple services = multiple points of failure

### Solution: Self-Hosted VPS

**Target Architecture:**

```bash
Hetzner VPS (CX33: 4 vCPU, 8GB RAM, 80GB SSD)
│
├─ Coolify (Self-Hosted PaaS)
│   ├─ PostgreSQL Container (All projects share one instance, separate databases)
│   ├─ MongoDB Container (All projects share one instance, separate databases)
│   ├─ Backend API #1 (Node.js/Express)
│   ├─ Backend API #2
│   ├─ Backend API #3
│   └─ ... (8-10 backend projects)
│
└─ Nginx + SSL (Managed by Coolify)

Frontends:
├─ Vercel (Next.js frontends)
└─ Netlify (Alternative frontends)

External Services:
└─ Cloudinary (Image storage - URLs only in DB)
```

**Benefits:**

- ✅ **24/7 Uptime**: No cold starts, no pauses, always online
- ✅ **Fixed Monthly Cost**: €6.53/month (predictable billing)
- ✅ **Full Control**: Complete infrastructure control
- ✅ **No Limits**: Unlimited projects, databases, deployments
- ✅ **Fast Response**: No cold start delays
- ✅ **Production-Ready**: Suitable for demo and real-world projects
- ✅ **Single Point of Management**: All backends and DBs in one place

---

## 🔐 ACCOUNT CREATION & SERVER PURCHASE

### Step 1: Create Hetzner Account

1. **Go to**: <https://www.hetzner.com/cloud/>
2. **Click**: "Get started" or "Sign Up"
3. **You'll be redirected to**: <https://accounts.hetzner.com/login>
4. **If you don't have an account**:
   - Click "Register now"
   - Fill in:
     - Email address
     - Password (strong password)
     - Country
     - Accept terms
   - Verify your email (check inbox)
5. **Add Billing Information**:
   - Go to billing settings
   - Add credit card or PayPal
   - Verify payment method

### Step 2: Access Cloud Console

1. **Login**: <https://console.hetzner.cloud>
2. **Create a Project**:
   - Click "New Project"
   - **Name**: Choose a professional name for your platform:
     - `dev-platform` - Development platform
     - `demo-hub` - Demo projects hub
     - `project-stack` - Project stack
     - `dev-infra` - Development infrastructure
     - `demo-vps` - Demo VPS platform
     - Or your own preferred name
   - **Description**: "Self-hosted platform for all demo and development projects"
   - **Note**: The project name is like a root folder/container that organizes all your servers, databases, and resources in Hetzner Cloud Console. It's for logical grouping and doesn't affect functionality.

### Step 3: Create Server (CX33)

1. **In your project**, click "Add Server"
2. **Configure Server**:

   - **Location**: Choose closest to you:
     - `Nuremberg (nbg1)` - Germany ⭐ **Recommended for Frankfurt area** (lowest latency)
     - `Falkenstein (fsn1)` - Germany (alternative German location)
     - `Helsinki (hel1)` - Finland
     - `Ashburn (ash)` - USA (East Coast)
     - `Hillsboro (hil)` - USA (West Coast)
     - `Singapore (sin)` - Asia
     - **For Frankfurt, Germany**: Choose **Nuremberg (nbg1)** for best performance and lowest latency
   - **Image**: `Ubuntu 22.04` (LTS recommended)
   - **Type**: `CX33` (Intel® / AMD)
     - 4 vCPU
     - 8 GB RAM
     - 80 GB NVMe SSD
     - 20 TB Traffic included
   - **SSH Keys**:

     - **IMPORTANT**: Add your local SSH public key
     - If you don't have one, generate it:

       ```bash
       ssh-keygen -t ed25519 -C "your_email@example.com"
       cat ~/.ssh/id_ed25519.pub
       ```

     - Copy the output and paste it in Hetzner console

   - **IPv4**: Enabled (default)
   - **IPv6**: Optional (can enable if needed)
   - **Networks**: Default (can add later)
   - **Firewalls**: Default (we'll configure manually)
   - **Backups**: Optional (€0.011/GB/month)
   - **Volumes**: None (we'll use local storage)

3. **Review & Create**:
   - Check all settings
   - Click "Create & Buy Now"
   - Server will be created in ~30 seconds
4. **Note Your Server IP**:
   - You'll see it in the console
   - Example: `123.45.67.89`
   - **Save this IP** - you'll need it!

### Step 4: Initial Server Access

```bash
# SSH into your server (replace with your IP)
ssh root@YOUR_SERVER_IP

# If you used a custom SSH key, specify it:
ssh -i ~/.ssh/your_key root@YOUR_SERVER_IP
```

---

## 🛡️ INITIAL VPS SETUP & SECURITY

### Step 1: System Update

```bash
# Update package list
apt update

# Upgrade all packages
apt upgrade -y

# Install essential tools
apt install -y curl wget git ufw fail2ban unattended-upgrades
```

### Step 2: Create Non-Root User

```bash
# Create deploy user
adduser deploy

# Add to sudo group
usermod -aG sudo deploy

# Switch to deploy user
su - deploy

# Test sudo access
sudo whoami  # Should output: root
```

### Step 3: SSH Key Setup for Deploy User

```bash
# As deploy user, create .ssh directory
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Copy your public key (from your local machine)
# On your LOCAL machine, run:
cat ~/.ssh/id_ed25519.pub

# Copy the output, then on SERVER:
nano ~/.ssh/authorized_keys

# Paste your public key, save (Ctrl+X, Y, Enter)
chmod 600 ~/.ssh/authorized_keys
```

### Step 4: Secure SSH Configuration

```bash
# Edit SSH config
sudo nano /etc/ssh/sshd_config
```

**Make these changes:**

```bash
# Disable root login
PermitRootLogin no

# Disable password authentication (use keys only)
PasswordAuthentication no
PubkeyAuthentication yes

# Change default port (optional but recommended)
Port 2222  # Change from 22 to 2222 (or any port 1024-65535)

# Disable empty passwords
PermitEmptyPasswords no

# Limit login attempts
MaxAuthTries 3

# Disable X11 forwarding (if not needed)
X11Forwarding no
```

**Restart SSH:**

```bash
sudo systemctl restart sshd

# Test connection from new terminal (don't close current!)
# If it works, you can close the old connection
```

### Step 5: Configure Firewall (UFW)

```bash
# Allow SSH (use your custom port if changed)
sudo ufw allow 2222/tcp  # or 22 if you kept default

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow Coolify port (default 8000)
sudo ufw allow 8000/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status verbose
```

### Step 6: Install Fail2Ban (Brute Force Protection)

```bash
# Fail2Ban is already installed, configure it
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Check status
sudo fail2ban-client status
```

### Step 7: Automatic Security Updates

```bash
# Configure automatic security updates
sudo dpkg-reconfigure -plow unattended-upgrades

# Enable automatic reboots (optional, for critical updates)
sudo nano /etc/apt/apt.conf.d/50unattended-upgrades

# Uncomment:
# Unattended-Upgrade::Automatic-Reboot "true";
# Unattended-Upgrade::Automatic-Reboot-Time "02:00";
```

### Step 8: Disable Unnecessary Services

```bash
# Check running services
sudo systemctl list-units --type=service --state=running

# Disable services you don't need (example)
sudo systemctl disable snapd  # If snapd is installed
sudo systemctl disable bluetooth  # If not needed
```

### Step 9: Set Up Swap (Optional but Recommended)

```bash
# Check current swap
free -h

# Create 2GB swap file
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make it permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Verify
free -h
```

### Step 10: Server Hardening Summary

✅ **Completed:**

- Non-root user created
- SSH keys only (no passwords)
- Firewall enabled (UFW)
- Fail2Ban installed
- Automatic security updates
- SSH port changed (optional)
- Swap configured

**Your server is now significantly more secure!**

---

## 🐳 COOLIFY INSTALLATION & CONFIGURATION

### What is Coolify?

**Coolify** is a self-hosted alternative to Heroku, Vercel, Netlify, and Render. It:

- Manages Docker containers
- Handles SSL certificates (Let's Encrypt)
- Provides web UI for deployments
- Supports Git-based deployments
- Manages databases
- Handles environment variables
- Provides logs and monitoring

### Step 1: Install Coolify

```bash
# Make sure you're logged in as 'deploy' user
whoami  # Should output: deploy

# Install Coolify
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash

# This will:
# - Install Docker
# - Install Docker Compose
# - Install Coolify
# - Set up networking
# - Start Coolify service

# Wait for installation (5-10 minutes)
```

### Step 2: Access Coolify UI

1. **Open browser**: `http://YOUR_SERVER_IP:8000`
2. **First-time setup**:
   - Create admin email (your email)
   - Create strong password
   - **Save these credentials!**
3. **You're now in Coolify dashboard!**

### Step 3: Configure Coolify Settings

1. **Go to Settings** (gear icon)
2. **Configure**:
   - **Server IP**: Your Hetzner server IP
   - **Domain**: Your domain (if you have one) or leave blank for now
   - **Email**: Your email (for Let's Encrypt SSL)
   - **Docker Network**: Default is fine
3. **Save settings**

### Step 4: Add Your Domain (Optional but Recommended)

If you have a domain (e.g., `yourdomain.com`):

1. **Add DNS Records** (in your domain registrar):

   ```dns
   Type: A
   Name: @
   Value: YOUR_SERVER_IP
   TTL: 3600

   Type: A
   Name: *
   Value: YOUR_SERVER_IP
   TTL: 3600
   ```

2. **In Coolify**:
   - Go to Settings → Domains
   - Add your domain
   - Verify DNS propagation

---

## 🗄️ DATABASE SETUP

### PostgreSQL Setup (All Projects)

**Strategy**: One PostgreSQL container, multiple databases (one per project)

**Architecture:**

```bash
PostgreSQL Container (postgres-main)
├── project1_db (database)
├── project2_db (database)
└── project3_db (database)
```

**Security Configuration:**

- Port 5432: **Internal only** (not exposed to internet)
- Access: Only via Docker internal DNS (`postgres-main:5432`)
- Authentication: Strong password required
- Network: Isolated Docker network (Coolify manages this)

#### Step 1: Deploy PostgreSQL Container

**In Coolify Dashboard:**

- New Resource → PostgreSQL
- Version: `17-alpine` (or `16` LTS)
- Database: `postgres` (default admin DB)
- User: `postgres`
- Password: Generate strong password (save securely)
- Port: `5432` (internal only initially)
- Volume: `postgres-data` (persistent storage)
- Resources: 1-2GB RAM (defaults usually fine)
- Deploy and wait 2-3 minutes

#### Step 2: Verify PostgreSQL Deployment

```bash
ssh deploy@77.42.71.87
sudo docker ps | grep postgres  # Check container is running
sudo docker exec xok0c8w8808g8080og4gccwc pg_isready -U postgres  # Test connectivity
```

**Expected:** Container shows "Up X minutes (healthy)" and connectivity test passes.

**Note:** Container name is `xok0c8w8808g8080og4gccwc` (Coolify-generated ID). Use `docker ps` to find yours if different.

#### Step 3: Create Database for Each Project

**Important:** Use the **same PostgreSQL container** for all projects. Each project gets its own **database** (not a new container).

```bash
# Connect to PostgreSQL (same container for all projects)
sudo docker exec -it xok0c8w8808g8080og4gccwc psql -U postgres
```

**Create Database and User:**

```sql
CREATE DATABASE project_name_db;
CREATE USER project_name_user WITH PASSWORD 'StrongPassword123';  -- Letters + numbers only (no special chars)
GRANT ALL PRIVILEGES ON DATABASE project_name_db TO project_name_user;
\l  -- List databases
\du -- List users
\q  -- Exit
```

**Note:** Use simple passwords (letters + numbers only) to avoid bash history expansion issues.

#### Step 4: Connection String Configuration

**For Vercel/Netlify Frontends (Production):**

```bash
DATABASE_URL=postgresql://project_name_user:PASSWORD@77.42.71.87:25432/project_name_db
DIRECT_URL=postgresql://project_name_user:PASSWORD@77.42.71.87:25432/project_name_db
```

**For Coolify Deployments (Internal):**

```bash
DATABASE_URL=postgresql://project_name_user:PASSWORD@xok0c8w8808g8080og4gccwc:5432/project_name_db
DIRECT_URL=postgresql://project_name_user:PASSWORD@xok0c8w8808g8080og4gccwc:5432/project_name_db
```

**Important:**

- Use container name (`xok0c8w8808g8080og4gccwc`) for Coolify deployments
- Use server IP (`77.42.71.87:25432`) for Vercel/Netlify deployments
- Never commit passwords to Git

### MongoDB Setup (All Projects)

**Strategy**: One MongoDB container, multiple databases (one per project)

**Architecture:**

```bash
MongoDB Container (mongodb-main)
├── project1_db (database)
├── project2_db (database)
└── project3_db (database)
```

**Security Configuration:**

- Port 27017: **Internal only** (Docker network only)
- Exposed Port (Vercel): `25433` (for external access from Vercel/Netlify)
- Access: Via Docker internal DNS (`t08sgc800wo08co48480ksgw:27017`) or external IP (`77.42.71.87:25433`)
- Authentication: Required (admin user + project-specific users)
- Network: Isolated Docker network (Coolify manages this)

#### Step 1: Deploy MongoDB Container

1. **In Coolify Dashboard**:

   - Click "New Resource" (or "Add Resource")
   - Select "MongoDB"
   - **Configuration**:
     - **Name**: `mongodb-main` (used as Docker container name and internal DNS)
     - **Version**: `7.0` (latest stable, recommended) or `6.0` (LTS)
     - **Database**: `admin` (default authentication database)
     - **User**: `admin` (root user for admin tasks)
     - **Password**:
       - **IMPORTANT**: Generate a strong password (minimum 16 characters)
       - Use: Uppercase, lowercase, numbers, special characters
       - **Example format**: `Mongo#2025!SecurePass$Word`
       - **SAVE THIS PASSWORD SECURELY** (password manager recommended)
     - **Port**: `27017` (internal Docker port)
     - **Port Mapping** (for Vercel access): `0.0.0.0:25433:27017` (set after deployment)
     - **Volume**: `mongodb-data` (persistent storage - data survives container restarts)
     - **Resources** (optional, defaults usually fine):
       - CPU: 0.5-1.0 (shared with other services)
       - Memory: 1-2GB (adjust based on usage)
   - Click "Deploy"

2. **Wait for deployment** (2-3 minutes)
   - Watch the logs in Coolify UI
   - Verify status shows "Healthy" or "Running"

#### Step 2: Verify MongoDB Deployment

```bash
ssh deploy@77.42.71.87
sudo docker ps | grep mongodb  # Check container is running
```

**Expected:** Container shows "Up X minutes (healthy)". Container name is `t08sgc800wo08co48480ksgw` (Coolify-generated ID).

#### Step 3: Create Databases and Users for Each Project

**Security Note**: MongoDB creates databases on first use, but we'll create them explicitly and set up dedicated users for better security and organization.

```bash
# Find your MongoDB container name
sudo docker ps | grep mongo

# Connect to MongoDB container (replace with your actual container name)
# Option 1: Interactive login (you'll be prompted for admin password)
sudo docker exec -it t08sgc800wo08co48480ksgw mongosh -u admin -p

# Option 2: Direct connection with password in environment
sudo docker exec -it t08sgc800wo08co48480ksgw mongosh -u admin -p YOUR_PASSWORD

# OR if you named it 'mongodb-main':
sudo docker exec -it mongodb-main mongosh -u admin -p

# Enter the admin password you set during deployment
```

#### Step 3a: Create Databases and Users

```javascript
// Switch to admin database (authentication database)
use admin

// Create database and user for Project 1
use project1_db
db.createUser({
  user: "project1_user",
  pwd: "StrongPassword123!@#",  // Use a strong, unique password
  roles: [{ role: "readWrite", db: "project1_db" }]
})

// Create database and user for Project 2
use project2_db
db.createUser({
  user: "project2_user",
  pwd: "StrongPassword456!@#",  // Use a different strong password
  roles: [{ role: "readWrite", db: "project2_db" }]
})

// Create database and user for Project 3
use project3_db
db.createUser({
  user: "project3_user",
  pwd: "StrongPassword789!@#",  // Use a different strong password
  roles: [{ role: "readWrite", db: "project3_db" }]
})

// Continue for all your projects...
// Each project should have:
// - Its own database (projectN_db)
// - Its own user (projectN_user)
// - Its own strong, unique password

// List all databases to verify
show dbs

// List users for a specific database
use project1_db
db.getUsers()

// Exit MongoDB shell
exit
```

**Important Security Notes:**

- ✅ Each project has its own database and user
- ✅ Each user has `readWrite` role only (not admin privileges)
- ✅ Users can only access their own database
- ✅ Use different strong passwords for each user
- ✅ Save all passwords securely (password manager)

#### Step 4: MongoDB Connection String Configuration

**For Backend Applications** (use in your `.env` files):

**Option A: Using admin user (simpler, less secure - not recommended for production):**

```bash
MONGODB_URI=mongodb://admin:YOUR_ADMIN_PASSWORD@mongodb-main:27017/PROJECT_DB_NAME?authSource=admin
```

**Option B: Using dedicated user per database (recommended, more secure):**

**For Vercel/Netlify Frontends (Production):**

```bash
DATABASE_URL=mongodb://project1_user:USER_PASSWORD@77.42.71.87:25433/project1_db?authSource=project1_db
```

**For Coolify/Internal Deployments:**

```bash
DATABASE_URL=mongodb://project1_user:USER_PASSWORD@t08sgc800wo08co48480ksgw:27017/project1_db?authSource=project1_db
```

**Connection String Breakdown:**

- `mongodb://` - Protocol (not `mongodb+srv://` for VPS)
- `project1_user:USER_PASSWORD` - Database user and password
- `@77.42.71.87:25433` - VPS IP and exposed port (for Vercel)
- `@t08sgc800wo08co48480ksgw:27017` - Container name and internal port (for Coolify)
- `/project1_db` - Database name
- `?authSource=project1_db` - Authentication database (same as target database for dedicated users)

**Important Notes:**

- ✅ Use VPS IP (`77.42.71.87:25433`) for Vercel/Netlify deployments
- ✅ Use container name (`t08sgc800wo08co48480ksgw:27017`) for Coolify/internal deployments
- ✅ Port `25433` is exposed externally (for Vercel access)
- ✅ Port `27017` is internal Docker network only
- ✅ Database name matches what you created (e.g., `project1_db`)
- ✅ `authSource` parameter is required for authentication
- ✅ Store connection strings securely in Coolify environment variables
- ✅ Never commit passwords to Git repositories

### 🔒 Database Security Summary

✅ **Network Isolation:**

- PostgreSQL: Internal only (not publicly exposed)
- MongoDB: Port 25433 exposed for Vercel access (secured by password authentication)
- Internal access: Via Docker network using container names
- External access: PostgreSQL (25432) and MongoDB (25433) exposed for Vercel/Netlify frontends
- Multiple firewall layers provide defense in depth

✅ **Authentication:**

- Strong passwords required for all database users
- Separate users per database (recommended) for better isolation
- PostgreSQL: Role-based access control
- MongoDB: Database-level user permissions

✅ **Best Practices Implemented:**

- ✅ One container per database type (resource efficiency)
- ✅ Multiple databases per container (cost-effective)
- ✅ Persistent volumes (data survives container restarts)
- ✅ Regular backups recommended (see Backup section below)
- ✅ Connection strings use internal DNS (not localhost/IP)

✅ **Security Checklist:**

- [x] Databases not exposed to internet
- [x] Strong passwords generated and saved securely
- [x] Separate databases per project (isolation)
- [x] Optional: Separate users per database (enhanced security)
- [x] Persistent storage configured (data persistence)
- [ ] Automated backups configured (see Backup section)
- [ ] Connection strings stored securely (Coolify environment variables)

**Next Steps:**

1. Deploy PostgreSQL container
2. Deploy MongoDB container
3. Create databases for each project
4. Set up automated backups (see Backup section)
5. Start deploying backend applications

---

## ⚡ NEXT.JS PROJECT MIGRATION (NeonDB → PostgreSQL)

### Overview

This section covers migrating **Next.js projects** from NeonDB (serverless PostgreSQL) to standard PostgreSQL on Hetzner VPS. This is a **critical section** for Next.js projects as it addresses Edge runtime compatibility issues.

### Prerequisites

- Next.js project using NeonDB
- Drizzle ORM or Prisma (this guide focuses on Drizzle)
- Existing database connection configured
- CSV exports of existing data (optional, for data migration)

---

### Step 1: Create Database on Hetzner VPS

Follow the [Database Setup](#️-database-setup) section above to:

1. Create database: `your_project_db`
2. Create user: `your_project_user` with password
3. Grant privileges
4. Note the connection string

**Connection String Format:**

```bash
# For Vercel/Production
DATABASE_URL="postgresql://your_project_user:password@77.42.71.87:25432/your_project_db"

# For Coolify/Internal
DATABASE_URL="postgresql://your_project_user:password@xok0c8w8808g8080og4gccwc:5432/your_project_db"
```

---

### Step 2: Update Database Driver (Critical)

**⚠️ CRITICAL:** NeonDB uses a different driver than standard PostgreSQL. You MUST update all database connection files.

#### 2.1: Update Main Database Connection File

**File:** `database/drizzle.ts` (or similar)

```typescript
// ❌ OLD (NeonDB)
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql);

// ✅ NEW (Standard PostgreSQL)
import config from "@/lib/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

if (!config.env.databaseUrl) {
  throw new Error("No database connection string was provided. Please check your DATABASE_URL environment variable.");
}

const pool = new Pool({
  connectionString: config.env.databaseUrl,
});

export const db = drizzle(pool, { casing: "snake_case" });
```

#### 2.2: Update Seed Scripts

**File:** `database/seed.ts` (if exists)

```typescript
// ❌ OLD
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

// ✅ NEW
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

config({ path: ".env" });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
});
export const db = drizzle(pool);
```

#### 2.3: Update Migration Scripts

**File:** `database/migrate-from-csv.ts` (if exists)

Same pattern - replace Neon imports with `pg` and `drizzle-orm/node-postgres`.

---

### Step 3: Fix Edge Runtime Issues

**⚠️ CRITICAL:** Next.js middleware runs in Edge runtime, which doesn't support Node.js `crypto` module used by `pg` driver.

#### 3.1: Configure API Routes

Add `export const runtime = "nodejs"` to **ALL** API routes that use the database:

```typescript
// app/api/your-route/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/database/drizzle";

export const runtime = "nodejs"; // ← REQUIRED

export async function GET(_request: NextRequest) {
  const data = await db.select().from(users);
  return NextResponse.json(data);
}
```

**How to Find Routes:**

```bash
# Find all routes using database
grep -r "from.*database/drizzle\|import.*db" app/api --include="*.ts"

# Add runtime config to each file found
```

**Typical Routes to Update (15-20 routes):**

- `app/api/status/*/route.ts` (health, database, metrics)
- `app/api/reviews/*/route.ts`
- `app/api/admin/*/route.ts`
- `app/api/auth/[...nextauth]/route.ts`
- `app/api/workflows/*/route.ts`
- Any route importing database or using server actions that access database

#### 3.2: Fix Middleware (Lazy Import Pattern)

**File:** `auth.ts` (or wherever NextAuth is configured)

**Problem:** Middleware imports `auth`, which imports database → Edge runtime error

**Solution:** Use lazy imports so database is only loaded when needed:

```typescript
// ❌ OLD (auth.ts)
import { db } from "@/database/drizzle";
import { users } from "@/database/schema";
import { eq } from "drizzle-orm";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    CredentialsProvider({
      async authorize(credentials) {
        const user = await db.select()...  // ❌ Loads database at module level
      },
    }),
  ],
});

// ✅ NEW (auth.ts - Lazy imports)
import NextAuth, { User } from "next-auth";
import { sha256 } from "@noble/hashes/sha256";
import CredentialsProvider from "next-auth/providers/credentials";

// Lazy import database to avoid loading in Edge runtime (middleware)
async function getDb() {
  const { db } = await import("@/database/drizzle");
  return db;
}

async function getUsersSchema() {
  const { users } = await import("@/database/schema");
  return users;
}

async function getEq() {
  const { eq } = await import("drizzle-orm");
  return eq;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    CredentialsProvider({
      async authorize(credentials) {
        // Lazy load database only when authorize is called (Node.js runtime)
        const db = await getDb();
        const users = await getUsersSchema();
        const eq = await getEq();

        const user = await db
          .select()
          .from(users)
          .where(eq(users.email, credentials.email.toString()))
          .limit(1);
        // ... rest of authorize logic
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Lazy load database only when jwt callback is called (Node.js runtime)
        const db = await getDb();
        const users = await getUsersSchema();
        const eq = await getEq();

        await db.update(users).set({ lastLogin: new Date() })...
      }
      return token;
    },
  },
});
```

**Why This Works:**

- Middleware uses `auth()` which only reads JWT (no database needed)
- Database is only loaded when `authorize()` or `jwt()` callbacks run
- These callbacks run in Node.js runtime (not Edge)
- Zero performance impact (lazy import is <1ms, only during sign-in)

---

### Step 4: Update package.json

```json
{
  "dependencies": {
    "pg": "^8.16.3" // ← ADD THIS
    // Remove: "@neondatabase/serverless" (if exists)
  },
  "devDependencies": {
    "@types/pg": "^8.16.0", // ← ADD THIS
    "tsx": "^4.21.0", // ← ADD THIS (for migration scripts)
    "csv-parse": "^6.1.0" // ← ADD THIS (if using CSV migration)
  },
  "scripts": {
    "db:migrate": "npx drizzle-kit push", // ← UPDATE (remove :pg if exists)
    "db:migrate-csv": "tsx database/migrate-from-csv.ts" // ← ADD THIS (if using CSV migration)
  }
}
```

**Install dependencies:**

```bash
npm install
npm uninstall @neondatabase/serverless  # Remove if exists
```

---

### Step 5: Update Environment Variables

**Local Development (`.env`):**

```bash
# Database (Hetzner VPS PostgreSQL Connection String)
DATABASE_URL="postgresql://your_project_user:password@77.42.71.87:25432/your_project_db"
```

**Production (Vercel Dashboard):**

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Update `DATABASE_URL` with new Hetzner VPS connection string
3. Save and redeploy

---

### Step 6: Run Database Migrations

```bash
# Create tables in new database
npm run db:migrate

# If you have CSV data to migrate:
npm run db:migrate-csv
```

---

### Step 7: Fix TypeScript Date Type Issues (If Using Drizzle)

**Issue:** PostgreSQL `date()` type expects strings, not Date objects.

**Solution:** Create helper function for date formatting:

```typescript
// Helper function for PostgreSQL date fields
function formatDateForPostgres(date: Date | null): string | null {
  if (!date) {
    return null;
  }
  // Format as YYYY-MM-DD for PostgreSQL date type
  return date.toISOString().split("T")[0];
}

// Usage in migration scripts:
lastActivityDate: formatDateForPostgres(parseDate(row.last_activity_date)),
dueDate: formatDateForPostgres(parseDate(row.due_date)),
returnDate: formatDateForPostgres(parseDate(row.return_date)),
```

**Note:** `timestamp()` fields can use Date objects directly, only `date()` fields need strings.

---

### Step 8: Verify Migration

**Test Locally:**

```bash
npm run dev
# Should start without Edge runtime errors
# Test all routes and features
```

**Test Production:**

- Deploy to Vercel
- Verify all routes work
- Check for any Edge runtime errors in logs

---

### Migration Checklist

**Before Migration:**

- [ ] Backup existing NeonDB data (export to CSV if needed)
- [ ] Note all environment variables
- [ ] Document current database schema

**During Migration:**

- [ ] Create database on Hetzner VPS
- [ ] Update database driver in all files
- [ ] Add `runtime = "nodejs"` to all API routes using database
- [ ] Fix middleware with lazy imports (if using NextAuth)
- [ ] Update package.json dependencies
- [ ] Update environment variables
- [ ] Run database migrations
- [ ] Migrate CSV data (if applicable)

**After Migration:**

- [ ] Test locally (`npm run dev`)
- [ ] Test production (Vercel deployment)
- [ ] Verify all features work
- [ ] Check for Edge runtime errors
- [ ] Update Vercel environment variables
- [ ] Monitor for any issues

---

### Common Issues & Solutions

#### Issue 1: "The edge runtime does not support Node.js 'crypto' module"

**Solution:**

- ✅ Add `export const runtime = "nodejs"` to all API routes using database
- ✅ Use lazy imports in `auth.ts` (if middleware uses auth)
- ✅ Verify all database imports use `pg` not `@neondatabase/serverless`

#### Issue 2: "NeonDbError: Failed to parse URL"

**Solution:**

- ✅ Replace all `@neondatabase/serverless` imports with `pg`
- ✅ Replace all `drizzle-orm/neon-http` with `drizzle-orm/node-postgres`
- ✅ Check all database connection files

#### Issue 3: "Type 'Date | null' is not assignable to type 'string'"

**Solution:**

- ✅ Use `formatDateForPostgres()` helper for `date()` type fields
- ✅ Keep Date objects for `timestamp()` type fields

#### Issue 4: "permission denied for schema public"

**Solution:**

```sql
-- Connect as postgres user
sudo docker exec -it xok0c8w8808g8080og4gccwc psql -U postgres

-- Grant privileges
GRANT ALL ON SCHEMA public TO your_project_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_project_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_project_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO your_project_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO your_project_user;
```

---

### Performance Impact

**Lazy Imports:**

- ✅ **Zero impact** on page loads (middleware doesn't use database)
- ✅ **<1ms overhead** during sign-in (negligible compared to ~50ms database query)
- ✅ **Better memory usage** (database not loaded until needed)

**Runtime Configuration:**

- ✅ **No performance impact** - just tells Next.js which runtime to use
- ✅ **Same performance** as before, just explicit configuration

---

### Example: Complete Migration for a Next.js Project

**Project:** University Library Management System  
**From:** NeonDB  
**To:** Hetzner VPS PostgreSQL  
**Status:** ✅ Complete (December 20, 2025)

**Files Updated:**

- ✅ `database/drizzle.ts` - Updated to `pg` driver
- ✅ `database/seed.ts` - Updated to `pg` driver
- ✅ `database/migrate-from-csv.ts` - Updated to `pg` driver
- ✅ `auth.ts` - Added lazy imports
- ✅ 18 API routes - Added `runtime = "nodejs"`
- ✅ `package.json` - Added `pg`, `@types/pg`, `tsx`, `csv-parse`

**Result:**

- ✅ No Edge runtime errors
- ✅ All features working
- ✅ Production deployment successful
- ✅ Zero performance impact

---

### Next.js Quick Reference

**Database Driver Migration:**

```typescript
// Replace everywhere:
@neondatabase/serverless → pg
drizzle-orm/neon-http → drizzle-orm/node-postgres
```

**API Route Configuration:**

```typescript
// Add to all routes using database:
export const runtime = "nodejs";
```

**Auth.ts Pattern:**

```typescript
// Use lazy imports:
async function getDb() {
  const { db } = await import("@/database/drizzle");
  return db;
}
```

**Package.json Updates:**

```json
{
  "dependencies": { "pg": "^8.16.3" },
  "devDependencies": { "@types/pg": "^8.16.0", "tsx": "^4.21.0" }
}
```

---

**Status:** ✅ Tested and verified with University Library project (December 20, 2025)

---

## 🗄️ PRISMA PROJECT MIGRATION (NeonDB → PostgreSQL)

### Prisma Migration Overview

This section covers migrating **Prisma-based projects** from NeonDB to standard PostgreSQL on Hetzner VPS. This is specifically for projects using Prisma ORM (not Drizzle).

### Prisma Migration Prerequisites

- Prisma-based project using NeonDB
- Existing Prisma schema configured
- Vercel deployment (for production analytics tracking)

---

### Step 1: Setup Prisma Database on VPS

Follow the [Database Setup](#️-database-setup) section above to:

1. Create database: `your_project_db`
2. Create user: `your_project_user` with password
3. Grant privileges
4. Note the connection string

**Connection String Format:**

```bash
# For Vercel/Production
DATABASE_URL="postgresql://your_project_user:password@77.42.71.87:25432/your_project_db"

# For Coolify/Internal
DATABASE_URL="postgresql://your_project_user:password@xok0c8w8808g8080og4gccwc:5432/your_project_db"
```

---

### Step 2: Update Environment Variables

**Local Development (`.env`):**

```bash
# PostgreSQL Database URL (Hetzner VPS)
DATABASE_URL="postgresql://your_project_user:password@77.42.71.87:25432/your_project_db"

# DIRECT_URL (required if your Prisma schema uses directUrl)
# For standard PostgreSQL, use the same connection string as DATABASE_URL
DIRECT_URL="postgresql://your_project_user:password@77.42.71.87:25432/your_project_db"
```

**Note:** If your `prisma/schema.prisma` includes `directUrl = env("DIRECT_URL")`, you must set `DIRECT_URL` in both local `.env` and Vercel environment variables. For standard PostgreSQL (non-serverless), use the same connection string as `DATABASE_URL`.

**Production (Vercel Dashboard):**

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Update `DATABASE_URL` with new Hetzner VPS connection string
3. Update `DIRECT_URL` if used (same as `DATABASE_URL` for standard PostgreSQL)
4. Save and redeploy

---

### Step 3: Run Prisma Schema Push

**⚠️ IMPORTANT:** Prisma Migrate requires a shadow database, which your user doesn't have permission to create. Use `prisma db push` instead.

#### Option 1: Using npm script (Recommended)

Add to `package.json`:

```json
{
  "scripts": {
    "prisma:generate": "prisma generate",
    "prisma:push": "prisma db push",
    "prisma:studio": "prisma studio"
  }
}
```

Then run:

```bash
# Generate Prisma Client
npm run prisma:generate

# Push schema to database (creates tables)
npm run prisma:push
```

#### Option 2: Direct Prisma commands

```bash
npx prisma generate
npx prisma db push
```

**What `db push` does:**

- ✅ Creates tables directly from schema (no migrations needed)
- ✅ No shadow database required
- ✅ Perfect for new databases
- ⚠️ **Note:** For production, you may want to use migrations later, but `db push` works fine for initial setup

---

### Step 4: Verify Database Connection

**Test locally:**

```bash
# Open Prisma Studio to view database
npm run prisma:studio
# Opens at http://localhost:5555
```

**Verify tables created:**

- Check Prisma Studio shows your models
- Verify data can be inserted/queried

---

### Step 5: Migrate Existing Data (Optional - CSV Files)

**If you have existing data in CSV format**, create a seed script to migrate it:

#### Step 5.1: Install Required Packages

```bash
npm install csv-parse
npm install --save-dev tsx
```

#### Step 5.2: Create Seed Script

Create `prisma/seed.ts`:

```typescript
/**
 * Database Seed Script for your-project
 * Migrates data from CSV files to PostgreSQL database
 */
import { PrismaClient } from "@prisma/client";
import { parse } from "csv-parse/sync";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();
const CSV_DIR = "/path/to/your/csv/files"; // Update this path

// Define interfaces matching your CSV structure
interface YourModelRow {
  id: string;
  // ... other fields
}

async function parseCSV<T>(filePath: string): Promise<T[]> {
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  CSV file not found: ${filePath}`);
    return [];
  }

  const content = fs.readFileSync(filePath, "utf-8");
  if (!content.trim() || content.trim().split("\n").length <= 1) {
    console.warn(`⚠️  CSV file is empty: ${filePath}`);
    return [];
  }

  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
  return records as T[];
}

function parseBoolean(value: string): boolean {
  return value === "true" || value === "1" || value === "t" || value === "True";
}

function parseIntValue(value: string): number {
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    console.warn(`⚠️  Failed to parse integer: ${value}, defaulting to 0`);
    return 0;
  }
  return parsed;
}

async function seedYourModel() {
  console.log("🌱 Seeding your-model...");
  const items = await parseCSV<YourModelRow>(path.join(CSV_DIR, "YourModel.csv"));

  if (items.length === 0) {
    console.log("⚠️  No items to seed");
    return;
  }

  for (const item of items) {
    try {
      await prisma.yourModel.upsert({
        where: { id: item.id },
        update: {
          // Update fields
        },
        create: {
          // Create fields
        },
      });
    } catch (error) {
      console.error(`❌ Error seeding item ${item.id}:`, error);
    }
  }
  console.log(`✅ Seeded ${items.length} items`);
}

async function main() {
  console.log("🚀 Starting database seed...\n");
  try {
    // Seed in order to maintain foreign key relationships
    await seedYourModel();
    // Add more seed functions here...

    console.log("\n✨ Database seeded successfully!");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

#### Step 5.3: Add Seed Script to package.json

```json
{
  "scripts": {
    "db:seed": "tsx prisma/seed.ts"
  }
}
```

#### Step 5.4: Run Seed Script

```bash
npm run db:seed
```

**Important Notes:**

- Update `CSV_DIR` path to your CSV files location
- Define interfaces matching your CSV column names
- Seed in order (parent tables before child tables with foreign keys)
- Use `upsert` to make script idempotent (safe to run multiple times)

---

### Step 6: Deploy to Production

1. **Update Vercel Environment Variables:**

   - Go to Vercel Dashboard → Settings → Environment Variables
   - Update `DATABASE_URL` with Hetzner VPS connection string
   - Update `DIRECT_URL` if used (same as `DATABASE_URL` for standard PostgreSQL)
   - Save and redeploy

2. **Test Production:**
   - Use the app in production
   - Verify data is being saved correctly
   - Check Prisma Studio to see new data

---

### Prisma Migration Checklist

**Before Migration:**

- [ ] Backup existing NeonDB data (export to CSV if needed)
- [ ] Note all environment variables
- [ ] Document current Prisma schema
- [ ] Prepare CSV files (if migrating existing data)

**During Migration:**

- [ ] Create database on Hetzner VPS
- [ ] Create database user with privileges
- [ ] Grant schema privileges (important for Prisma)
- [ ] Update `.env` file with new `DATABASE_URL` and `DIRECT_URL`
- [ ] Run `prisma generate`
- [ ] Run `prisma db push` (not `migrate dev`)
- [ ] Verify tables created in Prisma Studio
- [ ] Create seed script (if migrating CSV data)
- [ ] Run seed script (`npm run db:seed`)
- [ ] Verify data imported correctly

**After Migration:**

- [ ] Test locally (`npm run dev`)
- [ ] Update Vercel environment variables (both `DATABASE_URL` and `DIRECT_URL` if used)
- [ ] Deploy to production
- [ ] Test production deployment
- [ ] Verify all features work correctly
- [ ] Monitor for any issues

---

### Prisma Common Issues & Solutions

#### Issue 1: "Prisma Migrate could not create the shadow database"

**Solution:**

- ✅ Use `prisma db push` instead of `prisma migrate dev`
- ✅ `db push` doesn't require a shadow database
- ✅ Perfect for new databases or when you don't have CREATEDB permission

#### Issue 2: "permission denied for schema public"

**Solution:**

```sql
-- Connect as postgres user
sudo docker exec -it xok0c8w8808g8080og4gccwc psql -U postgres

-- Grant privileges
GRANT ALL ON SCHEMA public TO your_project_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_project_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_project_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO your_project_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO your_project_user;
```

#### Issue 3: Analytics not tracking in production

**Solution:**

- ✅ Check Vercel environment variables are updated
- ✅ Verify `DATABASE_URL` is correct in Vercel
- ✅ Analytics only work in production (disabled in dev mode)
- ✅ Check Vercel function logs for errors

---

### Example: Complete Migration for a Prisma Project

**Project 1: Multi-AI Chatbot**  
**From:** NeonDB  
**To:** Hetzner VPS PostgreSQL  
**Status:** ✅ Complete (December 21, 2025)

**Files Updated:**

- ✅ `.env` - Updated `DATABASE_URL`
- ✅ `package.json` - Added `prisma:push` and `prisma:studio` scripts
- ✅ Prisma schema - No changes needed (uses standard PostgreSQL)

**Database Created:**

- ✅ Database: `multi_ai_chatbot_db`
- ✅ User: `multi_ai_chatbot_user`
- ✅ Tables: Event, Session, ProviderStats

**Result:**

- ✅ No migration errors
- ✅ All tables created successfully
- ✅ Analytics tracking working in production
- ✅ All calculations verified and correct

---

**Project 2: Next Store (E-commerce)**  
**From:** NeonDB  
**To:** Hetzner VPS PostgreSQL  
**Status:** ✅ Complete (December 21, 2025)

**Files Updated:**

- ✅ `.env` - Updated `DATABASE_URL` and `DIRECT_URL`
- ✅ `package.json` - Added `db:seed` script, installed `csv-parse` and `tsx`
- ✅ `prisma/seed.ts` - Created CSV migration script
- ✅ Prisma schema - No changes needed (uses standard PostgreSQL)

**Database Created:**

- ✅ Database: `next_store_db`
- ✅ User: `next_store_user`
- ✅ Tables: Product, Cart, CartItem, Order, Review, Favorite

**Data Migration:**

- ✅ Migrated 6 products from CSV
- ✅ Migrated 5 carts from CSV
- ✅ Migrated 2 cart items from CSV
- ✅ Migrated 3 orders from CSV
- ✅ Migrated 2 reviews from CSV
- ✅ Seed script uses upsert (safe to run multiple times)

**Dependencies Added:**

```json
{
  "dependencies": {
    "csv-parse": "^6.1.0"
  },
  "devDependencies": {
    "tsx": "^4.21.0"
  },
  "scripts": {
    "db:seed": "tsx prisma/seed.ts"
  }
}
```

**Result:**

- ✅ No migration errors
- ✅ All tables created successfully
- ✅ All CSV data migrated correctly
- ✅ Production deployment verified
- ✅ All features working correctly

---

### Prisma Migration Quick Reference

**Prisma Commands:**

```bash
# Generate Prisma Client
npm run prisma:generate

# Push schema to database (no migrations)
npm run prisma:push

# Open database UI
npm run prisma:studio
```

**Connection Strings:**

```bash
# Vercel/Production
DATABASE_URL="postgresql://user:password@77.42.71.87:25432/database"

# Coolify/Internal
DATABASE_URL="postgresql://user:password@xok0c8w8808g8080og4gccwc:5432/database"
```

**Package.json Scripts:**

```json
{
  "scripts": {
    "prisma:generate": "prisma generate",
    "prisma:push": "prisma db push",
    "prisma:studio": "prisma studio",
    "db:seed": "tsx prisma/seed.ts"
  }
}
```

**CSV Data Migration (Optional):**

If migrating existing data from CSV files:

1. Install dependencies: `npm install csv-parse` and `npm install --save-dev tsx`
2. Create `prisma/seed.ts` following the pattern in Step 5
3. Update `CSV_DIR` path in seed script
4. Run: `npm run db:seed`

---

**Status:** ✅ Tested and verified with:

- Multi-AI Chatbot project (December 21, 2025)
- Next Store e-commerce project (December 21, 2025) - includes CSV migration pattern

---

## 🍃 PRISMA MONGODB PROJECT MIGRATION (MongoDB Atlas → MongoDB VPS)

### Prisma MongoDB Migration Overview

This section covers migrating **Prisma-based projects using MongoDB** from MongoDB Atlas to self-hosted MongoDB on Hetzner VPS. This is specifically for projects using Prisma ORM with MongoDB (not PostgreSQL).

### Prisma MongoDB Migration Prerequisites

- Prisma-based project using MongoDB Atlas
- Existing Prisma schema configured with `provider = "mongodb"`
- Vercel deployment (for production)

---

### Step 1: Expose MongoDB Port for External Access

**In Coolify Dashboard:**

1. Go to MongoDB Container (`mongodb-main`)
2. Navigate to **General** tab
3. Find **Network** section → **Ports Mappings**
4. Change from: `127.0.0.1:27018:27017` (or current value)
5. Change to: `0.0.0.0:25433:27017`
   - `0.0.0.0` = accessible from anywhere (for Vercel access)
   - `25433` = external port (non-standard for security)
   - `27017` = internal MongoDB port
6. Click **Save**
7. Container will restart automatically

**Note:** Port `25433` follows the same pattern as PostgreSQL port `25432` (next port number).

---

### Step 2: Create Database and User on VPS

**SSH into your VPS:**

```bash
ssh deploy@77.42.71.87
```

**Connect to MongoDB:**

```bash
sudo docker exec -it t08sgc800wo08co48480ksgw mongosh -u admin -p
```

Enter the MongoDB admin password (found in Coolify → MongoDB container → General tab → Initial Password).

**Create Database and User:**

```javascript
// Switch to admin database
use admin

// Switch to the database we want to create
use project_name_db

// Create user with read/write access
db.createUser({
  user: "project_name_user",
  pwd: "mIst2008140013",  // Use your project-specific password
  roles: [{ role: "readWrite", db: "project_name_db" }]
})

// Verify user was created
db.getUsers()

// List databases to verify
show dbs

// Exit MongoDB shell
exit
```

**Database Naming Convention:**

- Database: `{project_name}_db` (e.g., `lama_blog_db`)
- User: `{project_name}_user` (e.g., `lama_blog_user`)
- Password: Usually follows pattern `mIst20081400XX` (where XX is project-specific)

---

### Step 3: Add Firewall Rules

#### Step 3a: Hetzner Cloud Firewall

1. Go to **Hetzner Cloud Console** → **Firewalls** → `dev-platform-server-firewall`
2. Click **Add rule** (red button)
3. Configure new **Inbound Rule**:
   - **Description**: `MongoDB - Port 25433`
   - **Protocol**: `TCP`
   - **Port**: `25433`
   - **Source IPs**: `0.0.0.0/0,::/0` (public access - secured by password auth)
4. Click **Save** or **Apply**

#### Step 3b: UFW Firewall (Server-level)

```bash
# SSH into VPS (if not already connected)
ssh deploy@77.42.71.87

# Allow MongoDB port 25433
sudo ufw allow 25433/tcp

# Verify port is allowed
sudo ufw status verbose
```

You should see `25433/tcp` in the output (both IPv4 and IPv6).

---

### Step 4: Update Environment Variables

**Local Development (`.env`):**

```bash
# MongoDB Database URL (Hetzner VPS)
DATABASE_URL=mongodb://project_name_user:password@77.42.71.87:25433/project_name_db?authSource=project_name_db
```

**Production (Vercel Dashboard):**

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Update `DATABASE_URL` with new Hetzner VPS connection string
3. Save and redeploy

**Connection String Format:**

- Protocol: `mongodb://` (not `mongodb+srv://`)
- Host: `77.42.71.87` (VPS IP address)
- Port: `25433` (exposed external port)
- Database: `project_name_db`
- `authSource=project_name_db` (required for authentication)

**For Coolify/Internal Deployments (if needed):**

```bash
DATABASE_URL=mongodb://project_name_user:password@t08sgc800wo08co48480ksgw:27017/project_name_db?authSource=project_name_db
```

---

### Step 5: Configure MongoDB Replica Set (Required for Prisma)

**⚠️ CRITICAL:** Prisma requires MongoDB to be configured as a replica set, even for single-node deployments. Without this, Prisma operations will fail with error: `Prisma needs to perform transactions, which requires your MongoDB server to be run as a replica set.`

#### Step 5.1: Edit Docker Compose File

**SSH into your VPS:**

```bash
ssh deploy@77.42.71.87
```

**Navigate to MongoDB container directory:**

```bash
cd /data/coolify/databases/t08sgc800wo08co48480ksgw
# (Replace 't08sgc800wo08co48480ksgw' with your actual MongoDB container ID)
```

**Edit docker-compose.yml:**

```bash
sudo nano docker-compose.yml
```

**Find the `command:` line and change it from:**

```yaml
command: mongod
```

**To:**

```yaml
command: mongod --replSet rs0 --keyFile /etc/mongo/keys/replica-set-key
```

**Also add the keyfile volume mount (if not already present) in the `volumes:` section:**

```yaml
volumes:
  - "mongodb-configdb-t08sgc800wo08co48480ksgw:/data/configdb"
  - "mongodb-db-t08sgc800wo08co48480ksgw:/data/db"
  - "/data/coolify/databases/t08sgc800wo08co48480ksgw/ssl:/etc/mongo/certs"
  - "/data/coolify/databases/t08sgc800wo08co48480ksgw/keys:/etc/mongo/keys:ro" # Add this line
  # ... other volumes
```

Save the file (Ctrl+X, Y, Enter).

#### Step 5.2: Create Replica Set Keyfile

**Create keys directory and generate keyfile:**

```bash
sudo mkdir -p /data/coolify/databases/t08sgc800wo08co48480ksgw/keys
sudo openssl rand -base64 756 > /data/coolify/databases/t08sgc800wo08co48480ksgw/keys/replica-set-key
sudo chmod 400 /data/coolify/databases/t08sgc800wo08co48480ksgw/keys/replica-set-key
sudo chown 999:999 /data/coolify/databases/t08sgc800wo08co48480ksgw/keys/replica-set-key
sudo chmod 755 /data/coolify/databases/t08sgc800wo08co48480ksgw/keys
```

**Note:**

- `999:999` is the MongoDB user/group ID in the container
- `400` permissions are required for MongoDB keyfile security
- `755` permissions on the directory allow MongoDB to access the keyfile

#### Step 5.3: Restart MongoDB Container

```bash
cd /data/coolify/databases/t08sgc800wo08co48480ksgw
sudo docker compose down
sudo docker compose up -d
```

**Verify container is running:**

```bash
sudo docker ps | grep mongo
```

Wait until the container shows "Up X minutes (healthy)".

#### Step 5.4: Initialize Replica Set

**Connect to MongoDB:**

```bash
sudo docker exec -it t08sgc800wo08co48480ksgw mongosh -u admin -p
```

Enter the admin password.

**Initialize replica set:**

```javascript
// Initialize replica set with external IP for external access
rs.initiate({
  _id: "rs0",
  members: [
    {
      _id: 0,
      host: "77.42.71.87:25433", // Use external IP:port for external access
    },
  ],
});

// Verify replica set status
rs.status();

// Check if PRIMARY
rs.status().members[0].stateStr; // Should show: 'PRIMARY'

// Exit
exit;
```

**Important:** Use the external IP (`77.42.71.87:25433`) instead of `localhost:27017` so that Prisma clients connecting from external locations (like Vercel) can properly connect to the replica set.

#### Step 5.5: Update Connection String

**Add `replicaSet` parameter to your connection string:**

**Local Development (`.env`):**

```bash
DATABASE_URL=mongodb://project_name_user:password@77.42.71.87:25433/project_name_db?authSource=project_name_db&replicaSet=rs0
```

**Production (Vercel Dashboard):**

Update `DATABASE_URL` with the same format including `&replicaSet=rs0`.

**⚠️ Important Note:** The replica set configuration is stored in MongoDB's data directory, so it should persist across container restarts. However, if Coolify regenerates the `docker-compose.yml` file and removes the `--replSet rs0` flag, you'll need to add it back manually by editing the file again.

**How to Monitor for docker-compose.yml Regeneration:**

**Option 1: Quick Check Command (Run Periodically)**

```bash
# SSH into VPS
ssh deploy@77.42.71.87

# Check if --replSet flag is present in docker-compose.yml
grep -q "replSet rs0" /data/coolify/databases/t08sgc800wo08co48480ksgw/docker-compose.yml && echo "✅ Replica set flag present" || echo "❌ Replica set flag MISSING - ACTION REQUIRED"
```

**Option 2: Symptoms When Flag is Missing**

If Coolify regenerates the file and removes the flag, you'll notice:

- ❌ **Application errors**: Prisma will fail with error: `Prisma needs to perform transactions, which requires your MongoDB server to be run as a replica set.`
- ❌ **Container may fail to start**: If MongoDB was running with replica set, removing the flag can cause startup issues
- ❌ **Database operations fail**: All Prisma queries will fail with replica set errors

**Option 3: Proactive Monitoring Script**

Create a simple monitoring script to check periodically:

```bash
# Create monitoring script
nano ~/check-mongo-replica-set.sh
```

```bash
#!/bin/bash
# Check if MongoDB replica set flag is present in docker-compose.yml

COMPOSE_FILE="/data/coolify/databases/t08sgc800wo08co48480ksgw/docker-compose.yml"

if grep -q "replSet rs0" "$COMPOSE_FILE"; then
    echo "✅ MongoDB replica set configuration OK"
    exit 0
else
    echo "❌ WARNING: MongoDB replica set flag missing in docker-compose.yml!"
    echo "   Action required: Edit the file and add '--replSet rs0' to the command line"
    exit 1
fi
```

```bash
# Make executable
chmod +x ~/check-mongo-replica-set.sh

# Test it
~/check-mongo-replica-set.sh

# Add to crontab to check daily (optional)
crontab -e
# Add: 0 9 * * * /home/deploy/check-mongo-replica-set.sh >> /home/deploy/mongo-check.log 2>&1
```

**What to Do If Flag is Missing:**

1. **Edit docker-compose.yml** to add `--replSet rs0` back:

   ```bash
   sudo nano /data/coolify/databases/t08sgc800wo08co48480ksgw/docker-compose.yml
   ```

2. **Change command line** from `mongod` to `mongod --replSet rs0 --keyFile /etc/mongo/keys/replica-set-key`

3. **Restart container**:

   ```bash
   cd /data/coolify/databases/t08sgc800wo08co48480ksgw
   sudo docker compose restart
   ```

4. **Verify replica set is still active** (should be, as config is in data directory):

   ```bash
   sudo docker exec -it t08sgc800wo08co48480ksgw mongosh -u admin -p
   rs.status()  # Should show replica set is active
   ```

---

### Step 6: Run Prisma Schema Push

**⚠️ IMPORTANT:** Prisma with MongoDB uses `db push` (no migrations needed).

```bash
# Generate Prisma Client
npx prisma generate

# Push schema to database (creates collections)
npx prisma db push
```

**What `db push` does:**

- ✅ Creates collections directly from schema (MongoDB collections = tables)
- ✅ Creates indexes as defined in schema
- ✅ No migrations needed (MongoDB doesn't use migrations like SQL databases)

---

### Step 7: Verify Migration

**Test Locally:**

```bash
# Open Prisma Studio to view database
npx prisma studio
# Opens at http://localhost:5555
```

**Verify:**

- Collections created successfully
- Data can be inserted/queried
- Indexes are created

**Test Production:**

- Deploy to Vercel
- Use the app in production
- Verify data is being saved correctly

---

### Step 8: Handle Prisma Update Issues with MongoDB (Critical)

**⚠️ CRITICAL ISSUE:** After migrating to self-hosted MongoDB, you may encounter a critical issue where Prisma's `update()` method returns `null` even when the update succeeds in MongoDB. This causes:

- ❌ **500 Internal Server Error** during update operations
- ❌ **"Cannot map null or undefined"** errors
- ❌ **Updates not persisting** despite successful database operations
- ❌ **Counter sequence failures** during create operations

**Root Cause:**

Prisma's MongoDB driver has inconsistent behavior with self-hosted MongoDB instances, particularly when:

- Using replica sets (required for Prisma)
- Updates involve nested objects or arrays
- Counter increments are performed
- The connection string includes `authSource` and `replicaSet` parameters

**Solution: MongoDB Native Driver Fallback Pattern**

Implement a fallback mechanism that:

1. Attempts Prisma's `update()` first
2. Falls back to MongoDB native driver if Prisma returns `null` or fails
3. Fetches the updated record using Prisma after native update

#### Step 8.1: Install MongoDB Native Driver

```bash
npm install mongodb
```

#### Step 8.2: Create Update Helper Function

Add this helper function to your repository file (e.g., `api/employee-management/repository.mjs`):

```javascript
import { MongoClient } from "mongodb";

/**
 * Helper function to perform MongoDB update with native driver fallback
 * This is needed because Prisma's update() can return null with MongoDB
 * @param {string} prismaModelName - Prisma model name (camelCase, e.g., "employee", "project", "projectEmployee")
 * @param {string} whereField - Field name to match (e.g., "employeeId", "projectId", "empProjectId")
 * @param {any} whereValue - Value to match
 * @param {object} updateData - Data to update
 * @param {function} fetchAfterUpdate - Function to fetch the updated record using Prisma
 */
async function updateWithMongoFallback(prismaModelName, whereField, whereValue, updateData, fetchAfterUpdate) {
  // Convert Prisma model name to MongoDB collection name (PascalCase)
  const collectionNameMap = {
    employee: "Employee",
    project: "Project",
    projectEmployee: "ProjectEmployee",
    // Add other models as needed
  };
  const mongoCollectionName = collectionNameMap[prismaModelName] || prismaModelName;

  // Try Prisma update first
  let updateSucceeded = false;
  let record = null;

  try {
    const updateResult = await prisma[prismaModelName].update({
      where: { [whereField]: whereValue },
      data: updateData,
    });
    if (updateResult) {
      record = updateResult;
      updateSucceeded = true;
    }
  } catch (updateError) {
    if (updateError.code === "P2025") {
      throw new Error(`Record not found with ${whereField} ${whereValue}`);
    }
    // Continue to fallback for other errors
  }

  // If Prisma update failed or returned null, use MongoDB native driver
  if (!updateSucceeded) {
    const databaseUrl = process.env.NG_APP_PRISMA_URL || process.env.NG_APP_MONGODB_URI || process.env.DATABASE_URL || process.env.MONGODB_URI;

    if (!databaseUrl) {
      throw new Error("DATABASE_URL not found in environment variables");
    }

    const client = new MongoClient(databaseUrl);
    try {
      await client.connect();

      // Extract database name from connection string
      const dbName = databaseUrl.split("/").pop()?.split("?")[0] || "your_database_name";
      const db = client.db(dbName);
      const collection = db.collection(mongoCollectionName);

      // Perform the update using native driver
      const updateResult = await collection.updateOne({ [whereField]: whereValue }, { $set: updateData });

      if (updateResult.matchedCount === 0) {
        throw new Error(`No record found with ${whereField} ${whereValue}`);
      }

      // Fetch the updated record using Prisma
      record = await fetchAfterUpdate();

      if (!record) {
        throw new Error(`Record not found after MongoDB native update for ${whereField} ${whereValue}`);
      }
    } finally {
      await client.close();
    }
  }

  return record;
}
```

#### Step 8.3: Update Your Update Functions

**Example: Update Employee Function**

```javascript
export async function updateEmployee(employeeId, payload) {
  // ... validation and data preparation ...

  // Check if record exists
  const existingRecord = await prisma.employee.findUnique({
    where: { employeeId: Number(employeeId) },
  });

  if (!existingRecord) {
    throw new Error(`Employee not found with employeeId ${employeeId}`);
  }

  // Build update data object (only include provided fields)
  const updateData = {};
  if (payload.employeeName !== undefined) {
    updateData.employeeName = payload.employeeName;
  }
  // ... add other fields as needed ...

  // If no fields to update, return existing record
  if (Object.keys(updateData).length === 0) {
    return mapEmployee(existingRecord);
  }

  // Use MongoDB native driver fallback for update
  const record = await updateWithMongoFallback("employee", "employeeId", Number(employeeId), updateData, async () => {
    return await prisma.employee.findUnique({
      where: { employeeId: Number(employeeId) },
    });
  });

  if (!record) {
    throw new Error(`Failed to update employee with employeeId ${employeeId}`);
  }

  return mapEmployee(record);
}
```

**Apply the same pattern to:**

- `updateProject()`
- `updateProjectEmployee()`
- Any other update operations

#### Step 8.4: Fix Counter Sequence Issues

**Problem:** Prisma's `counter.update()` also returns `null` when incrementing sequence values.

**Solution:** Add MongoDB native driver fallback to `getNextSequenceValue()`:

```javascript
async function getNextSequenceValue(key, startAt) {
  const seed = startAt ?? DEFAULT_COUNTER_SEEDS[key] ?? 1;
  const existing = await getCounterValue(key);
  if (!existing) {
    await prisma.counter.create({
      data: {
        key,
        value: seed - 1,
      },
    });
  }

  // Try Prisma update first
  let updateResult = null;
  try {
    updateResult = await prisma.counter.update({
      where: { key },
      data: {
        value: { increment: 1 },
      },
      select: { value: true },
    });
  } catch (error) {
    console.warn(`[getNextSequenceValue] Prisma counter update failed for key ${key}, using MongoDB native driver:`, error.message);
  }

  // If Prisma update failed or returned null, use MongoDB native driver
  if (!updateResult || !updateResult.value) {
    const databaseUrl = process.env.NG_APP_PRISMA_URL || process.env.NG_APP_MONGODB_URI || process.env.DATABASE_URL || process.env.MONGODB_URI;

    if (!databaseUrl) {
      throw new Error("DATABASE_URL not found in environment variables");
    }

    const client = new MongoClient(databaseUrl);
    try {
      await client.connect();

      // Extract database name from connection string
      const dbName = databaseUrl.split("/").pop()?.split("?")[0] || "your_database_name";
      const db = client.db(dbName);
      const collection = db.collection("Counter");

      // Use MongoDB $inc to increment the counter
      const mongoResult = await collection.findOneAndUpdate(
        { key },
        { $inc: { value: 1 } },
        {
          returnDocument: "after",
          upsert: false, // Don't create if doesn't exist (should exist from create above)
        }
      );

      if (!mongoResult || !mongoResult.value) {
        throw new Error(`Failed to increment counter for key ${key}`);
      }

      // Fetch the updated value using Prisma
      const counter = await prisma.counter.findUnique({
        where: { key },
        select: { value: true },
      });

      if (!counter) {
        throw new Error(`Counter not found after MongoDB increment for key ${key}`);
      }

      return counter.value;
    } finally {
      await client.close();
    }
  }

  return updateResult.value;
}
```

#### Step 8.5: Add Null Checks to Mapping Functions

**Problem:** Mapping functions may receive `null` values, causing errors.

**Solution:** Add safety checks:

```javascript
function mapProjectEmployee(item, projectLookup, employeeLookup) {
  if (!item) {
    throw new Error("Cannot map null or undefined ProjectEmployee item");
  }
  // ... rest of mapping logic ...
}
```

#### Step 8.6: Verify the Fix

**Test Update Operations:**

1. **Test Employee Update:**

   - Update an employee's name, email, or other fields
   - Verify changes persist in database
   - Check for no `500 Internal Server Error`

2. **Test Project Update:**

   - Update project details
   - Verify changes persist
   - Check logs for fallback usage (if Prisma fails)

3. **Test Project-Employee Update:**

   - Update assignment details (role, allocation, active status)
   - Verify changes persist
   - Check for no null reference errors

4. **Test Create Operations:**
   - Create new employee/project/assignment
   - Verify sequence numbers increment correctly
   - Check for no counter errors

**Monitor Logs:**

Watch for these log messages indicating fallback usage:

- `[updateProjectEmployee] Prisma update returned null, trying MongoDB native driver`
- `[updateProjectEmployee] Using MongoDB native driver to perform update`
- `[getNextSequenceValue] Prisma counter update failed, using MongoDB native driver`

**Expected Behavior:**

- ✅ Updates succeed even when Prisma returns `null`
- ✅ No `500 Internal Server Error` during updates
- ✅ No "Cannot map null" errors
- ✅ Changes persist correctly in database
- ✅ Counter increments work reliably

---

### Prisma MongoDB Migration Checklist

**Before Migration:**

- [ ] Backup existing MongoDB Atlas data (export if needed)
- [ ] Note all environment variables
- [ ] Document current Prisma schema

**During Migration:**

- [ ] Expose MongoDB port in Coolify (`0.0.0.0:25433:27017`)
- [ ] Create database on Hetzner VPS (`project_name_db`)
- [ ] Create database user with password
- [ ] Add Hetzner Cloud Firewall rule for port 25433
- [ ] Add UFW firewall rule for port 25433
- [ ] Configure MongoDB replica set (edit docker-compose.yml, create keyfile, initialize)
- [ ] Update `.env` file with new `DATABASE_URL` (include `&replicaSet=rs0`)
- [ ] Run `prisma generate`
- [ ] Run `prisma db push`
- [ ] Verify collections created in Prisma Studio
- [ ] **Install MongoDB native driver:** `npm install mongodb`
- [ ] **Implement MongoDB fallback pattern** (see Step 8) - Critical for update operations
- [ ] **Test all CRUD operations** (especially updates) to verify fallback works

**After Migration:**

- [ ] Test locally (`npm run dev`)
- [ ] Update Vercel environment variables
- [ ] Deploy to production
- [ ] Test production deployment
- [ ] Verify all features work correctly
- [ ] Monitor for any issues

---

### Prisma MongoDB Common Issues & Solutions

#### Issue 1: "Authentication failed"

**Solution:**

- ✅ Verify admin password is correct (check Coolify → MongoDB → General → Initial Password)
- ✅ Verify user was created correctly (`db.getUsers()`)
- ✅ Check `authSource` parameter in connection string matches database name

#### Issue 2: Connection timeout

**Solution:**

- ✅ Check firewall rules (Hetzner Cloud Firewall + UFW)
- ✅ Verify port exposure (25433 for Vercel, 27017 for internal)
- ✅ Check MongoDB container is running (`sudo docker ps | grep mongo`)

#### Issue 3: "Cannot read property 'find' of undefined"

**Solution:**

- ✅ Run `npx prisma generate` to regenerate Prisma Client
- ✅ Verify `DATABASE_URL` is set correctly
- ✅ Check Prisma schema uses `provider = "mongodb"`

#### Issue 4: "Prisma needs to perform transactions, which requires your MongoDB server to be run as a replica set"

**Error:** `PrismaClientKnownRequestError: P2031: Prisma needs to perform transactions, which requires your MongoDB server to be run as a replica set.`

**Solution:**

- ✅ Configure MongoDB as a single-node replica set (see Step 5 above)
- ✅ Ensure `docker-compose.yml` includes `--replSet rs0` flag in the command
- ✅ Initialize replica set with `rs.initiate()` command
- ✅ Use external IP (`77.42.71.87:25433`) in replica set configuration for external access
- ✅ Add `&replicaSet=rs0` to connection string
- ✅ Reconfigure replica set host if using `localhost:27017` (change to external IP:port)

**Important Note:** The replica set configuration is stored in MongoDB's data directory, so it should persist across container restarts. However, if Coolify regenerates the `docker-compose.yml` file and removes the `--replSet rs0` flag, you'll need to add it back manually by editing the file.

#### Issue 5: Replica set configuration lost after container restart

**Symptoms:**

- ❌ Prisma errors: `Prisma needs to perform transactions, which requires your MongoDB server to be run as a replica set.`
- ❌ Container fails to start or shows errors
- ❌ Database operations fail

**Root Cause:**

- Coolify regenerated `docker-compose.yml` and removed `--replSet rs0` flag
- Replica set configuration is stored in data directory (persists), but MongoDB needs the flag to start with replica set enabled

**Solution:**

1. **Check if flag is missing:**

   ```bash
   grep -q "replSet rs0" /data/coolify/databases/t08sgc800wo08co48480ksgw/docker-compose.yml && echo "✅ OK" || echo "❌ MISSING"
   ```

2. **Re-add the flag:**

   ```bash
   sudo nano /data/coolify/databases/t08sgc800wo08co48480ksgw/docker-compose.yml
   # Change: command: mongod
   # To: command: mongod --replSet rs0 --keyFile /etc/mongo/keys/replica-set-key
   ```

3. **Restart container:**

   ```bash
   cd /data/coolify/databases/t08sgc800wo08co48480ksgw
   sudo docker compose restart
   ```

4. **Verify replica set is still active:**

   ```bash
   sudo docker exec -it t08sgc800wo08co48480ksgw mongosh -u admin -p
   rs.status()  # Should show replica set is active
   ```

**Prevention/Monitoring:**

- ✅ Run periodic checks (see Step 5.5 monitoring section)
- ✅ Monitor application errors (they'll indicate if replica set is broken)
- ✅ Set up monitoring script to check docker-compose.yml periodically

#### Issue 6: Prisma update() returns null - Updates not persisting

**⚠️ CRITICAL:** This is a common issue with Prisma and self-hosted MongoDB.

**Symptoms:**

- ❌ **500 Internal Server Error** during update operations (PUT requests)
- ❌ **"Cannot map null or undefined"** errors in logs
- ❌ **Updates appear to succeed** but don't persist in database
- ❌ **Network requests show 200 OK** but data doesn't change
- ❌ **Error:** `TypeError: Cannot destructure property 'value' of '(intermediate value)' as it is null` (for counters)

**Root Cause:**

Prisma's MongoDB driver has inconsistent behavior with self-hosted MongoDB instances, particularly when:

- Using replica sets (required for Prisma)
- Updates involve nested objects or arrays
- Counter increments are performed
- Connection string includes `authSource` and `replicaSet` parameters

**Solution:**

Implement MongoDB native driver fallback pattern (see **Step 8: Handle Prisma Update Issues with MongoDB** above for complete implementation).

**Quick Fix Checklist:**

1. ✅ Install `mongodb` package: `npm install mongodb`
2. ✅ Create `updateWithMongoFallback()` helper function
3. ✅ Update all `update*()` functions to use the helper
4. ✅ Fix `getNextSequenceValue()` with MongoDB native driver fallback
5. ✅ Add null checks to mapping functions
6. ✅ Test all CRUD operations

**Verification:**

After implementing the fix, you should see:

- ✅ Updates succeed and persist correctly
- ✅ No `500 Internal Server Error` during updates
- ✅ No "Cannot map null" errors
- ✅ Counter increments work reliably
- ✅ Logs may show: `Using MongoDB native driver to perform update` (this is expected and OK)

**Note:** The fallback pattern is transparent to your application - it tries Prisma first, and only uses MongoDB native driver if Prisma fails or returns null. This ensures maximum compatibility while maintaining reliability.

---

### Example: Complete Migration for a Prisma MongoDB Project

**Project: Lama Blog**  
**From:** MongoDB Atlas  
**To:** Hetzner VPS MongoDB  
**Status:** ✅ Complete (December 27, 2025)

**Files Updated:**

- ✅ `.env` - Updated `DATABASE_URL` from `mongodb+srv://...` to `mongodb://...`
- ✅ Prisma schema - No changes needed (uses standard MongoDB)

**Database Created:**

- ✅ Database: `lama_blog_db`
- ✅ User: `lama_blog_user`
- ✅ Password: `mIst2008140013`
- ✅ Collections: Account, Session, User, VerificationToken, Category, Post, Comment

**Infrastructure Changes:**

- ✅ MongoDB port mapping: `0.0.0.0:25433:27017`
- ✅ Hetzner Cloud Firewall rule: Port 25433
- ✅ UFW firewall rule: Port 25433
- ✅ MongoDB replica set configured: `rs0` (single-node replica set with keyfile)
- ✅ Replica set initialized with external IP: `77.42.71.87:25433`

**Result:**

- ✅ No migration errors
- ✅ All collections created successfully
- ✅ Production deployment verified (Vercel + Hetzner VPS)
- ✅ All features working correctly

---

### Prisma MongoDB Quick Reference

**Connection Strings:**

```bash
# Vercel/Production (External Access)
DATABASE_URL=mongodb://user:password@77.42.71.87:25433/database_name?authSource=database_name&replicaSet=rs0

# Coolify/Internal (Internal Access)
DATABASE_URL=mongodb://user:password@t08sgc800wo08co48480ksgw:27017/database_name?authSource=database_name&replicaSet=rs0
```

**⚠️ Important:** Always include `&replicaSet=rs0` in the connection string when using Prisma with MongoDB.

**Prisma Commands:**

```bash
# Generate Prisma Client
npx prisma generate

# Push schema to database (creates collections)
npx prisma db push

# Open database UI
npx prisma studio
```

**Key Differences from PostgreSQL:**

- ✅ Uses `db push` (not migrations)
- ✅ Connection string uses `mongodb://` (not `mongodb+srv://`)
- ✅ Collections created automatically (no tables)
- ✅ No schema migrations needed
- ✅ `authSource` parameter required in connection string
- ⚠️ **Replica set required:** Prisma requires MongoDB to be configured as a replica set (even single-node)
- ⚠️ **Connection string:** Must include `&replicaSet=rs0` parameter
- ⚠️ **Prisma update() issues:** Prisma's `update()` may return `null` with self-hosted MongoDB - implement MongoDB native driver fallback (see Step 8)

**Security Notes:**

**Current Security Measures:**

- ✅ Password authentication required (strong password)
- ✅ Non-standard port (25433) reduces automated scans
- ✅ Dedicated user with limited privileges (readWrite only, not admin)
- ✅ Multiple firewall layers (Hetzner Cloud Firewall + UFW)
- ✅ Replica set keyfile authentication (internal security)
- ⚠️ Database is publicly accessible, but protected by authentication

**Security Assessment:**

**For Demo/Personal Projects: ✅ ACCEPTABLE**

- The current setup is reasonably safe for demo and personal projects
- Multiple layers of authentication and firewalls provide good protection
- Non-standard port reduces automated attack attempts
- Password authentication prevents unauthorized access

**For Production with Sensitive Data: ⚠️ CONSIDER ENHANCEMENTS**
If you're storing sensitive data (financial, personal information, etc.), consider:

- **VPN Access**: Set up WireGuard VPN instead of public port exposure
- **IP Whitelisting**: Restrict access to specific IPs in firewall (Vercel IP ranges)
- **TLS/SSL Encryption**: Enable MongoDB TLS for encrypted connections
- **Rate Limiting**: Implement connection rate limiting at firewall level
- **Monitoring**: Set up intrusion detection and monitoring

**Best Practice:**

- Use strong, unique passwords for each database user
- Regularly rotate passwords
- Monitor access logs for suspicious activity
- Keep MongoDB and Docker updated
- Review firewall logs periodically

**Trade-off:**

- Public port exposure is necessary for Vercel/Netlify access
- Authentication provides protection, but service is discoverable
- For most projects, this balance is acceptable

---

**Status:** ✅ Tested and verified with Lama Blog project (December 27, 2025)

---

## 🚀 BACKEND DEPLOYMENT

### Step 1: Prepare Your Backend Project

**Requirements:**

- Your backend must have a `Dockerfile` OR
- Coolify can auto-detect Node.js projects

**Example Dockerfile (Node.js/Express):**

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Expose port
EXPOSE 3000

# Start application
CMD ["node", "server.js"]
```

### Step 2: Deploy Backend in Coolify

1. **In Coolify Dashboard**:

   - Click "New Application"
   - Select "Git Repository"
   - **Connect GitHub/GitLab**:
     - Authorize Coolify
     - Select your repository
   - **Or use "Public Repository"**:
     - Enter repository URL
     - Add deploy key (Coolify will generate)

2. **Configure Application**:

   - **Name**: `project1-api` (or your project name)
   - **Build Pack**: `Dockerfile` (if you have one) or `Node.js`
   - **Port**: `3000` (or your app's port)
   - **Environment Variables**:

     ```bash
     NODE_ENV=production
     PORT=3000
     DATABASE_URL=postgresql://postgres:PASSWORD@postgres-main:5432/project1_db
     MONGODB_URI=mongodb://admin:PASSWORD@mongodb-main:27017/project1_db?authSource=admin
     JWT_SECRET=your_jwt_secret
     # ... all your other env vars
     ```

   - **Domain** (optional):
     - Subdomain: `api.project1.yourdomain.com`
     - Enable SSL: Yes (Let's Encrypt)
   - **Resources**:
     - CPU: 0.5 (or adjust based on needs)
     - Memory: 512MB (or adjust)
   - Click "Deploy"

3. **Wait for Deployment**:

   - Coolify will:
     - Clone repository
     - Build Docker image
     - Start container
     - Set up SSL (if domain provided)
   - Check logs for any errors

4. **Verify Deployment**:
   - Visit your API URL: `https://api.project1.yourdomain.com`
   - Or: `http://YOUR_SERVER_IP:PORT` (if no domain)

### Step 3: Repeat for All Backends

- Deploy each backend project following the same steps
- Use different subdomains:
  - `api.project1.yourdomain.com`
  - `api.project2.yourdomain.com`
  - `api.project3.yourdomain.com`
  - etc.

### Step 4: Update Backend Environment Variables

**For each backend**, update these in Coolify:

- Database connection strings
- API keys
- JWT secrets
- Any service URLs

**Important**: Use internal Docker DNS names:

- ✅ `postgres-main:5432` (not `localhost:5432`)
- ✅ `mongodb-main:27017` (not `localhost:27017`)

---

## 🔷 .NET/C# BACKEND DEPLOYMENT (ASP.NET Core)

### .NET Migration Overview

This section covers deploying **.NET/C# ASP.NET Core backends** from Render/Free Tiers to Hetzner VPS using Coolify. This is specifically for projects using:

- ASP.NET Core (C#)
- Entity Framework Core
- PostgreSQL database
- Docker containerization

### .NET Migration Prerequisites

- .NET backend project with Dockerfile
- PostgreSQL database already created on VPS (see [Database Setup](#️-database-setup))
- GitHub repository (public or private with deploy key)
- Existing data in CSV format (optional, for seeding)

---

### Step 1: Prepare Database on VPS

**Before deploying backend, ensure database is ready:**

```bash
# SSH to VPS
ssh deploy@77.42.71.87

# Connect to PostgreSQL
sudo docker exec -it xok0c8w8808g8080og4gccwc psql -U postgres

# Create database and user
CREATE DATABASE your_project_db;
CREATE USER your_project_user WITH PASSWORD 'your_strong_password';
GRANT ALL PRIVILEGES ON DATABASE your_project_db TO your_project_user;

# Connect to new database
\c your_project_db

# Grant schema privileges (important for Entity Framework)
GRANT ALL ON SCHEMA public TO your_project_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_project_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_project_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO your_project_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO your_project_user;

\q
```

**Connection String Pattern:**

```bash
# For Coolify deployments (internal)
DATABASE_URL="postgresql://your_project_user:password@xok0c8w8808g8080og4gccwc:5432/your_project_db"

# For external access (if needed)
DATABASE_URL="postgresql://your_project_user:password@77.42.71.87:25432/your_project_db"
```

---

### Step 2: Configure Dockerfile

**Example Dockerfile for .NET 8.0 Backend:**

```dockerfile
# ========================================================================
# CONSOLIDATED .NET SERVER DOCKERFILE
# Real Industrial Application Backend
# Supports both localhost and production (Coolify)
# ========================================================================

# Use the official .NET 8.0 runtime as base image
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 80
EXPOSE 443

# Use the official .NET 8.0 SDK for building
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Install build tools for C++ compilation (if needed)
RUN apt-get update && apt-get install -y \
    build-essential \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy project file and restore dependencies
COPY ["Server/YourProject/YourProject.csproj", "YourProject/"]
RUN dotnet restore "YourProject/YourProject.csproj"

# Copy all source code from Server directory
COPY Server/ .

# Copy native libraries (if needed)
# COPY EngineMock/ ./EngineMock/

WORKDIR "/src/YourProject"

# Compile native libraries (if needed)
# WORKDIR "/src/EngineMock"
# RUN g++ -shared -fPIC -o your_library.so your_library.cpp -std=c++17

# Build the application
WORKDIR "/src/YourProject"
RUN dotnet build "YourProject.csproj" -c Release -o /app/build

# Publish the application
FROM build AS publish
RUN dotnet publish "YourProject.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Final runtime image
FROM base AS final
WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy published application
COPY --from=publish /app/publish .

# Copy native libraries (if needed)
# COPY --from=build /src/EngineMock/your_library.so .

# Set environment variables
ENV ASPNETCORE_ENVIRONMENT=Production
ENV ASPNETCORE_URLS=http://+:10000
ENV DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=1

# Create non-root user for security
RUN adduser --disabled-password --gecos '' appuser && chown -R appuser /app
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:10000/health || exit 1

# Start the application
ENTRYPOINT ["dotnet", "YourProject.dll"]
```

**Key Points:**

- Port: `10000` (set via `ASPNETCORE_URLS=http://+:10000`)
- Health endpoint: `/health` (must be implemented in your app)
- Non-root user: `appuser` (security best practice)
- Multi-stage build: Reduces final image size

---

### Step 3: Configure Program.cs for Database Connection

**Update `Program.cs` to handle SSL dynamically:**

```csharp
using Npgsql;

// ... existing code ...

// Parse connection string and configure SSL dynamically
var connectionString = Environment.GetEnvironmentVariable("DATABASE_URL")
    ?? throw new InvalidOperationException("DATABASE_URL not set");

var uri = new Uri(connectionString);
var host = uri.Host;
var port = uri.Port;
var username = uri.UserInfo.Split(':')[0];
var password = uri.UserInfo.Split(':')[1];
var database = uri.AbsolutePath.TrimStart('/');

// Parse query parameters
var queryParams = System.Web.HttpUtility.ParseQueryString(uri.Query);

// Check if SSL is required
var requireSsl = queryParams.ContainsKey("sslmode") &&
                 (queryParams["sslmode"].Equals("require", StringComparison.OrdinalIgnoreCase) ||
                  queryParams["sslmode"].Equals("prefer", StringComparison.OrdinalIgnoreCase));

var npgsqlBuilder = new NpgsqlConnectionStringBuilder
{
    Host = host,
    Port = port,
    Username = username,
    Password = password,
    Database = database,
    SslMode = requireSsl ? SslMode.Require : SslMode.Disable, // Dynamically set SSL mode
    Pooling = true,
    MinPoolSize = 1,
    MaxPoolSize = 20,
    ConnectionLifetime = 300,
    Timeout = 30,
    CommandTimeout = 30
};

var finalConnectionString = npgsqlBuilder.ToString();

// Use finalConnectionString in your DbContext configuration
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(finalConnectionString));
```

**Add Health Endpoint:**

```csharp
// Add health check endpoint
app.MapGet("/health", () => Results.Ok(new {
    status = "Healthy",
    time = DateTime.UtcNow
}));
```

---

### Step 4: Deploy Backend in Coolify

**1. Create New Application:**

- Go to Coolify Dashboard → "New Application"
- Select "Public Repository" (or connect GitHub/GitLab)
- Enter repository URL: `https://github.com/yourusername/your-repo`
- Branch: `main` (or your default branch)

**2. Configure General Settings:**

- **Name**: `your-project-backend` (or your project name)
- **Build Pack**: `Dockerfile`
- **Base Directory**: `/your-project-backend/Server` (path to directory containing Dockerfile)
- **Dockerfile Location**: `/Dockerfile` (relative to Base Directory)
- **Domains**: Leave empty (will use sslip.io domain) or add custom domain

**3. Configure Network Settings:**

- **Ports Exposes**: `3000` (read-only, Coolify auto-detects)
- **Ports Mappings**: `10000:10000` (map container port 10000 to host port 10000)
- **Custom Docker Options**: Leave empty

**4. Configure Container Labels (Traefik/Caddy):**

Add these labels for reverse proxy routing:

```text
traefik.enable=true
traefik.http.middlewares.gzip.compress=true
traefik.http.middlewares.redirect-to-https.redirectscheme.scheme=https
traefik.http.routers.http-0-your-app-id.entryPoints=http
traefik.http.routers.http-0-your-app-id.middlewares=gzip
traefik.http.routers.http-0-your-app-id.rule=Host(`your-app-id.77.42.71.87.sslip.io`) && PathPrefix(`/`)
traefik.http.routers.http-0-your-app-id.service=http-0-your-app-id
traefik.http.services.http-0-your-app-id.loadbalancer.server.port=10000
traefik.http.routers.https-0-your-app-id.entryPoints=https
traefik.http.routers.https-0-your-app-id.middlewares=gzip
traefik.http.routers.https-0-your-app-id.rule=Host(`your-app-id.77.42.71.87.sslip.io`) && PathPrefix(`/`)
traefik.http.routers.https-0-your-app-id.service=http-0-your-app-id
traefik.http.routers.https-0-your-app-id.tls=true
traefik.http.routers.https-0-your-app-id.tls.certresolver=letsencrypt
```

**Note:** Replace `your-app-id` with your actual Coolify application ID (visible in URL or container name).

**5. Configure Environment Variables:**

Add these in Coolify → Your Application → Environment Variables:

```bash
# Database Connection (use container name for internal access)
DATABASE_URL=postgresql://your_project_user:password@xok0c8w8808g8080og4gccwc:5432/your_project_db

# Frontend URL (for CORS)
FRONTEND_URL=https://your-frontend.netlify.app

# ASP.NET Core Configuration
ASPNETCORE_ENVIRONMENT=Production
ASPNETCORE_URLS=http://+:10000

# Other environment variables
PORT=3000
HOST=0.0.0.0
```

**Important Settings:**

- ✅ **Available at Buildtime**: Unchecked (not needed for .NET)
- ✅ **Available at Runtime**: Checked (required)
- ✅ **Is Literal?**: Unchecked
- ✅ **Is Multiline?**: Unchecked

**6. Configure Healthcheck:**

- **Method**: `GET`
- **Scheme**: `http`
- **Host**: `localhost`
- **Port**: `10000` (NOT 80!)
- **Path**: `/health` (NOT `/`)
- **Return Code**: `200`
- **Response Text**: `Healthy` (optional, but recommended)
- **Interval**: `5`
- **Timeout**: `5`
- **Retries**: `10`
- **Start Period**: `5`
- ✅ **Enable Healthcheck**: Checked

**7. Configure Resource Limits:**

- **Number of CPUs**: `1` (or adjust based on needs)
- **Maximum Memory Limit**: `1024m` (1GB) for demo projects, `1536m` (1.5GB) for production
- Leave other fields as `0` (default)

**8. Deploy:**

- Click "Deploy" button
- Monitor build logs
- Wait for deployment to complete (5-10 minutes for first build)

---

### Step 5: Database Seeding (CSV Data Migration)

**If you have existing data in CSV format, create a seed script:**

**1. Add CsvHelper Package:**

```xml
<!-- In YourProject.csproj -->
<ItemGroup>
    <PackageReference Include="CsvHelper" Version="30.0.1" />
</ItemGroup>
```

**2. Create SeedDatabase.cs:**

```csharp
using CsvHelper;
using CsvHelper.Configuration;
using Microsoft.EntityFrameworkCore;
using System.Globalization;

namespace YourProject;

public static class SeedDatabase
{
    private const string CSV_DIR = "/path/to/your/csv/files"; // Update this path

    public static async Task RunSeedAsync(string[] args)
    {
        // Load environment variables from .env file (for local testing)
        if (File.Exists(".env"))
        {
            foreach (var line in File.ReadAllLines(".env"))
            {
                if (string.IsNullOrWhiteSpace(line) || line.StartsWith("#"))
                    continue;

                var parts = line.Split('=', 2);
                if (parts.Length == 2)
                {
                    Environment.SetEnvironmentVariable(parts[0].Trim(), parts[1].Trim());
                }
            }
        }

        var connectionString = Environment.GetEnvironmentVariable("DATABASE_URL")
            ?? throw new InvalidOperationException("DATABASE_URL not set");

        var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
        optionsBuilder.UseNpgsql(connectionString);

        using var context = new AppDbContext(optionsBuilder.Options);

        // Ensure database is created
        await context.Database.EnsureCreatedAsync();

        // Seed data
        await SeedMotorReadingsAsync(context);
        await SeedAlertsAsync(context);
        await SeedMachinesAsync(context);

        Console.WriteLine("✅ Database seeding completed!");
    }

    private static async Task SeedMotorReadingsAsync(AppDbContext context)
    {
        Console.WriteLine("🌱 Seeding MotorReadings...");

        var csvPath = Path.Combine(CSV_DIR, "MotorReadings.csv");
        if (!File.Exists(csvPath))
        {
            Console.WriteLine($"⚠️  CSV file not found: {csvPath}");
            return;
        }

        var config = new CsvConfiguration(CultureInfo.InvariantCulture)
        {
            HasHeaderRecord = true,
            TrimOptions = TrimOptions.Trim
        };

        using var reader = new StreamReader(csvPath);
        using var csv = new CsvReader(reader, config);

        var records = csv.GetRecords<MotorReadingCsvRow>().ToList();

        int successCount = 0;
        foreach (var record in records)
        {
            try
            {
                await context.MotorReadings.Upsert(
                    new MotorReading
                    {
                        Id = ParseInt(record.Id),
                        Speed = ParseDouble(record.Speed),
                        Temperature = ParseDouble(record.Temperature),
                        Timestamp = ParseDateTime(record.Timestamp),
                        // ... map other fields
                    })
                    .On(m => m.Id)
                    .WhenMatched(m => new MotorReading
                    {
                        // Update fields if exists
                    })
                    .RunAsync();

                successCount++;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Error seeding record {record.Id}: {ex.Message}");
            }
        }

        // Reset PostgreSQL sequence after seeding
        if (successCount > 0)
        {
            var maxId = records.Max(r => ParseInt(r.Id));
            await context.Database.ExecuteSqlRawAsync(
                $"SELECT setval(pg_get_serial_sequence('\"MotorReadings\"', 'Id'), {maxId}, false);");
            Console.WriteLine($"✅ Reset sequence to continue from ID {maxId + 1}");
        }

        Console.WriteLine($"✅ Seeded {successCount} MotorReadings");
    }

    // Helper methods for parsing
    private static int ParseInt(string value) =>
        int.TryParse(value, out var result) ? result : 0;

    private static double ParseDouble(string value) =>
        double.TryParse(value, out var result) ? result : 0.0;

    private static DateTime ParseDateTime(string value) =>
        DateTime.TryParse(value, out var result) ? result : DateTime.UtcNow;

    // CSV row classes
    private class MotorReadingCsvRow
    {
        public string Id { get; set; } = "";
        public string Speed { get; set; } = "";
        public string Temperature { get; set; } = "";
        public string Timestamp { get; set; } = "";
        // ... other fields
    }
}
```

**3. Add Seed Command to Program.cs:**

```csharp
// In Program.cs, before building the app
if (args.Length > 0 && args[0].Equals("seed", StringComparison.OrdinalIgnoreCase))
{
    await SeedDatabase.RunSeedAsync(args);
    return;
}

// ... rest of Program.cs
```

**4. Configure Entity Framework for Auto-Incrementing IDs:**

```csharp
// In AppDbContext.cs
protected override void OnModelCreating(ModelBuilder modelBuilder)
{
    modelBuilder.Entity<MotorReading>(entity =>
    {
        entity.HasKey(e => e.Id);
        entity.Property(e => e.Id).ValueGeneratedOnAdd(); // Auto-increment after seeding
        // ... other configurations
    });
}
```

**5. Run Seed Script:**

```bash
# Locally (for testing)
cd Server/YourProject
dotnet run -- seed

# Or in Coolify (via one-time container execution)
# This is typically done locally before deployment
```

---

### Step 6: Update Frontend Environment Variables

**In Netlify/Vercel Dashboard:**

1. Go to Site Settings → Environment Variables
2. Update backend URLs:

```bash
# Old (Render)
VITE_API_URL=https://your-backend.onrender.com
VITE_SIGNALR_URL=https://your-backend.onrender.com/hub

# New (Hetzner VPS - Coolify)
VITE_API_URL=https://your-app-id.77.42.71.87.sslip.io
VITE_SIGNALR_URL=https://your-app-id.77.42.71.87.sslip.io/hub
```

**Note:** sslip.io domains may show certificate warnings. For production, use a proper domain.

**3. Trigger Redeploy:**

- Netlify: Automatically redeploys on environment variable change
- Vercel: May need manual redeploy

---

### Step 7: Verify Deployment

**1. Check Container Status:**

```bash
ssh deploy@77.42.71.87
sudo docker ps --filter 'name=your-app-id' --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
```

**Expected:** Container shows "Up X minutes (healthy)"

**2. Test Health Endpoint:**

```bash
curl https://your-app-id.77.42.71.87.sslip.io/health
```

**Expected:** `{"status":"Healthy","time":"2025-12-26T..."}`

**3. Test API Endpoints:**

```bash
curl https://your-app-id.77.42.71.87.sslip.io/api/your-endpoint
```

**4. Check Logs:**

```bash
# In Coolify UI: Go to Application → Logs
# Or via SSH:
sudo docker logs your-app-id-container-name --tail 50
```

---

### Step 8: Fix Common Issues

#### Issue 1: Permission Denied During Deployment

**Error:** `tee: /data/coolify/applications/.../.env: Permission denied`

**Solution:**

```bash
ssh deploy@77.42.71.87
sudo chown -R 9999:root /data/coolify/applications/YOUR_APP_ID/
sudo chmod -R 755 /data/coolify/applications/YOUR_APP_ID/
```

#### Issue 2: Healthcheck Failing

**Error:** Healthcheck shows as unhealthy

**Solution:**

- Verify health endpoint exists: `app.MapGet("/health", ...)`
- Check port is `10000` (not `80`)
- Check path is `/health` (not `/`)
- Verify container is listening on port 10000

#### Issue 3: Mixed Content Errors (HTTPS Frontend → HTTP Backend)

**Error:** Browser blocks HTTP requests from HTTPS page

**Solution:**

- Use HTTPS URLs in frontend environment variables
- Configure HTTPS in Coolify (Container Labels with TLS)
- Note: sslip.io domains may show certificate warnings (acceptable for testing)

#### Issue 4: Database Connection Fails

**Error:** Cannot connect to database

**Solution:**

- Verify database container name: `xok0c8w8808g8080og4gccwc`
- Check connection string uses container name (not `localhost`)
- Verify database user has proper privileges
- Test connection from VPS: `sudo docker exec -it xok0c8w8808g8080og4gccwc psql -U your_user -d your_db`

#### Issue 5: Duplicate Key Violations After Seeding

**Error:** `duplicate key value violates unique constraint`

**Solution:**

- Ensure `ValueGeneratedOnAdd()` is set in `AppDbContext`
- Reset PostgreSQL sequence after seeding (see Step 5)
- Verify seed script uses `upsert` pattern

---

### .NET Backend Migration Checklist

**Before Migration:**

- [ ] Database created on VPS with proper privileges
- [ ] Dockerfile configured correctly
- [ ] Health endpoint implemented (`/health`)
- [ ] Environment variables documented
- [ ] CSV data files ready (if migrating data)

**During Migration:**

- [ ] Create application in Coolify
- [ ] Configure Base Directory and Dockerfile Location
- [ ] Set Port Mappings (`10000:10000`)
- [ ] Add Container Labels (Traefik configuration)
- [ ] Configure Environment Variables
- [ ] Set up Healthcheck (port 10000, path `/health`)
- [ ] Configure Resource Limits
- [ ] Deploy and verify build succeeds
- [ ] Run seed script (if migrating data)
- [ ] Verify database connection works

**After Migration:**

- [ ] Test health endpoint
- [ ] Test API endpoints
- [ ] Update frontend environment variables
- [ ] Test frontend-backend integration
- [ ] Monitor logs for errors
- [ ] Verify SignalR connections (if used)
- [ ] Test all features end-to-end

---

### .NET Quick Reference

**Connection Strings:**

```bash
# Coolify/Internal
DATABASE_URL=postgresql://user:password@xok0c8w8808g8080og4gccwc:5432/database

# External (if needed)
DATABASE_URL=postgresql://user:password@77.42.71.87:25432/database
```

**Port Configuration:**

- Container Port: `10000` (set in Dockerfile: `ASPNETCORE_URLS=http://+:10000`)
- Port Mapping: `10000:10000`
- Healthcheck Port: `10000`
- Healthcheck Path: `/health`

**Container Labels (Traefik):**

- Service Port: `10000`
- HTTP Router: Port `80` → redirects to HTTPS
- HTTPS Router: Port `443` → routes to port `10000`

**Environment Variables:**

- `DATABASE_URL`: PostgreSQL connection (use container name)
- `FRONTEND_URL`: Frontend URL for CORS
- `ASPNETCORE_ENVIRONMENT`: `Production`
- `ASPNETCORE_URLS`: `http://+:10000`

---

**Status:** ✅ Tested and verified with motor-speed-backend project (December 26, 2025)

**Post-Migration Cleanup:**

After successfully migrating and verifying the backend works on VPS:

1. **Keep Render backend running for 1-2 weeks** as a backup
2. **Monitor VPS backend** for stability and errors
3. **After confirming everything works**, delete Render backend to:
   - Avoid confusion (only one backend URL)
   - Save resources (if on paid tier)
   - Prevent accidental use of old backend
4. **Update documentation** to remove Render references

**Key Learnings:**

- ✅ .NET 8.0 Dockerfile multi-stage build pattern
- ✅ Dynamic SSL configuration for PostgreSQL
- ✅ Healthcheck configuration (port 10000, path `/health`)
- ✅ Container Labels for Traefik reverse proxy
- ✅ Resource limits configuration (1 CPU, 1GB RAM for demo)
- ✅ Database seeding with CSV files (CsvHelper)
- ✅ PostgreSQL sequence reset after seeding
- ✅ Entity Framework `ValueGeneratedOnAdd()` configuration
- ✅ Frontend environment variable updates (VITE_API_URL)
- ✅ HTTPS/SSL configuration (sslip.io limitations)

---

## 🌐 FRONTEND INTEGRATION

### Step 1: Update Frontend Environment Variables

**In Vercel/Netlify**, update your frontend `.env` files:

```env
# Old (Render/Free Tier)
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com

# New (Hetzner VPS)
NEXT_PUBLIC_API_URL=https://api.project1.yourdomain.com
```

### Step 2: Redeploy Frontends

1. **Vercel**:

   - Go to project settings
   - Update environment variables
   - Redeploy

2. **Netlify**:
   - Go to site settings
   - Update environment variables
   - Trigger redeploy

### Step 3: Test Integration

1. **Test API calls** from frontend
2. **Check browser console** for errors
3. **Verify database operations** work correctly

**That's it!** Your frontends now communicate with your self-hosted backends.

---

## 🔒 SECURITY BEST PRACTICES

### 1. Database Security

✅ **Already Done:**

- Databases not publicly exposed
- Strong passwords
- Separate users per database (optional but recommended)

**Additional:**

```bash
# Regular password rotation
# Monitor database logs
# Set up database backups (see Backup section)
```

### 2. Backend Security

✅ **Best Practices:**

- Use HTTPS only (Coolify handles this)
- Validate all inputs
- Use rate limiting
- Implement CORS properly
- Keep dependencies updated
- Use environment variables for secrets
- Never commit secrets to Git

### 3. Server Security

✅ **Already Done:**

- SSH keys only
- Firewall enabled
- Fail2Ban installed
- Non-root user
- Automatic security updates

**Additional:**

```bash
# Regular security audits
sudo apt update && sudo apt upgrade

# Monitor logs
sudo journalctl -u coolify -f

# Check for failed login attempts
sudo fail2ban-client status sshd
```

### 4. Coolify Security

✅ **Best Practices:**

- Use strong admin password
- Enable 2FA (if available in future)
- Regularly update Coolify
- Monitor Coolify logs
- Restrict access to Coolify UI (optional: use VPN)

### 5. Network Security

✅ **Defense in Depth** (Multiple Layers):

1. **Hetzner Cloud Firewall** (✅ Configured):

   - Network-level firewall at cloud provider level
   - Blocks traffic before it reaches your server
   - **Status**: ✅ Configured with 4 rules (SSH, HTTP, HTTPS, Coolify UI)
   - See [Hetzner Cloud Firewall Configuration](#-hetzner-cloud-firewall-configuration) section below for details

2. **Server-level UFW** (already configured ✅):

   - OS-level firewall on the server
   - Additional layer of protection
   - Configured with SSH, HTTP, HTTPS, Coolify ports

3. **Docker Network Isolation** (already configured ✅):
   - Internal container networking
   - Databases isolated within Docker network

**Recommended Setup**:

- ✅ Configure Hetzner Cloud Firewall (see `HETZNER_CLOUD_FIREWALL_SETUP.md`)
- ✅ Keep UFW active (defense in depth)
- ✅ Maintain Docker network isolation

**Optional: VPN Setup** (for additional security):

```bash
# Install WireGuard (example)
# This allows secure access to Coolify UI from anywhere
# Tutorial: https://www.wireguard.com/install/
```

---

## 💾 BACKUP STRATEGY

### 1. Database Backups

**PostgreSQL Automated Backup:**

```bash
# Create backup script
nano ~/backup-postgres.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/home/deploy/backups/postgres"
DATE=$(date +%Y%m%d_%H%M%S)
# Replace with your actual PostgreSQL container name (use 'docker ps | grep postgres' to find it)
CONTAINER="xok0c8w8808g8080og4gccwc"  # Or your custom name like "postgres-main"

mkdir -p $BACKUP_DIR

# Backup all databases (use sudo for Docker permissions)
sudo docker exec $CONTAINER pg_dumpall -U postgres | gzip > $BACKUP_DIR/postgres_all_$DATE.sql.gz

# Keep only last 7 days
find $BACKUP_DIR -name "*.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR/postgres_all_$DATE.sql.gz"
```

```bash
# Make executable
chmod +x ~/backup-postgres.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add:
0 2 * * * /home/deploy/backup-postgres.sh
```

**MongoDB Automated Backup:**

```bash
# Create backup script
nano ~/backup-mongodb.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/home/deploy/backups/mongodb"
DATE=$(date +%Y%m%d_%H%M%S)
# Replace with your actual MongoDB container name (use 'docker ps | grep mongo' to find it)
CONTAINER="t08sgc800wo08co48480ksgw"  # Or your custom name like "mongodb-main"

mkdir -p $BACKUP_DIR

# Backup all databases (with authentication if required)
docker exec $CONTAINER mongodump --username admin --password YOUR_PASSWORD --authenticationDatabase admin --archive --gzip | cat > $BACKUP_DIR/mongodb_all_$DATE.archive.gz

# OR without authentication if not configured:
# docker exec $CONTAINER mongodump --archive --gzip | cat > $BACKUP_DIR/mongodb_all_$DATE.archive.gz

# Keep only last 7 days
find $BACKUP_DIR -name "*.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR/mongodb_all_$DATE.archive.gz"
```

```bash
# Make executable
chmod +x ~/backup-mongodb.sh

# Add to crontab
crontab -e
# Add:
0 3 * * * /home/deploy/backup-mongodb.sh
```

### 2. Off-Site Backup

**Option 1: Hetzner Storage Box** (€3.20/month for 1TB)

- Mount as network drive
- Copy backups there

**Option 2: Cloud Storage** (S3, Backblaze, etc.)

- Use `rclone` to sync backups

#### Option 3: Another VPS

- Set up secondary backup server

### 3. Coolify Backups

- Coolify can backup application data
- Configure in Coolify settings
- Or use Docker volume backups

---

## 💰 COST ANALYSIS

### Monthly Costs

**Hetzner VPS (CX33):**

- Server: €6.53/month
- **Total: €6.53/month**

**Compared to Free Tiers:**

- MongoDB Atlas: Free (but pauses) → **Now: €0** (included)
- NeonDB/Supabase: Free (but pauses) → **Now: €0** (included)
- Render: Free (but cold starts) → **Now: €0** (included)

**Additional Optional Costs:**

- Domain: €10-15/year (~€1/month)
- Storage Box (backups): €3.20/month (optional)
- **Total with backups: ~€10/month**

**Savings:**

- No cold start delays = Better UX
- No database pauses = Reliable service
- Unlimited projects = No per-project costs
- Full control = No vendor lock-in

---

## 🤔 IS THIS A GOOD IDEA?

### ✅ YES, If

1. **You have 15-20 demo projects** - One VPS can handle this easily
2. **You want 24/7 uptime** - No cold starts, no pauses
3. **You want predictable costs** - Fixed monthly bill
4. **You're comfortable with basic server management** - Or willing to learn
5. **You want full control** - Over infrastructure and deployments
6. **You're migrating from free tiers** - To avoid limitations

### ⚠️ CONSIDERATIONS

1. **Single Point of Failure**:

   - If VPS goes down, all projects go down
   - **Mitigation**: Regular backups, monitor uptime

2. **Resource Limits**:

   - CX33: 4 vCPU, 8GB RAM
   - **For 15-20 projects**: Should be fine for demo projects
   - **Monitor**: Use `htop` to check resource usage
   - **Upgrade**: Can upgrade to CX43 (8 vCPU, 16GB) if needed

3. **Maintenance**:

   - You're responsible for updates, security, backups
   - **Mitigation**: Automated updates, monitoring, backups

4. **Learning Curve**:
   - Need to learn Docker, Coolify, server management
   - **Mitigation**: Coolify makes it easier, good documentation

### 📊 RESOURCE ESTIMATION

**Per Project (Average):**

- Backend: ~100-200MB RAM, 0.1-0.2 vCPU
- Database: Shared, minimal per-project overhead

**Total for 20 Projects:**

- Backends: ~2-4GB RAM, 2-4 vCPU
- Databases: ~1-2GB RAM, 0.5-1 vCPU
- System: ~1GB RAM
- **Total: ~4-7GB RAM, 2.5-5 vCPU**

**CX33 (4 vCPU, 8GB RAM):**

- ✅ **Should handle 15-20 demo projects comfortably**
- ⚠️ **Monitor and upgrade if needed**

### 🎯 RECOMMENDATION

**YES, this is a good idea for your use case:**

1. **Start with 5-10 projects** - Test the setup
2. **Monitor resources** - Use `htop`, Coolify metrics
3. **Migrate gradually** - One project at a time
4. **Set up backups** - Before migrating critical projects
5. **Upgrade if needed** - CX43 (€11.29/month) if resources are tight

**Benefits outweigh risks for demo/real-world projects!**

---

## 📝 QUICK REFERENCE CHECKLIST

### Initial Setup ✅

- [x] Create Hetzner account
- [x] Add billing information (2FA enabled, DPA configured)
- [x] Create project in Cloud Console (`dev-platform`)
- [x] Create CX33 server (Helsinki - `77.42.71.87`)
- [x] Add SSH key (GitHub SSH key configured)
- [x] Note server IP (`77.42.71.87`)

### Security ✅

- [x] Update system (apt update && apt upgrade)
- [x] Create non-root user (`deploy` with sudo)
- [x] Configure SSH (root disabled, password auth disabled, keys only)
- [x] Set up firewall (UFW - OpenSSH, HTTP, HTTPS, Coolify ports)
- [x] Install Fail2Ban (enabled and running)
- [x] Enable automatic updates (unattended-upgrades configured)
- [x] Configure swap (2GB swap file created)

### Coolify ✅

- [x] Install Coolify (v4.0.0-beta.454)
- [x] Access Coolify UI (`http://77.42.71.87:8000`)
- [x] Create admin account
- [x] Backup `.env` file (environment variables saved)
- [x] Generate SSH keys for Coolify (`/data/coolify/ssh/keys/id.root@host.docker.internal`)
- [x] Add public key to `~/.ssh/authorized_keys`
- [x] **Server validation** ✅ (Resolved: configured passwordless sudo, UFW rules, SSH keys)
- [x] Configure server settings (General, Resource Limits, etc.)
- [ ] Add domain (optional, for SSL)

### Databases ✅ (Completed)

- [x] Deploy PostgreSQL container
  - [x] Container name: `xok0c8w8808g8080og4gccwc`
  - [x] Image: `postgres:17-alpine`
  - [x] Resource limits: 2GB RAM, 1 CPU
  - [x] Persistent volume configured
  - [x] Verified deployment (healthy status)
  - [x] Security verified (network isolated, not exposed)
- [x] Deploy MongoDB container
  - [x] Container name: `t08sgc800wo08co48480ksgw`
  - [x] Image: `mongo:7`
  - [x] Resource limits: 2GB RAM
  - [x] Persistent volumes configured
  - [x] Verified deployment (healthy status)
  - [x] Security verified (network isolated, not exposed)
- [x] **Create databases for each project** ✅
  - [x] PostgreSQL: Created `daily_urlist_db` for daily-urlist project
  - [x] PostgreSQL: Created dedicated user `daily_urlist_user`
  - [x] Data migration: Migrated all existing data from CSV files
  - [x] Test connections: Verified and working
  - [x] Connection strings: Configured in `.env` and `.env.local`

### Backends (After Database Setup)

- [ ] Deploy first backend
  - [ ] Connect GitHub/GitLab repository
  - [ ] Configure environment variables (database URLs, secrets)
  - [ ] Set up domain/SSL (optional)
  - [ ] Test API endpoints
- [ ] Repeat for all backends (8-10 projects)
  - [ ] Deploy each backend as separate application
  - [ ] Configure environment variables per project
  - [ ] Set up subdomains (api.project1.com, api.project2.com, etc.)
  - [ ] Enable SSL for each subdomain

### Frontends (After Backend Deployment)

- [ ] Update API URLs (change from Render/free tier to new VPS URLs)
- [ ] Update environment variables in Vercel/Netlify
- [ ] Redeploy frontends
- [ ] Test integration (verify API calls work)
- [ ] Monitor for errors

### Backups (Critical - Set Up Before Production Use)

- [ ] Set up PostgreSQL automated backups (daily cron job)
- [ ] Set up MongoDB automated backups (daily cron job)
- [ ] Configure backup retention (keep last 7-30 days)
- [ ] Test backup restore process
- [ ] Configure off-site backup (optional but recommended)
  - [ ] Hetzner Storage Box, or
  - [ ] Cloud storage (S3, Backblaze), or
  - [ ] Another VPS/server

### Monitoring (Recommended)

- [ ] Set up uptime monitoring (UptimeRobot, Pingdom, etc.)
- [ ] Configure email alerts for downtime
- [ ] Monitor resource usage (htop, Coolify metrics)
- [ ] Set up log aggregation (optional)
- [ ] Configure disk space alerts

---

## 🆘 TROUBLESHOOTING

### Common Issues

**1. Can't SSH into server:**

- Check firewall rules
- Verify SSH key is correct
- Check if using correct port

**2. Coolify not accessible:**

- Check if port 8000 is open
- Verify Coolify is running: `sudo systemctl status coolify`
- Check logs: `sudo journalctl -u coolify -f`

**3. Database connection fails:**

- Verify container names (use `docker ps`)
- Check if databases are running
- Verify connection strings use container names, not `localhost`

**4. Backend deployment fails:**

- Check build logs in Coolify
- Verify Dockerfile is correct
- Check environment variables
- Review application logs

**5. Server validation fails (Permission denied publickey):** ✅ RESOLVED

**Issue:** Coolify shows "Server is not reachable" with "Permission denied (publickey)" error when trying to validate the localhost server.

**Root Cause:** Multiple issues needed to be addressed:

1. Docker container network isolation (UFW blocking SSH from containers)
2. Passwordless sudo required for Coolify to execute commands
3. SSH key configuration within Coolify container context

**Solution (All Steps Required):**

1. **Configure passwordless sudo for deploy user:**

   ```bash
   echo "deploy ALL=(ALL) NOPASSWD: ALL" | sudo tee /etc/sudoers.d/deploy
   ```

2. **Add UFW rules to allow SSH from Docker containers:**

   ```bash
   # Find Coolify container IP
   sudo docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' coolify

   # Allow SSH from Docker networks
   sudo ufw allow from 10.0.1.5 to any port 22 proto tcp
   sudo ufw allow from 172.16.0.0/12 to any port 22 proto tcp
   sudo ufw allow from 192.168.0.0/16 to any port 22 proto tcp
   sudo ufw allow from 10.0.0.0/8 to any port 22 proto tcp
   ```

3. **Generate and configure SSH keys for Coolify:**

   ```bash
   sudo mkdir -p /data/coolify/ssh/keys
   sudo ssh-keygen -t ed25519 -a 100 -f /data/coolify/ssh/keys/id.root@host.docker.internal -q -N "" -C root@coolify
   sudo chown -R 9999:9999 /data/coolify/ssh/keys
   sudo cat /data/coolify/ssh/keys/id.root@host.docker.internal.pub | tee -a ~/.ssh/authorized_keys
   chmod 600 ~/.ssh/authorized_keys
   chmod 700 ~/.ssh
   ```

4. **Add "localhost's key" public key to authorized_keys:**

   - Get the public key from Coolify UI (Keys & Tokens → localhost's key)
   - Add it to `~/.ssh/authorized_keys` on the server

5. **Configure server in Coolify UI:**
   - IP Address/Domain: `host.docker.internal`
   - User: `deploy`
   - Port: `22`
   - Private Key: Use the generated key or localhost's key

**Status:** ✅ Resolved - Server validation now works correctly.

**6. PostgreSQL README.md Permission Denied Error:** ✅ RESOLVED

**Issue:** PostgreSQL database fails to start with error:

```bash
bash: line 12: /data/coolify/databases/xxxxx/README.md: Permission denied
```

This error occurs during Coolify's startup script execution, **before** the PostgreSQL container starts.

**Root Cause:** This was **NOT a Coolify bug**, but rather a **server configuration issue**. The problem was incorrect directory permissions on `/data/coolify` and its subdirectories:

1. `/data/coolify` directory had restrictive permissions (`drwx------` 700), preventing Coolify (user 9999) from accessing database directories
2. Database directories were owned by `deploy:deploy` instead of Coolify's user (9999)
3. Parent directory permissions blocked traversal even with correct permissions on database directories

**Solution:**

```bash
# Fix parent directory permissions (allows traversal)
sudo chmod 755 /data/coolify
sudo chown -R 9999:root /data/coolify

# Fix database directories ownership and permissions
sudo chown -R 9999:root /data/coolify/databases
sudo chmod -R 755 /data/coolify/databases

# For each database directory, ensure proper permissions
sudo chown -R 9999:root /data/coolify/databases/DATABASE_ID
sudo chmod -R 775 /data/coolify/databases/DATABASE_ID

# Create README.md with proper permissions if needed
sudo touch /data/coolify/databases/DATABASE_ID/README.md
sudo chmod 666 /data/coolify/databases/DATABASE_ID/README.md
sudo chown 9999:root /data/coolify/databases/DATABASE_ID/README.md
```

**Note:** The same issue affected MongoDB. Apply the same fix for MongoDB database directories.

**Status:** ✅ Resolved - Both PostgreSQL and MongoDB now deploy successfully.

**Additional Note - SSL Certificates:** There is a separate issue with SSL certificate permissions for PostgreSQL that we couldn't fully resolve (Docker bind mount UID mapping conflicts with PostgreSQL's strict private key permission requirements). For internal-only deployments, SSL is not necessary as databases are not exposed externally. SSL is currently disabled for both databases, which is acceptable for internal-only access.

**7. SSL certificate issues:**

- Verify DNS records
- Check domain is pointing to server IP
- Wait for DNS propagation (up to 48 hours)

**8. Next.js Edge Runtime Error (NeonDB → PostgreSQL Migration):** ✅ RESOLVED

**Issue:** When migrating from NeonDB to standard PostgreSQL, Next.js projects may encounter:

```bash
Error: The edge runtime does not support Node.js 'crypto' module.
```

**Root Cause:**

- NeonDB uses `@neondatabase/serverless` driver (works in Edge runtime)
- Standard PostgreSQL uses `pg` (node-postgres) driver (requires Node.js runtime)
- Middleware and some routes default to Edge runtime, which doesn't support Node.js `crypto` module

**Solution (3 Steps Required):**

#### Step 1: Update Database Driver

Replace Neon-specific imports with standard PostgreSQL driver:

```typescript
// ❌ OLD (NeonDB)
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

// ✅ NEW (Standard PostgreSQL)
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
});
const db = drizzle(pool, { casing: "snake_case" });
```

**Files to Update:**

- `database/drizzle.ts` (main connection file)
- `database/seed.ts` (if exists)
- `database/migrate-from-csv.ts` (if exists)
- Any other files importing database connection

#### Step 2: Configure API Routes for Node.js Runtime

Add `export const runtime = "nodejs"` to ALL API routes that use the database:

```typescript
// app/api/your-route/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/database/drizzle";

export const runtime = "nodejs"; // ← ADD THIS

export async function GET(_request: NextRequest) {
  // Your database queries here
}
```

**Routes to Update:**

- All routes in `app/api/**/route.ts` that import database
- Routes that use server actions which access database
- Typically 15-20 routes per project

#### Step 3: Fix Middleware (Lazy Import Pattern)

If your middleware uses authentication that imports the database, use lazy imports:

```typescript
// ❌ OLD (auth.ts)
import { db } from "@/database/drizzle";
import { users } from "@/database/schema";
import { eq } from "drizzle-orm";

// ✅ NEW (auth.ts - Lazy imports)
// Lazy import database to avoid loading in Edge runtime (middleware)
async function getDb() {
  const { db } = await import("@/database/drizzle");
  return db;
}

async function getUsersSchema() {
  const { users } = await import("@/database/schema");
  return users;
}

async function getEq() {
  const { eq } = await import("drizzle-orm");
  return eq;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    CredentialsProvider({
      async authorize(credentials) {
        // Lazy load database only when authorize is called (Node.js runtime)
        const db = await getDb();
        const users = await getUsersSchema();
        const eq = await getEq();

        // Use db, users, eq here...
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Lazy load database only when jwt callback is called (Node.js runtime)
        const db = await getDb();
        const users = await getUsersSchema();
        const eq = await getEq();

        // Use db, users, eq here...
      }
      return token;
    },
  },
});
```

**Why This Works:**

- Middleware runs in Edge runtime (can't use Node.js modules)
- `auth()` function only reads JWT token (no database needed)
- Database is only loaded when `authorize()` or `jwt()` callbacks run (Node.js runtime)
- Zero performance impact (lazy import overhead is <1ms, only during sign-in)

#### Step 4: Update Dependencies in package.json

```json
{
  "dependencies": {
    "pg": "^8.16.3" // ← ADD THIS
    // Remove: "@neondatabase/serverless" (if exists)
  },
  "devDependencies": {
    "@types/pg": "^8.16.0", // ← ADD THIS
    "tsx": "^4.21.0" // ← ADD THIS (for migration scripts)
  },
  "scripts": {
    "db:migrate-csv": "tsx database/migrate-from-csv.ts" // ← ADD THIS (if using CSV migration)
  }
}
```

**Verification Checklist:**

- [ ] All database connection files use `pg` and `drizzle-orm/node-postgres`
- [ ] All API routes using database have `export const runtime = "nodejs"`
- [ ] Auth.ts uses lazy imports (if middleware uses auth)
- [ ] package.json includes `pg` and `@types/pg`
- [ ] Removed `@neondatabase/serverless` (if exists)
- [ ] Tested locally (`npm run dev`)
- [ ] Tested production (Vercel deployment)

**Status:** ✅ Resolved - Edge runtime errors fixed (December 20, 2025)

---

## 📊 DATA MIGRATION

### Migrating Existing Data from CSV Files

If you have existing data in CSV format from a previous database, you can use the seed script to migrate it to the new PostgreSQL database.

#### Using the Seed Script

1. **Prepare CSV Files**:

   - Place CSV files in a directory (e.g., `/path/to/csv-files/`)
   - Required files: `users.csv`, `lists.csv`, `sessions.csv`, `comments.csv`, `activities.csv`

2. **Update Seed Script Path**:

   - Edit `prisma/seed.ts` (for Prisma projects) or `database/migrate-from-csv.ts` (for Drizzle projects)
   - Update `CSV_DIR` constant to point to your CSV files directory

3. **Run Migration**:

   ```bash
   # For Drizzle projects:
   npm run db:migrate-csv

   # For Prisma projects:
   npm run db:seed
   ```

4. **Verify Migration**:

   ```bash
   # Check data was imported
   psql "postgresql://project_user:PASSWORD@77.42.71.87:25432/project_db" -c "SELECT COUNT(*) FROM users;"
   ```

**Note:** The seed script uses `upsert`, so it's safe to run multiple times. It will update existing records or create new ones.

**Status:** ✅ Data migration completed for `daily-urlist` project (December 19, 2025)  
**Status:** ✅ Data migration completed for `university-library` project (December 20, 2025)

---

## 🌐 PRODUCTION DEPLOYMENT (Vercel Frontend → Hetzner Database)

### Architecture

```bash
Frontend: Vercel/Netlify (stay here) ✅
    ↓
API Routes: Vercel serverless functions (part of Next.js) ✅
    ↓
Database: Hetzner VPS PostgreSQL (exposed securely on port 25432) ✅
```

### Exposing PostgreSQL for Vercel Access

#### Step 1: Expose PostgreSQL Port in Coolify

1. Go to Coolify Dashboard → PostgreSQL Container → General tab
2. Find "Network" section → "Ports Mappings"
3. Change from: `127.0.0.1:5433:5432`
4. Change to: `0.0.0.0:25432:5432` (non-standard port for security)
5. Save and restart container

#### Step 2: Configure Hetzner Cloud Firewall

1. Go to Hetzner Cloud Console → Firewalls → `dev-platform-server-firewall`
2. Add inbound rule:
   - Description: `PostgreSQL - Port 25432`
   - Protocol: `TCP`
   - Port: `25432`
   - Source IPs: `0.0.0.0/0,::/0` (public access - secured by password auth)
3. Save firewall rules

#### Step 3: Configure UFW Firewall (Server-level)

```bash
ssh deploy@77.42.71.87
sudo ufw allow 25432/tcp
sudo ufw status  # Verify port 25432 is allowed
```

#### Step 4: Update Vercel Environment Variables

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Update `DATABASE_URL`:

   ```bash
   postgresql://daily_urlist_user:mIst200814013@77.42.71.87:25432/daily_urlist_db
   ```

3. Update `DIRECT_URL`:

   ```bash
   postgresql://daily_urlist_user:mIst200814013@77.42.71.87:25432/daily_urlist_db
   ```

4. Save and redeploy

**Security Notes:**

- ✅ Password authentication required (strong password)
- ✅ Non-standard port (25432) reduces automated scans
- ✅ Dedicated user with limited privileges (not superuser)
- ✅ Multiple firewall layers (Hetzner Cloud Firewall + UFW)
- ⚠️ Database is publicly accessible, but protected by authentication

**Status:** ✅ PostgreSQL exposed and working with Vercel (December 19, 2025)

---

## 📋 POST-MIGRATION CHECKLIST (For Each Project)

After successfully migrating a project, **always complete these 3 steps**:

### 1. Set Up Automated Backups (Recommended)

**PostgreSQL Backups (Global - Already Configured):**

- ✅ Script location: `~/backup-postgres.sh`
- ✅ Cron schedule: Daily at 2 AM (`0 2 * * * /home/deploy/backup-postgres.sh`)
- ✅ Retention: Last 7 days automatically deleted
- ✅ Backup location: `/home/deploy/backups/postgres/`
- ✅ Script uses `sudo docker` for permissions

**Verify backups are working:**

```bash
# Check backup directory
ls -lh ~/backups/postgres/

# Check cron job
crontab -l

# Test backup manually
~/backup-postgres.sh
```

**MongoDB Backups (if project uses MongoDB):**

- Create script: `~/backup-mongodb.sh` (similar pattern)
- Add to cron: `0 3 * * * /home/deploy/backup-mongodb.sh` (3 AM daily)

### 2. Monitor Resource Usage

**Using htop (Terminal):**

```bash
# Install htop (if not already installed)
sudo apt install htop -y

# Run htop
htop
# Press 'q' to quit
# Press 'F2' to configure
# Press 'F5' to toggle tree view
```

**Using Coolify Metrics (Web UI):**

1. Go to Coolify Dashboard → Your Database/Application → Metrics tab
2. Recommended intervals:
   - **Regular monitoring**: "12 hours" or "1 week"
   - **Troubleshooting**: "30 minutes" or "5 minutes (live)"
3. Monitor:
   - CPU usage (should be low, < 50% for demo projects)
   - Memory usage (should be stable)
   - Network activity

**What to Check:**

- CPU usage (should be low for demo projects)
- Memory usage (should be stable)
- Disk usage: `df -h` (check periodically)

### 3. Repeat for Other Projects (Same Pattern)

**Important:** All projects share the **same PostgreSQL container**. Each project gets its own **database** (not a new container).

**Architecture:**

```text
PostgreSQL Container (xok0c8w8808g8080og4gccwc) ← ONE shared container
├── daily_urlist_db (database) ← Project 1
├── project2_db (database) ← Project 2 (you'll create this)
└── project3_db (database) ← Project 3 (future)
```

#### Step 1: Create Database in Same Container

```bash
ssh deploy@77.42.71.87
sudo docker exec -it xok0c8w8808g8080og4gccwc psql -U postgres

CREATE DATABASE project_name_db;
CREATE USER project_name_user WITH PASSWORD 'strong_password_here';  -- Letters + numbers only
GRANT ALL PRIVILEGES ON DATABASE project_name_db TO project_name_user;
\q
```

#### Step 2: Migrate Data (if needed)

- Use seed scripts or export/import tools
- Verify data integrity after migration

#### Step 3: Configure Connection

- **For Vercel/Netlify frontends**: Use server IP + port 25432

  ```bash
  DATABASE_URL=postgresql://project_name_user:password@77.42.71.87:25432/project_name_db
  ```

- **For Coolify deployments**: Use container name

  ```bash
  DATABASE_URL=postgresql://project_name_user:password@xok0c8w8808g8080og4gccwc:5432/project_name_db
  ```

#### Step 4: Test Connection

- Test from local machine first
- Test from production (Vercel/Netlify)
- Verify all features work

#### Step 5: Complete Post-Migration Checklist

- ✅ Backups (already configured globally)
- ✅ Monitor resources
- ✅ Document any project-specific notes

---

## 🔥 HETZNER CLOUD FIREWALL CONFIGURATION

### Why Configure Hetzner Cloud Firewall?

**Defense in Depth Strategy** - Multiple layers of security:

```bash
Internet
    ↓
[Layer 1] Hetzner Cloud Firewall ← Blocks unwanted traffic at cloud level
    ↓
[Layer 2] Server-level UFW ← Additional protection on the server
    ↓
[Layer 3] Docker Network Isolation ← Internal container isolation
    ↓
Your Applications
```

**Benefits:**

- ✅ Network-level protection (blocks traffic before it reaches your server)
- ✅ Independent of server state (works even if UFW fails)
- ✅ Better performance (filtered at cloud level)
- ✅ Centralized management (web dashboard)

### Firewall Configuration

**Firewall Name:** `dev-platform-server-firewall`

**Inbound Rules:**

| Rule    | Protocol | Port  | Source         | Action | Description                                   |
| ------- | -------- | ----- | -------------- | ------ | --------------------------------------------- |
| 1       | TCP      | 22    | Your IP(s)     | Accept | SSH (restricted to your IP)                   |
| 2       | TCP      | 80    | 0.0.0.0/0,::/0 | Accept | HTTP (public)                                 |
| 3       | TCP      | 443   | 0.0.0.0/0,::/0 | Accept | HTTPS (public)                                |
| 4       | TCP      | 8000  | Your IP(s)     | Accept | Coolify UI (restricted)                       |
| 5       | TCP      | 25432 | 0.0.0.0/0,::/0 | Accept | PostgreSQL (public, secured by password auth) |
| Default | -        | -     | -              | Drop   | Deny all other inbound                        |

**Outbound Rules:** Allow all (default)

### Step-by-Step Setup

1. **Find Your IP Address**:

   ```bash
   curl ifconfig.me
   ```

2. **Create Firewall in Hetzner Dashboard**:

   - Go to Hetzner Cloud Console → Firewalls → Create Firewall
   - Name: `dev-platform-server-firewall`
   - Add inbound rules as shown above
   - Default inbound policy: Drop
   - Default outbound policy: Accept

3. **Apply Firewall to Server**:

   - Go to Servers → dev-platform-server → Firewalls tab
   - Click "Apply Firewall"
   - Select `dev-platform-server-firewall`

4. **Verify Configuration**:
   - Test SSH access from your IP (should work)
   - Test HTTP/HTTPS from anywhere (should work)
   - Test Coolify UI from your IP (should work)
   - Test PostgreSQL port 25432 (should work - required for Vercel access)

**Status:** ✅ Configured with 5 rules (SSH, HTTP, HTTPS, Coolify UI, PostgreSQL) and tested

---

## 🔍 DATABASE SECURITY VERIFICATION

### Security Summary

**Network Isolation:** ✅ SECURE

- Databases are NOT publicly exposed
- Only accessible via Docker internal network
- Port bindings: None (verified secure)

**Firewall Configuration:** ✅ SECURE

- UFW active with proper rules
- Hetzner Cloud Firewall configured
- Database ports (5432, 27017) not exposed

**Resource Limits:** ✅ CONFIGURED

- PostgreSQL: 2GB RAM limit
- MongoDB: 2GB RAM limit
- Auto-restart: `unless-stopped`

**Data Persistence:** ✅ CONFIGURED

- Volumes configured for both databases
- Data survives container restarts

**Overall Security Rating:** ✅ SECURE

Both databases are operational, secure, and properly configured for internal Docker network use.

---

## 📚 ADDITIONAL RESOURCES

- **Hetzner Docs**: <https://docs.hetzner.com/>
- **Coolify Docs**: <https://coolify.io/docs>
- **Docker Docs**: <https://docs.docker.com/>
- **PostgreSQL Docs**: <https://www.postgresql.org/docs/>
- **MongoDB Docs**: <https://docs.mongodb.com/>

---

## 🎉 CONCLUSION

You now have a complete guide to migrate from free tiers to a self-hosted VPS solution. This setup provides:

- ✅ 24/7 uptime
- ✅ No cold starts
- ✅ No database pauses
- ✅ Full control
- ✅ Predictable costs
- ✅ Production-ready infrastructure

**Next Steps:**

1. Create Hetzner account
2. Set up server
3. Install Coolify
4. Migrate one project as a test
5. Gradually migrate all projects

Good luck with your migration! 🚀

---

**Last Updated:** December 31, 2025  
**Status:** Production Deployment Completed ✅ | Multiple projects migrated successfully | Guide includes Next.js, Prisma, and .NET/C# backend migration patterns | CSV data migration patterns included | Backend deployment to Coolify documented | MongoDB Prisma update issues and fallback pattern documented

**Migrated Projects:**

- ✅ `daily-urlist` - Prisma-based project (December 19, 2025)
- ✅ `university-library` - Drizzle-based Next.js project (December 20, 2025)
- ✅ `multi-ai-chatbot` - Prisma-based React/Vite project (December 21, 2025)
- ✅ `next-store` - Prisma-based Next.js e-commerce project with CSV migration (December 21, 2025)
- ✅ `motor-speed-backend` - .NET/C# ASP.NET Core backend with PostgreSQL (December 26, 2025)
- ✅ `lama-blog` - Prisma MongoDB-based Next.js blog project (December 27, 2025)

**Key Learnings Documented:**

- ✅ Next.js Edge runtime compatibility (lazy imports pattern)
- ✅ Database driver migration (Neon → pg)
- ✅ API route runtime configuration
- ✅ CSV data migration with Drizzle
- ✅ CSV data migration with Prisma (TypeScript seed scripts)
- ✅ CSV data migration with .NET/C# (CsvHelper, Entity Framework)
- ✅ TypeScript date type handling
- ✅ Prisma `db push` vs `migrate dev` (shadow database workaround)
- ✅ Analytics tracking verification (Event, Session, ProviderStats)
- ✅ Session vs Chat History distinction (localStorage vs database)
- ✅ E-commerce data models (Products, Carts, Orders, Reviews)
- ✅ CSV parsing and upsert patterns for Prisma migrations
- ✅ .NET backend deployment to Coolify (Dockerfile, port configuration, healthcheck)
- ✅ Entity Framework Core database seeding and sequence management
- ✅ Traefik/Caddy container labels for reverse proxy routing
- ✅ HTTPS/SSL configuration for sslip.io domains
- ✅ Frontend environment variable updates (VITE_API_URL pattern)
- ✅ MongoDB Prisma update() null return issue (self-hosted MongoDB)
- ✅ MongoDB native driver fallback pattern for reliable updates
- ✅ Counter sequence value issues and MongoDB $inc fallback
- ✅ Prisma MongoDB replica set configuration and monitoring
