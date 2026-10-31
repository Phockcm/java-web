/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_API_URL?: string
	readonly VITE_VIETQR_BANK_BIN?: string
	readonly VITE_VIETQR_ACCOUNT_NUMBER?: string
	readonly VITE_VIETQR_ACCOUNT_NAME?: string
}

interface ImportMeta {
	readonly env: ImportMetaEnv
}