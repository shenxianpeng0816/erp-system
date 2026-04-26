# CodeBanana Base Template

> Clean, modern web development template - Optimized for AI-driven development

## ✨ Features

- 🚀 **Next.js 15** - Latest App Router and Turbopack
- 📘 **TypeScript** - Complete type safety
- 🎨 **Tailwind CSS v4** - Modern styling with pre-configured design system
- 🎯 **Clean Architecture** - Easy to understand and extend
- 🤖 **AI Friendly** - Optimized structure for AI code generation
- 🌙 **Dark Mode** - Automatic system theme adaptation


## 📁 Project Structure

```
src/
├── app/              # Next.js App Router
│   ├── page.tsx     # Home page
│   └── layout.tsx   # Root layout
├── components/       # Reusable components
├── lib/             # Utility functions
└── types/           # TypeScript types
```

## 📝 Development Guide

See [CODING_GUIDE.md](./CODING_GUIDE.md) for detailed development standards and best practices.

## ⚠️ Important Configuration

This template uses **Tailwind CSS v4**, which differs from v3. See the styling guidelines in [CODING_GUIDE.md](./CODING_GUIDE.md) for details.

### Quick Checklist
- ✅ Use `@import "tailwindcss"` instead of `@tailwind` directives
- ✅ Do not modify core configuration in `globals.css`

## 🛠️ Tech Stack

- **Framework**: Next.js 15
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Icons**: Lucide React
- **UI Components**: Radix UI

## 📜 Commands

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run linting
```

## 📚 Learning Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## 📄 License

MIT
