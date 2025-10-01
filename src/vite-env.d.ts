/// <reference types="vite/client" />
/// <reference types="@amap/amap-jsapi-types" />

declare interface ImportMetaEnv {
  readonly VITE_AMAP_KEY?: string
  readonly VITE_AMAP_JS_CODE?: string
}

declare interface ImportMeta {
  readonly env: ImportMetaEnv
}
