# Cure8 - Clean Rebuild

A clean, production-ready rebuild of Cure8 bookmark manager with the same beautiful cosmic purple theme and all features, but none of the bugs.

## Features

✅ **Bookmark Management**
- Add bookmarks via URL paste (auto-fetch metadata)
- CRUD operations with SQLite database
- Notes and descriptions
- Import/Export JSON

✅ **Beautiful UI**
- Cosmic purple theme with gradients and glows
- 4 layout modes: Grid, Masonry, List, Compact
- Responsive design
- Smooth animations and transitions

✅ **Views**
- Home dashboard with stats
- All Bookmarks, Work, Personal, Favorites, Recent
- Settings with preferences
- Help section

✅ **Search & Filter**
- Real-time search
- Filter by category
- Smart URL detection in omnibox

## Tech Stack

- **Next.js 15** - App Router
- **React 19** - Latest features
- **Prisma** - Type-safe database ORM
- **SQLite** - Local database
- **TailwindCSS 4** - Styling
- **TypeScript** - Type safety

## Getting Started

### Install Dependencies

```bash
pnpm install
```

### Initialize Database

```bash
pnpm prisma:push
```

### Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

### Build for Production

```bash
pnpm build
pnpm start
```

## Project Structure

```
cure8-clean/
├── app/
│   ├── api/cards/          # API routes for CRUD
│   ├── globals.css         # All styling (cosmic purple theme)
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Main page with state management
├── components/
│   ├── AppShell.tsx        # Layout shell with sidebar/header
│   ├── BookmarkModal.tsx   # Detailed bookmark view
│   ├── Card.tsx            # Bookmark card component
│   ├── HomeScreen.tsx      # Home dashboard
│   ├── SettingsScreen.tsx  # Settings view
│   └── Sidebar.tsx         # Navigation sidebar
├── lib/
│   ├── cards.ts            # Database operations
│   └── db.ts               # Prisma client
└── prisma/
    └── schema.prisma       # Database schema
```

## Features Included

### Bookmark Management
- ✅ Add URLs with automatic metadata fetching
- ✅ Edit notes for each bookmark
- ✅ Delete bookmarks with confirmation
- ✅ View detailed modal with all info
- ✅ Status tracking (pending/ok/error)

### Layout Modes
- ✅ **Grid** - Standard card grid
- ✅ **Masonry** - Pinterest-style layout
- ✅ **List** - Detailed list view with all info
- ✅ **Compact** - Dense card grid

### Settings
- ✅ Auto-fetch metadata toggle
- ✅ Show thumbnails toggle
- ✅ Custom preview service URL
- ✅ Export bookmarks (JSON)
- ✅ Import bookmarks (JSON)
- ✅ Clear all data

### Home Dashboard
- ✅ Total bookmarks count
- ✅ Status breakdown (ready/pending/errors)
- ✅ Recent bookmarks preview
- ✅ Quick actions
- ✅ Statistics cards

## Database

Uses SQLite with Prisma ORM. The database file is created at `prisma/dev.db`.

### Schema

```prisma
model Card {
  id          String   @id @default(cuid())
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  title       String
  url         String
  image       String?
  notes       String?
  description String?
  domain      String?
  status      String   @default("ok")
  metadata    String?
}
```

## API Routes

- `GET /api/cards` - List all bookmarks
- `POST /api/cards` - Create bookmark
- `PATCH /api/cards/[id]` - Update bookmark
- `DELETE /api/cards/[id]` - Delete bookmark
- `DELETE /api/cards` - Clear all bookmarks

## Styling

All CSS is in `app/globals.css` with:
- Cosmic purple theme (#7C3AED primary)
- Dark mode with gradients
- Custom scrollbars
- Glassmorphism effects
- Smooth animations
- Responsive breakpoints

## What's Different from the Old Version

✨ **Clean codebase** - No legacy issues or browser polyfills
✨ **Better organization** - Clear separation of concerns
✨ **Type safety** - Full TypeScript throughout
✨ **Modern Next.js** - Latest App Router patterns
✨ **No bugs** - Fresh start without accumulated issues

## Notes

- The preview service URL defaults to `http://localhost:8787/preview?url={{url}}`
- You can change this in Settings
- **Preview service is optional** - If unavailable, bookmarks are saved with just the URL (no metadata fetch)
- Import/Export uses standard JSON format compatible with the old version
- All data is stored locally in SQLite
- No hydration errors - all localStorage reads happen after mount
- 10-second timeout on preview fetches to prevent hanging

## Troubleshooting

### "Failed to fetch" when adding bookmarks
This is normal if the preview service (`http://localhost:8787`) isn't running. The bookmark is still saved successfully, just without metadata. You can either:
1. Disable "Auto-fetch metadata" in Settings, or
2. Set up a preview service, or
3. Ignore the console warning - bookmarks work fine without it

### Hydration errors
Fixed! All localStorage access now happens after component mount in `useEffect`.

---

Built with ❤️ using Next.js 15, React 19, and Prisma
