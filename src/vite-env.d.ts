/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PIPEFY_ACTIVE_PHASES?: string;
  readonly VITE_PIPEFY_PRIORITIZED_PHASES?: string;
  readonly VITE_PIPEFY_PIPES?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
