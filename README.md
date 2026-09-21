# sv

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project
npx sv create my-app
```

To recreate this project with the same configuration:

```sh
# recreate this project
pnpm dlx sv@0.13.0 create --template demo --types ts --add vitest="usages:unit,component" playwright tailwindcss="plugins:typography,forms" sveltekit-adapter="adapter:vercel" devtools-json mdsvex paraglide="languageTags:en, es, ca+demo:yes" mcp="ide:vscode+setup:local" --install pnpm open-kitchen
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.

## Recipe images

Recipe images are uploaded directly to the Cecotec CDN and the returned URL is
stored with the recipe. OpenKitchen does not maintain a second copy in Vercel
Blob or another object store. This keeps the upload flow simple, but image
uploads require the user to connect their Cecotec account first.

Uploads accept JPEG, PNG, GIF, and WebP files up to 5 MB. The 5 MB limit is an
OpenKitchen policy; Cecotec does not publish a size or dimension limit for its
`put-file` endpoint.
