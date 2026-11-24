/// <reference types="vite/client" />

// Declare every `VITE_*` variable the app reads, so `import.meta.env.X` is
// typed instead of `any` and never needs a cast.
interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
