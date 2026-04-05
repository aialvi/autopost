# Contributing to AutoPost

Thank you for considering contributing to AutoPost!

## Development Setup

1. Fork and clone the repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env.local` and configure
4. Set up the database: `npm run db:push`
5. Start the dev server: `npm run dev`

## Code Style

- Use TypeScript for all new files
- Follow the existing code structure
- Use Prettier for formatting
- Run `npm run lint` before committing

## Project Structure

```
src/
├── app/              # Next.js app router pages
├── components/       # React components
├── lib/             # Utilities and business logic
│   ├── actions/      # Server actions
│   ├── auth/         # Authentication
│   ├── db/           # Database client and schema
│   ├── payments/     # Payment processing
│   └── ...
└── styles/          # Global styles
```

## Submitting Changes

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Commit your changes with clear messages
3. Push to your fork: `git push origin feature/my-feature`
4. Open a pull request

## Testing

- Add tests for new utilities
- Test manually in the browser
- Ensure TypeScript compiles: `npx tsc --noEmit`
- Run linting: `npm run lint`

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
