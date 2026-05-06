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
- `pnpm services:start` / `pnpm services:stop` — start/stop local Docker services (Postgres, etc.)

## Code Conventions

- **No barrel re-exports**: Do not create `index.ts` files that only re-export from other modules. Import directly from the source file (e.g. `$lib/server/cecotec/client` not `$lib/server/cecotec`). Barrels obscure the dependency graph, can cause circular imports, and make mocking harder in tests.

## Code quality

You are responsible for ensuring that the code is of the utmost quality. For this you should follow a set of guidelines:
- Code legibility: code should be easy to understand and follow. Code should be self-documented with well-chosen variable & function names, and otherwise have proper docstrings in cases of complexity.
- Avoid duplicating code. You should avoid copy-pasting, and instead favor extracting common logic to places that can be reused, always having in mind maintainability.
- Follow best practices of the tools and technologies we use, as well as best practices in terms of coding patterns.
- Refactor. When modifying existing functionality, consider refactoring what is in place to work in a better and clearer way with what you are currently implementing. If you notice that a refactor is becoming too big compared to the functionality being added, you can alternatively opt for creating a github issue to address the refactor separately.
- Bug detection. When making changes, if you notice a bug related to your changes, fix it. If you notice a bug unrelated to your current changes or if you notice that the bug requires significant changes compared to what you are currently working on, create a github issue to address the fix separately.
- Code maintainability: the above guidelines should help make code maintainable, but keep maintainability in mind as well.

In general you should follow these guidelines, however it is also important to know that they are flexible: in some cases you may need to deviate slightly to avoid overcomplicating a solution. For example in some cases it is preferrable to have a small amount of code duplication versus many layers of abstractions which would otherwise make the code more difficult to read.

## Local Development

- **Always work against the local database** when developing or working on issues. Never use the production or preview database for local development.
- Run `pnpm services:start` to spin up the local Postgres via Docker (`docker-compose.yml`).
- The `.env.example` `DATABASE_URL` points to the local instance: `postgresql://postgres:postgres@localhost:5432/open-kitchen`.
- After starting services, run `pnpm db:push` to apply the schema to your local database (if relevant).
- Run `pnpm services:stop` when done.

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
  - `GET /api/blade-cook/recipe/createRecipeApp/selectPage` — list user's custom recipes (flat metadata only, no steps/ingredients)
  - `GET /api/blade-cook/kitCloud/front/user/recipe/app/detail` — get full recipe detail including steps; params: `id`, `number`, `code`, `recipeType`, `selectedLanguage`, `appOrDevice`, `sourceType`; steps are in `data.multiLanguageRelations[0].recipeDeviceParameterDtos`
  - `PUT /api/blade-cook/recipe/createRecipeApp/deleteRecipe` — delete recipe by ID
  - `POST /api/blade-resource/oss/endpoint/put-file` — upload image to CDN
- **Model code**: `"MamboTouch"`
- **Recipe creation flow**: POST add (creates hidden draft) → POST update with `recipeStatus: 1` (publishes it).
- **Update behavior (verified in issue #9 — full-circle confirmed)**:
  - `POST /api/blade-cook/recipe/createRecipeApp/update` on an already-published recipe fully updates it in place: `defaultName`, `serviceSize`, `cookingTime`, and all steps (`recipeDeviceParameterDtos`) are persisted and readable back via the detail endpoint.
  - Steps are verified via `GET /api/blade-cook/kitCloud/front/user/recipe/app/detail` → `data.multiLanguageRelations[0].recipeDeviceParameterDtos`.
  - `id` (`recipeId`) and `number` (CookbookId) remain stable across updates.
  - `ingredientsRelationVosList` is not persisted via API alone (server requires multilanguage relation record created by the official app — known limitation).
  - **Recommended sync strategy**: update-in-place (preserves CookbookId). Fall back to delete+recreate only on update failure.

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
