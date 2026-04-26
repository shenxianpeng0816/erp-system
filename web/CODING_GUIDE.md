# CodeBanana Base Template - Coding Guide

> Clean, clear, and AI-friendly development guidelines

## 🎯 Core Principles

- **Simplicity First**: Keep code simple and direct, avoid over-abstraction
- **Single Responsibility**: Each component does one thing
- **Type Safety**: Use TypeScript with explicit type definitions
- **Consistency**: Follow unified naming and structural conventions
- **Database via Supabase**: All database operations use Supabase — no other DB clients

---

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Home page
│   ├── layout.tsx         # Root layout
│   ├── actions/           # Server Actions (all DB writes go here)
│   │   └── *.ts           # e.g. login.ts, create-post.ts
│   └── api/               # API routes (optional, prefer Server Actions)
├── components/            # Reusable components
│   ├── ui/               # Base UI components
│   └── features/         # Feature components
├── lib/                   # Utility functions
│   └── supabase.ts       # ⭐ Supabase client (single source of truth)
├── store/                 # Zustand state management
└── types/                 # TypeScript type definitions
    └── database.types.ts  # ⭐ Table row types (mirrors DB schema)
```

---

## 🗄️ Database (Supabase)

> **Rule**: All database operations use `@supabase/supabase-js`. Never use raw fetch/axios to call a database.

### Environment Variables

```bash
# .env.local — required for all DB operations
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

### Client Initialization

```ts
// src/lib/supabase.ts — import this everywhere you need DB access
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### TypeScript Table Types

```ts
// src/types/database.types.ts — define one interface per table
export interface User {
  id: string
  email: string
  name: string | null
  created_at: string
}

export interface Post {
  id: string
  title: string
  content: string
  user_id: string
  created_at: string
}
```

### Pattern 1 — Read in Server Component (best for page-level data)

```tsx
// app/users/page.tsx — Server Component, no 'use client' needed
import { supabase } from '@/lib/supabase'
import type { User } from '@/types/database.types'

export default async function UsersPage() {
  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return <p>Failed to load users</p>

  return (
    <ul>
      {users.map((user: User) => (
        <li key={user.id}>{user.email}</li>
      ))}
    </ul>
  )
}
```

### Pattern 2 — Write via Server Action (forms, mutations)

```ts
// app/actions/create-user.ts
'use server'

import { supabase } from '@/lib/supabase'

export type ActionResult =
  | { success: true; id: string }
  | { success: false; error: string }

export async function createUserAction(
  name: string,
  email: string
): Promise<ActionResult> {
  const { data, error } = await supabase
    .from('users')
    .insert({ name, email })
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, id: data.id }
}
```

```tsx
// app/users/new/page.tsx — Client Component calls the Server Action
'use client'

import { useTransition } from 'react'
import { createUserAction } from '@/app/actions/create-user'

export default function NewUserPage() {
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const name = (form.elements.namedItem('name') as HTMLInputElement).value
    const email = (form.elements.namedItem('email') as HTMLInputElement).value

    startTransition(async () => {
      const result = await createUserAction(name, email)
      if (!result.success) console.error(result.error)
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" placeholder="Name" required />
      <input name="email" type="email" placeholder="Email" required />
      <button type="submit" disabled={isPending}>
        {isPending ? 'Saving…' : 'Create'}
      </button>
    </form>
  )
}
```

### Pattern 3 — Update and Delete

```ts
// app/actions/update-user.ts
'use server'

import { supabase } from '@/lib/supabase'

// Update
export async function updateUserAction(id: string, name: string) {
  const { error } = await supabase
    .from('users')
    .update({ name })
    .eq('id', id)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

// Delete
export async function deleteUserAction(id: string) {
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', id)

  if (error) return { success: false, error: error.message }
  return { success: true }
}
```

### Pattern 4 — Filtered / Conditional Queries

```ts
import { supabase } from '@/lib/supabase'

// Filter by column
const { data } = await supabase
  .from('posts')
  .select('*')
  .eq('user_id', userId)

// Multiple conditions
const { data } = await supabase
  .from('posts')
  .select('id, title, created_at')
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
  .limit(10)

// Join related table
const { data } = await supabase
  .from('posts')
  .select('*, users(name, email)')
  .eq('id', postId)
  .single()
```

### Database Rules

1. **Always use Server Actions for writes** (insert / update / delete) — never write to DB from a Client Component directly
2. **Always use Server Components for initial page data** — avoids client-side loading states
3. **Always define TypeScript types** in `src/types/database.types.ts` for every table used
4. **Always check `error`** returned by Supabase before using `data`
5. **Never expose `service_role_key`** in client-side code — use `anon_key` only on the client

---

## 📝 Naming Conventions

### File Naming
- Component files: `PascalCase.tsx` (e.g., `UserCard.tsx`)
- Utility functions: `kebab-case.ts` (e.g., `format-date.ts`)
- Server Actions: `kebab-case.ts` in `app/actions/` (e.g., `create-post.ts`)
- Type files: `kebab-case.types.ts` (e.g., `user.types.ts`)

### Variable Naming
- React components: `PascalCase` (e.g., `UserProfile`)
- Functions/variables: `camelCase` (e.g., `getUserData`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `API_BASE_URL`)
- Types/interfaces: `PascalCase` (e.g., `UserData`)

---

## ⚛️ Component Guidelines

### Basic Component Template

```tsx
// components/UserCard.tsx
interface UserCardProps {
  name: string
  email: string
  onEdit?: () => void
}

export default function UserCard({ name, email, onEdit }: UserCardProps) {
  return (
    <div className="rounded-lg border p-4">
      <h3 className="text-lg font-semibold">{name}</h3>
      <p className="text-muted-foreground">{email}</p>
      {onEdit && (
        <button onClick={onEdit} className="mt-2 text-sm text-primary">
          Edit
        </button>
      )}
    </div>
  )
}
```

### Component Rules
1. **Props Types**: Always define Props interface
2. **Default Export**: Use `export default` for components
3. **Client Components**: Add `"use client"` only when interaction or browser APIs are needed
4. **Simplicity**: Keep components under 150 lines, split if exceeded

---

## 🎨 Style Guidelines

### 📸 Image Assets

**⚠️ Important: Always use real images from open-source websites**

**Recommended Sources:**
- **Unsplash** (https://unsplash.com) - High-quality free photos
- **Pexels** (https://pexels.com) - Free stock photos
- **Pixabay** (https://pixabay.com) - Free images and illustrations

### Tailwind CSS Usage

**⚠️ Important: This template uses Tailwind CSS v4**
- Use `@import "tailwindcss"` instead of `@tailwind` directives
- CSS variables are defined in `globals.css` under `:root` — use them via `var(--name)` or Tailwind's `text-foreground`, `bg-background`, etc.
- Do not modify the `@theme inline` configuration in `globals.css`

```tsx
// ✅ Recommended: use CSS variable tokens
<div className="bg-background text-foreground border border-border rounded-lg p-4">

// ✅ Also fine: standard Tailwind utilities
<div className="bg-white text-slate-900 rounded-lg border p-4 shadow-sm hover:shadow-md transition-shadow">

// ❌ Avoid: inline styles
<div style={{ backgroundColor: 'white', padding: '16px' }}>
```

### Utility Function cn()
```tsx
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Usage
<div className={cn("p-4 rounded", isActive && "bg-primary text-primary-foreground")} />
```

---

## 🗂️ State Management (Zustand)

Use Zustand for **global client-side state** (e.g. current logged-in user, UI theme, cart). Do not use it to cache server data — use Server Components or React Query for that.

### Store Definition
```ts
// store/user-store.ts
import { create } from "zustand"
import type { User } from "@/types/database.types"

interface UserState {
  user: User | null
  setUser: (user: User) => void
  logout: () => void
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  logout: () => set({ user: null }),
}))
```

### Usage
```tsx
'use client'

import { useUserStore } from "@/store/user-store"

export default function Profile() {
  const user = useUserStore((state) => state.user)
  return <div>{user?.name ?? 'Guest'}</div>
}
```

---

## 🛣️ Routing and Pages

### Page Components
```tsx
// app/users/page.tsx — Server Component by default
export default function UsersPage() {
  return (
    <main className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">User List</h1>
      {/* Content */}
    </main>
  )
}
```

### API Routes (use only when needed — prefer Server Actions)
```ts
// app/api/users/route.ts
import { NextResponse } from "next/server"

export async function GET() {
  const { data, error } = await supabase.from('users').select('*')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
```

---

## 🔧 Common Utility Functions

### File Locations
```
src/lib/supabase.ts     # Supabase client (DB access)
src/lib/utils.ts        # General utilities (cn, formatDate, etc.)
src/lib/format.ts       # Formatting functions
```

### Examples
```ts
// lib/utils.ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("zh-CN").format(new Date(date))
}
```

---

## 📦 Dependencies Guide

| Package | Purpose | Usage |
|---------|---------|-------|
| `@supabase/supabase-js` | **Database client** | `import { supabase } from "@/lib/supabase"` |
| `bcryptjs` | Password hashing | Server Actions only — never in Client Components |
| `lucide-react` | Icons | `import { User } from "lucide-react"` |
| `zustand` | Client state | Global state (user session, UI flags) |
| `@radix-ui/*` | Headless components | Dialogs, dropdowns, selects |
| `framer-motion` | Animations | Page transitions, component animations |
| `next-themes` | Theme switching | Dark/light mode |
| `clsx` + `tailwind-merge` | Class merging | Via `cn()` utility |

---

## ✅ Best Practices

### 1. Data Fetching

```tsx
// ✅ Server Component — fetch from Supabase directly
import { supabase } from '@/lib/supabase'

async function PostList() {
  const { data: posts } = await supabase
    .from('posts')
    .select('id, title, created_at')
    .order('created_at', { ascending: false })

  return <ul>{posts?.map(p => <li key={p.id}>{p.title}</li>)}</ul>
}

// ✅ Client Component — call a Server Action for mutations
'use client'
import { createPostAction } from '@/app/actions/create-post'
import { useTransition } from 'react'

function NewPostForm() {
  const [isPending, startTransition] = useTransition()
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      await createPostAction(/* form data */)
    })
  }
  return <form onSubmit={handleSubmit}>...</form>
}
```

### 2. Error Handling
```tsx
// app/users/error.tsx
'use client'

export default function Error({ error, reset }: {
  error: Error
  reset: () => void
}) {
  return (
    <div className="p-6 text-center">
      <p className="text-destructive">{error.message}</p>
      <button
        onClick={reset}
        className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg"
      >
        Retry
      </button>
    </div>
  )
}
```

### 3. Loading States
```tsx
// app/users/loading.tsx
export default function Loading() {
  return (
    <div className="p-6 flex justify-center">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
```

---

## 🚫 What to Avoid

1. ❌ Using `useState`/`useEffect` in Server Components
2. ❌ **Querying the database directly from a Client Component** — always go through a Server Action or Server Component
3. ❌ **Putting `service_role_key` in any client-side code** — use `anon_key` only
4. ❌ Nesting components more than 3–4 levels deep
5. ❌ Inline styles (`style={{}}`), use Tailwind instead
6. ❌ Overusing global state, prefer props and Server Components
7. ❌ Missing TypeScript type definitions
8. ❌ Skipping error checks on Supabase responses (always check `error` before using `data`)

---

## 🎯 Development Workflow

### Adding New Features

1. **Design DB schema** — decide what table(s) and columns are needed
2. **Create table via Supabase** (agent uses `supabase` tool with `apply_migration`)
3. **Define TypeScript types** in `src/types/database.types.ts`
4. **Create Server Actions** in `src/app/actions/` for writes
5. **Build page** in `src/app/` — Server Component for reads, Client Component for interactive forms
6. **Create components** in `src/components/` for reusable UI
7. **Add Zustand store** in `src/store/` only if global client state is needed

### New Page Checklist
- [ ] Route file created at `src/app/<route>/page.tsx`
- [ ] TypeScript types defined for all DB data used
- [ ] Supabase queries in Server Components (reads)
- [ ] Mutations in Server Actions under `src/app/actions/`
- [ ] Loading state: `loading.tsx`
- [ ] Error state: `error.tsx`

---

## 📚 Quick Reference

- **Next.js Docs**: https://nextjs.org/docs
- **Supabase JS Docs**: https://supabase.com/docs/reference/javascript
- **Tailwind CSS**: https://tailwindcss.com/docs
- **Zustand**: https://github.com/pmndrs/zustand
- **Radix UI**: https://www.radix-ui.com/

---

**Remember: Server Components read from Supabase directly. Client Components trigger Server Actions for writes. Keep it simple.**
