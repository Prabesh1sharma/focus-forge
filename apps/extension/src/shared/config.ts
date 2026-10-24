declare const __FOCUSFORGE_DEFAULT_API_URL__: string | undefined;

export const PRODUCTION_API_URL = "https://focus-forge-alpha-three.vercel.app";
export const LOCALHOST_API_URL = "http://localhost:3000";

/**
 * The default API URL used by the extension.
 * Defaults to the production Vercel deployment (https://focus-forge-alpha-three.vercel.app).
 * Can be overridden at build time via NEXT_PUBLIC_APP_URL or FOCUSFORGE_API_URL,
 * or by users at runtime in the Extension Popup and Options page.
 */
export const DEFAULT_API_URL =
  typeof __FOCUSFORGE_DEFAULT_API_URL__ !== "undefined" && __FOCUSFORGE_DEFAULT_API_URL__
    ? __FOCUSFORGE_DEFAULT_API_URL__.replace(/\/+$/, "")
    : PRODUCTION_API_URL;
