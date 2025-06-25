# ConsensusAI Database Setup Guide

This guide will help you set up the PostgreSQL database for ConsensusAI.

## Prerequisites

- Node.js 18+ installed
- A PostgreSQL database (we recommend Neon for serverless PostgreSQL)

## Database Setup Options

### Option 1: Neon Serverless PostgreSQL (Recommended)

1. **Create a Neon Account**
   - Go to [neon.tech](https://neon.tech)
   - Sign up for a free account
   - Create a new project

2. **Get Connection String**
   - In your Neon dashboard, go to "Connection Details"
   - Copy the connection string (it looks like: `postgresql://neondb_owner:password@ep-example.us-east-1.aws.neon.tech/database?sslmode=require`)

3. **Update Environment Variables**
   - Update your `.env` file:
   ```env
   DATABASE_URL=your_neon_connection_string_here
   ```

### Option 2: Local PostgreSQL

1. **Install PostgreSQL locally**
   - macOS: `brew install postgresql`
   - Ubuntu: `sudo apt install postgresql postgresql-contrib`
   - Windows: Download from [postgresql.org](https://www.postgresql.org/download/)

2. **Create Database**
   ```bash
   createdb consensusai
   ```

3. **Update Environment Variables**
   ```env
   DATABASE_URL=postgresql://postgres:password@localhost:5432/consensusai
   ```

## Database Migration

Once you have your database URL set up:

1. **Install Dependencies** (if not already done)
   ```bash
   npm install
   ```

2. **Generate Migration Files** (already done)
   ```bash
   npm run db:generate
   ```

3. **Run Migrations**
   ```bash
   npm run db:migrate
   ```

4. **Verify Setup** (optional)
   ```bash
   npm run db:studio
   ```
   This opens Drizzle Studio in your browser to view your database.

## Database Schema

The database includes the following tables:

- **users** - User accounts and profiles
- **conversations** - Chat conversations
- **messages** - Individual messages in conversations
- **message_reactions** - Emoji reactions to messages
- **user_preferences** - User settings and preferences
- **user_subscriptions** - Subscription tiers and billing
- **usage_tracking** - API usage and cost tracking
- **shared_conversations** - Conversation sharing features

## Available Scripts

- `npm run db:generate` - Generate new migration files
- `npm run db:migrate` - Run pending migrations
- `npm run db:studio` - Open Drizzle Studio database viewer

## Environment Variables

Make sure your `.env` file includes:

```env
# Database
DATABASE_URL=your_database_connection_string

# AI APIs
OPENROUTER_API_KEY=your_openrouter_api_key
GEMINI_API_KEY=your_gemini_api_key

# Authentication
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:9002
```

## Troubleshooting

### Connection Issues

1. **Check your connection string** - Make sure it's properly formatted
2. **Verify database exists** - Ensure the database specified in the URL exists
3. **Check network access** - Some providers require whitelisting IP addresses

### Migration Issues

1. **Reset migrations** (if needed):
   ```bash
   # Delete migration files and regenerate
   rm -rf migrations/
   npm run db:generate
   npm run db:migrate
   ```

2. **Check database permissions** - Ensure your database user has CREATE/ALTER permissions

### SSL Issues

If you encounter SSL certificate issues with hosted databases, try adding `?sslmode=require` to your connection string.

## Development Workflow

1. **Make schema changes** in `src/lib/db/schema.ts`
2. **Generate migration** with `npm run db:generate`
3. **Review migration** in the `migrations/` folder
4. **Apply migration** with `npm run db:migrate`
5. **Test changes** by running the application

## Production Considerations

- Use environment variables for sensitive data
- Enable SSL connections for production databases
- Set up database backups
- Monitor database performance and usage
- Consider connection pooling for high-traffic applications

## Support

If you encounter any issues:

1. Check the application logs for detailed error messages
2. Verify your environment variables are correctly set
3. Ensure your database is accessible and has the correct permissions
4. Review the migration files for any syntax errors