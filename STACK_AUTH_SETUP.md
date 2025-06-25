# Stack Auth Integration Setup Guide

ConsensusAI now uses Stack Auth (Neon's authentication solution) for user management and authentication.

## ✅ What's Been Implemented

### 1. **Stack Auth Integration**
- Installed `@stackframe/stack` package
- Configured Stack Auth with Next.js App Router
- Set up authentication routes at `/handler/*`

### 2. **User Management**
- **StackUserProvider** - Context provider that syncs Stack Auth users with our database
- **Database Sync** - Automatically creates/updates users in our PostgreSQL database
- **Seamless Integration** - Stack Auth handles authentication, our DB stores preferences and chat data

### 3. **Authentication Flow**
- **Sign In/Sign Up** - Beautiful Stack Auth components with dark theme
- **Protected Routes** - Chat page requires authentication
- **Auto-sync** - User data automatically synced between Stack Auth and our database

### 4. **Components**
- `StackAuth` - Sign in/up component with tabs
- `ChatPageStack` - Database-enabled chat page with Stack Auth
- `StackUserProvider` - Context provider for user management

## 🔧 Environment Variables

The following Stack Auth environment variables are already configured:

```env
# Stack Auth Configuration
NEXT_PUBLIC_STACK_PROJECT_ID='42b3ea3b-e6a0-4551-ab20-a64631abd72b'
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY='pck_t97ywbg668az760g7hws1vr6s1g6t6ter48ygtk6c9psg'
STACK_SECRET_SERVER_KEY='ssk_520taq7778jpa5djepd6ymwv10chaxgnrhgsbv87xh6cr'
```

## 🚀 How to Use

### 1. **Start the Application**
```bash
npm run dev
```

### 2. **Access the Chat**
- Visit: http://localhost:3000/chat
- You'll see the Stack Auth sign-in page
- Create an account or sign in with existing credentials

### 3. **User Experience**
- **First Time**: Sign up creates account in Stack Auth + our database
- **Returning**: Sign in automatically syncs your data
- **Profile**: Avatar, name, and email managed through Stack Auth
- **Preferences**: Chat settings stored in our database

## 🔄 How It Works

### Authentication Flow
1. **User visits /chat** → Stack Auth check
2. **Not authenticated** → Show Stack Auth sign-in/up forms
3. **Authentication success** → Sync user to our database
4. **Database user created/updated** → Chat interface loads
5. **User data available** → Full chat functionality with persistence

### Data Sync
- **Stack Auth** stores: Email, name, avatar, email verification
- **Our Database** stores: Preferences, chat history, subscriptions, usage tracking
- **Automatic Sync** on every sign-in ensures data consistency

### API Integration
- All API routes now check for Stack Auth authentication
- User ID from our database used for chat operations
- Secure token-based authentication for all requests

## 📱 Features Available

### Authentication
- ✅ Email/password sign up and sign in
- ✅ Email verification
- ✅ Password reset
- ✅ Profile management
- ✅ Secure session management

### Chat Features
- ✅ Persistent conversation history
- ✅ Real-time AI streaming
- ✅ Message reactions
- ✅ Conversation search and export
- ✅ User preferences and settings
- ✅ Mobile responsive design

### Database Integration
- ✅ User profiles synced to PostgreSQL
- ✅ Chat conversations and messages
- ✅ Usage tracking and analytics
- ✅ Subscription and billing support

## 🛠 Development Notes

### File Structure
```
src/
├── contexts/
│   └── stack-user-context.tsx    # User management with Stack Auth
├── components/
│   └── auth/
│       └── stack-auth.tsx         # Auth UI components
│   └── chat/
│       └── chat-page-stack.tsx    # Main chat interface
├── lib/
│   └── auth/
│       └── stack-auth.ts          # Auth utilities
└── app/
    ├── handler/[...stack]/        # Stack Auth routes
    └── chat/page.tsx              # Protected chat page
```

### Key Components
- **StackUserProvider**: Manages user state and database sync
- **ChatPageStack**: Main chat interface with authentication
- **StackAuth**: Sign-in/up forms with custom styling

### API Authentication
- All API routes can access authenticated user via `getStackUser(request)`
- User data automatically synced between Stack Auth and database
- Secure token validation on all protected endpoints

## 🔮 Next Steps

1. **Customize Auth UI** - Further customize Stack Auth components
2. **Profile Management** - Add user profile editing features
3. **Team Features** - Implement organization/team functionality
4. **Advanced Auth** - Add OAuth providers (Google, GitHub, etc.)
5. **Admin Panel** - Create admin interface for user management

## 🆘 Troubleshooting

### Common Issues
1. **Environment Variables** - Ensure all Stack Auth env vars are set
2. **Database Connection** - Verify PostgreSQL connection works
3. **CORS Issues** - Check if running on correct port (3000)

### Support
- Stack Auth Docs: https://docs.stack-auth.com
- Our Implementation: See `src/contexts/stack-user-context.tsx`
- Database Setup: See `DATABASE_SETUP.md`

The Stack Auth integration provides enterprise-grade authentication while maintaining our custom chat features and database architecture!