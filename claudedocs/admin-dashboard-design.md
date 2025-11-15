# Admin Dashboard Design Document

## Overview
Design for an admin dashboard that displays all registered users, with access restricted to whitelisted email addresses starting with `carl@craftthefuture.xyz`.

## Current System Analysis

### Tech Stack
- **Frontend**: React 18 + Vite with Tailwind CSS
- **Authentication**: Crossmint SDK (wallet-based auth)
- **Backend**: Cloudflare Pages Functions (serverless)
- **Database**: Cloudflare D1 (SQLite)
- **Deployment**: Cloudflare Pages with Wrangler

### Database Schema
```sql
users (
  id: INTEGER PRIMARY KEY,
  wallet_hash: TEXT UNIQUE (SHA-256 hash),
  wallet_encrypted: TEXT (AES encrypted),
  email: TEXT,
  display_name: TEXT,
  created_at: TEXT
)
```

### Authentication Flow
1. Users authenticate via Crossmint SDK
2. Wallet addresses are hashed and encrypted
3. User data stored in D1 database
4. Frontend uses `useAuth()` hook for auth state

## Admin Dashboard Architecture

### Security Model

#### Admin Authorization Strategy
**Whitelist Approach**: Email prefix-based authorization
- **Admin Emails**: Must start with `carl@craftthefuture.xyz`
- **Examples**:
  - ✅ `carl@craftthefuture.xyz` (admin)
  - ✅ `carl+admin@craftthefuture.xyz` (admin)
  - ✅ `carl.johnson@craftthefuture.xyz` (admin)
  - ❌ `john@craftthefuture.xyz` (not admin)
  - ❌ `carl@otherdomain.com` (not admin)

#### Security Layers
1. **Frontend Check**: Hide admin UI from non-admin users
2. **Backend Authorization**: Verify admin status on API requests
3. **Database Query**: Only return user list to authorized admins

### Component Architecture

```
App.jsx
  └─> AdminDashboard.jsx (new component)
       ├─> AdminUserTable.jsx (user list table)
       ├─> AdminStats.jsx (statistics cards)
       └─> AdminFilters.jsx (search/filter controls)
```

### API Design

#### New Endpoint: GET /api/admin/users

**Purpose**: Retrieve all users for admin dashboard

**Request**:
```
GET /api/admin/users
Headers:
  Authorization: Bearer <user-email>
```

**Authorization Logic**:
```javascript
function isAdmin(email) {
  if (!email) return false;
  return email.startsWith('carl@craftthefuture.xyz');
}
```

**Response** (Success - 200):
```json
{
  "users": [
    {
      "id": 1,
      "email": "user@example.com",
      "display_name": "John Doe",
      "created_at": "2025-01-15T10:30:00Z",
      "has_wallet": true
    }
  ],
  "total": 42,
  "admin_email": "carl@craftthefuture.xyz"
}
```

**Response** (Forbidden - 403):
```json
{
  "error": "Unauthorized: Admin access required",
  "required": "Email must start with carl@craftthefuture.xyz"
}
```

#### Security Implementation
```javascript
// In functions/api/admin/users.js
export async function onRequestGet(context) {
  const authHeader = context.request.headers.get('Authorization');
  const email = authHeader?.replace('Bearer ', '');

  if (!email?.startsWith('carl@craftthefuture.xyz')) {
    return new Response(JSON.stringify({
      error: 'Unauthorized: Admin access required'
    }), { status: 403 });
  }

  // Query and return users...
}
```

### Frontend Design

#### Navigation
Add admin link in CommunityHub.jsx for whitelisted users:
```jsx
{user?.email?.startsWith('carl@craftthefuture.xyz') && (
  <Button onClick={() => navigate('/admin')} variant="outline">
    Admin Dashboard
  </Button>
)}
```

#### Admin Dashboard UI Layout

```
┌─────────────────────────────────────────────────────────┐
│  🔙 Back to Community    Admin Dashboard    👤 Carl      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │ 👥 Users │  │ 📅 Today │  │ 📊 Active│             │
│  │   142    │  │    12    │  │    89    │             │
│  └──────────┘  └──────────┘  └──────────┘             │
│                                                          │
│  🔍 Search: [________________]  Filter: [All Users ▼]  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐│
│  │ ID │ Name         │ Email            │ Created    ││
│  ├────┼──────────────┼──────────────────┼────────────┤│
│  │ 1  │ John Doe     │ john@example.com │ 2025-01-15││
│  │ 2  │ Jane Smith   │ jane@test.com    │ 2025-01-16││
│  │ 3  │ Bob Wilson   │ bob@mail.com     │ 2025-01-17││
│  │ ... (scrollable table)                            ││
│  └────────────────────────────────────────────────────┘│
│                                                          │
│  Showing 1-20 of 142 users    [< Prev] [Next >]        │
└─────────────────────────────────────────────────────────┘
```

#### Features
1. **Statistics Cards**: Total users, new today, active users
2. **User Table**: Sortable columns (ID, name, email, created date)
3. **Search**: Real-time filtering by name/email
4. **Pagination**: 20 users per page
5. **Export**: Download user list as CSV (future enhancement)
6. **Responsive**: Mobile-friendly design with Tailwind

### Data Flow

```
User Login (Crossmint)
  └─> user.email extracted
       └─> Check: email.startsWith('carl@craftthefuture.xyz')
            ├─> TRUE: Show "Admin Dashboard" button
            │    └─> Click navigates to /admin route
            │         └─> AdminDashboard.jsx loads
            │              └─> Fetch GET /api/admin/users
            │                   ├─> Headers: { Authorization: Bearer <email> }
            │                   └─> Backend validates email
            │                        ├─> Valid: Return all users
            │                        └─> Invalid: Return 403 Forbidden
            │
            └─> FALSE: No admin access (button hidden)
```

## Implementation Plan

### Files to Create

1. **Backend**
   - `functions/api/admin/users.js` - Admin users endpoint
   - `functions/api/admin/_middleware.js` - Admin auth middleware

2. **Frontend Components**
   - `src/components/AdminDashboard.jsx` - Main admin dashboard
   - `src/components/admin/AdminUserTable.jsx` - User table component
   - `src/components/admin/AdminStats.jsx` - Statistics cards
   - `src/services/adminApi.js` - Admin API client

3. **Utilities**
   - `functions/utils/adminAuth.js` - Shared admin auth logic

### Files to Modify

1. **Frontend**
   - `src/App.jsx` - Add admin route
   - `src/components/CommunityHub.jsx` - Add admin navigation button

2. **Services**
   - `src/services/userApi.js` - Add getAllUsers() admin function (optional)

### Implementation Steps

#### Phase 1: Backend API (Security First)
1. Create admin authorization utility
2. Implement GET /api/admin/users endpoint
3. Add admin-specific middleware
4. Test authorization with different emails

#### Phase 2: Frontend Dashboard
1. Create AdminDashboard component with layout
2. Build AdminUserTable with sorting/pagination
3. Add AdminStats for overview cards
4. Implement search and filter functionality

#### Phase 3: Integration
1. Add admin route to App.jsx
2. Add admin button to CommunityHub
3. Connect frontend to backend API
4. Test complete flow with admin email

#### Phase 4: Polish & Security
1. Add loading states and error handling
2. Implement proper error messages
3. Add rate limiting (future)
4. Security audit and testing

## Security Considerations

### Threats & Mitigations

| Threat | Mitigation |
|--------|-----------|
| Email spoofing | Backend validation required for all requests |
| Token theft | Use short-lived tokens, HTTPS only |
| Data exposure | Never return wallet_encrypted to frontend |
| Unauthorized access | Multi-layer auth checks (frontend + backend) |
| SQL injection | Use prepared statements (already implemented) |
| Rate limiting | Add CloudFlare rate limits (future) |

### Data Privacy
- **Never expose**: `wallet_encrypted`, `wallet_hash` (raw values)
- **Safe to show**: `email`, `display_name`, `created_at`, `id`
- **Boolean flag**: `has_wallet` (indicates if wallet exists without revealing it)

### Best Practices
1. Always validate email on backend (never trust frontend)
2. Log admin actions for audit trail
3. Use environment variables for admin email patterns
4. Implement rate limiting on admin endpoints
5. Add CSRF protection for mutations

## Future Enhancements

### Phase 2 Features
- User detail modal (view individual user details)
- Export to CSV functionality
- Activity logs (when users logged in)
- Bulk actions (delete, email multiple users)

### Phase 3 Features
- Multiple admin roles (super-admin, moderator)
- Admin activity audit log
- Real-time user status (online/offline)
- Analytics dashboard (charts, graphs)

### Phase 4 Features
- Email whitelisting in environment config
- Admin user management (add/remove admins)
- Two-factor authentication for admins
- Advanced filtering (date ranges, custom queries)

## Testing Strategy

### Unit Tests
- Admin authorization logic
- Email validation functions
- User data sanitization

### Integration Tests
- Full admin dashboard flow
- API authentication and authorization
- Error handling for unauthorized access

### Manual Testing Checklist
- [ ] Admin can access dashboard with carl@craftthefuture.xyz
- [ ] Non-admin cannot access dashboard
- [ ] User list displays correctly
- [ ] Search and filter work as expected
- [ ] Pagination functions properly
- [ ] Mobile responsive design works
- [ ] Error states display correctly
- [ ] Loading states show during API calls

## Configuration

### Environment Variables
```bash
# Optional: Make admin email configurable
ADMIN_EMAIL_PREFIX=carl@craftthefuture.xyz
```

### Wrangler Configuration
No changes required - uses existing D1 binding.

## Deployment Checklist
- [ ] Create admin API endpoints
- [ ] Deploy updated functions to Cloudflare
- [ ] Test admin access in production
- [ ] Verify non-admins cannot access
- [ ] Monitor for security issues
- [ ] Document admin access procedures

## Timeline Estimate
- **Backend Implementation**: 2-3 hours
- **Frontend Dashboard**: 4-5 hours
- **Integration & Testing**: 2-3 hours
- **Polish & Security Review**: 1-2 hours
- **Total**: 9-13 hours for MVP

## Conclusion
This design provides a foundation for a functional, MVP admin dashboard with proper security controls. The email-based whitelist approach is straightforward to implement and maintain while providing adequate security for initial deployment.
