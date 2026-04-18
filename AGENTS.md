## Workflow

**Before starting any feature or issue-driven task**, read and follow the `feature-workflow` skill (`.agents/skills/feature-workflow/SKILL.md`). It defines the full process: fetch issue → check dependencies → assess codebase → implement → test → commit → PR.

---

## Project Configuration

- **Language**: TypeScript
- **Package Manager**: pnpm
- **Framework**: SvelteKit (Svelte 5) with Vercel adapter
- **Auth**: better-auth (email+password), client via `$lib/auth-client.ts`, server via `$lib/server/auth.ts`
- **Database**: Neon Postgres (serverless), Drizzle ORM. Config in `drizzle.config.ts`, schema in `src/lib/server/db/schema.ts`.
- **Styling**: TailwindCSS 4 + DaisyUI 5
- **Linting/Format**: Biome
- **Testing**: Vitest (unit, browser via playwright provider), Playwright (E2E). `requireAssertions: true` in vitest config.
- **i18n**: Paraglide (en, es, ca). Messages in `messages/{locale}.json`.
- **Other**: mdsvex, devtools-json

## Key Commands

- `pnpm dev` — dev server
- `pnpm test:unit --run` — vitest
- `pnpm test:e2e` — playwright E2E
- `pnpm lint` / `pnpm format` — biome
- `pnpm check` — svelte & typescript
- `pnpm db:generate` / `pnpm db:migrate` / `pnpm db:push` — drizzle migrations

## Current State

- Auth flow complete: sign in, sign up, sign out pages.
- DB schema has only better-auth tables: `user`, `session`, `account`, `verification`.
- No recipe tables, no recipe UI, no Cecotec integration yet.
- `.mambo/` folder contains **reference Python scripts** (not commited with repository) showing Cecotec API interaction.

## Cecotec API Reference

- **Base URL**: `https://product.kitchenidea.org`
- **Auth**: OAuth2 password grant. Password is RSA-encrypted (PKCS1 v1.5) with a known public key before sending. Basic auth header for token endpoint: `"Basic c3dvcmQ6c3dvcmRfc2VjcmV0"` (sword:sword_secret).
- **Required headers**: `cloud-kit-app-language`, `cloud-kit-app-type: android`, `cloud-kit-cur-app-version: 1.9.9`, `user-agent: Dart/2.16 (dart:io)`
- **Endpoints**:
  - `POST /api/blade-auth/oauth/token` — authenticate, returns `access_token`, `refresh_token`, `user_id`
  - `POST /api/blade-cook/recipe/createRecipeApp/add` — create recipe (draft)
  - `POST /api/blade-cook/recipe/createRecipeApp/update` — publish/update recipe
  - `GET /api/blade-cook/recipe/createRecipeApp/selectPage` — list user's custom recipes
  - `PUT /api/blade-cook/recipe/createRecipeApp/deleteRecipe` — delete recipe by ID
  - `POST /api/blade-resource/oss/endpoint/put-file` — upload image to CDN
- **Model code**: `"MamboTouch"`
- **Recipe creation flow**: POST add (creates hidden draft) → POST update with `recipeStatus: 1` (publishes it).
- **No edit endpoint confirmed** — updates may require delete + recreate on Cecotec side.

## Recipe Data Model (Cecotec)

```
Recipe:
  defaultName: string
  serviceSize: string (servings)
  cookingTime: number (seconds, total)
  landscapeImageUrl: string (CDN URL)
  language: string
  modleCode: "MamboTouch"  (note: typo is intentional, API uses "modle")
  appOrDevice: 1
  sourceType: 1
  recipeStatus: 1 (published)
  recipeCategoryIds: []
  recipeTagIds: []
  ingredientsRelationVosList:
    - ingredientId: string
    - foodIngredient: string (display name)
    - unitId: string
    - unit: string (g, ml, tsp, etc.)
    - amount: string
  recipeDeviceParameterDtos (steps):
    - stepDesc: string
    - operationType: 0 (manual) | 1 (prep/ingredients) | 2 (cooking)
    - singleTotalTime: number (seconds)
    - cookSteps:
        - time: number (seconds)
        - power: number (0-10)
        - speed: string ("0"-"10")
        - temperature: number (°C)
        - accessoriesType: -1
        - reel: ""
    - accessoriesList: []
    - recipeFoodIngredients: []
    - introduceUrl: string
    - introduceUrls: string[]
    - videoUrl: string
```

## Image Upload

Images are uploaded via `POST /api/blade-resource/oss/endpoint/put-file` as multipart form. Returns `{ data: { link: "https://file.cecotecapps.net/..." } }`. Supported formats: jpeg, png, gif, webp.

---

## Available MCP Tools (Svelte):

### 1. list-sections

Use this FIRST to discover all available documentation sections. Returns a structured list with titles, use_cases, and paths.
When asked about Svelte or SvelteKit topics, ALWAYS use this tool at the start of the chat to find relevant sections.

### 2. get-documentation

Retrieves full documentation content for specific sections. Accepts single or multiple sections.
After calling the list-sections tool, you MUST analyze the returned documentation sections (especially the use_cases field) and then use the get-documentation tool to fetch ALL documentation sections that are relevant for the user's task.

### 3. svelte-autofixer

Analyzes Svelte code and returns issues and suggestions.
You MUST use this tool whenever writing Svelte code before sending it to the user. Keep calling it until no issues or suggestions are returned.

### 4. playground-link

Generates a Svelte Playground link with the provided code.
After completing the code, ask the user if they want a playground link. Only call this tool after user confirmation and NEVER if code was written to files in their project.
