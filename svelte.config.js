import adapter from "@sveltejs/adapter-vercel";
import { mdsvex } from "mdsvex";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: { adapter: adapter() },
  preprocess: [mdsvex({ extensions: [".svx", ".md"] })],
  extensions: [".svelte", ".svx", ".md"],
};

export default config;
