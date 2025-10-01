# Cure8-Clean MVP

A modern bookmark management application built with Next.js 15, designed to help you curate and organize what matters most.

## 🚀 Features

- **Pure Next.js 15** - Latest App Router architecture
- **React 19** - Modern React with TypeScript
- **Prisma Database** - SQLite database with type-safe queries
- **Tailwind CSS 4.0** - Modern styling system
- **Bookmark Management** - Save, organize, and manage web links
- **Metadata Fetching** - Automatic preview generation
- **Responsive Design** - Works on all devices
- **Multiple Layouts** - Grid, Masonry, List, and Compact views

## 🛠️ Tech Stack

- **Framework**: Next.js 15.1.6
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4.0
- **Database**: Prisma with SQLite
- **Package Manager**: pnpm

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm (recommended) or npm

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd cure8-clean
```

2. Install dependencies:
```bash
pnpm install
# or
npm install
```

3. Set up the database:
```bash
pnpm prisma generate
pnpm prisma db push
```

4. Start the development server:
```bash
pnpm dev
# or
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
cure8-clean/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── AppShell.tsx       # Main app layout
│   ├── BookmarkModal.tsx  # Bookmark details modal
│   ├── Card.tsx           # Bookmark card component
│   ├── HomeScreen.tsx     # Home dashboard
│   ├── SettingsScreen.tsx # Settings page
│   └── Sidebar.tsx        # Navigation sidebar
├── lib/                   # Utility functions
│   ├── cards.ts           # Database operations
│   └── db.ts              # Prisma client
├── prisma/                # Database schema
└── public/                # Static assets
```

## 🎯 MVP Goals

This is the MVP version of Cure8, focused on:

- ✅ Core bookmark management functionality
- ✅ Clean, modern UI/UX
- ✅ Responsive design
- ✅ Type-safe development
- ✅ Production-ready build system

## 🚀 Deployment

The app is ready for deployment on platforms like:

- **Vercel** (recommended for Next.js)
- **Netlify**
- **Railway**
- **DigitalOcean App Platform**

### Build for Production

```bash
pnpm build
pnpm start
```

## 📝 Development

### Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm prisma:generate` - Generate Prisma client
- `pnpm prisma:push` - Push schema to database

### Code Quality

- TypeScript for type safety
- ESLint for code quality
- Prettier for code formatting
- Tailwind CSS for consistent styling

## 🤝 Contributing

This is an MVP project. For contributions or issues, please contact the development team.

## 📄 License

Private project - All rights reserved.

---

**Cure8-Clean MVP** - Curate what matters most today.