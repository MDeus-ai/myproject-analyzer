/**
 * Platform composition root for the WEB app.
 *
 * Registers the browser bridge before React renders, so any component
 * calling getPlatform() always has an implementation available.
 * On web: all files are blob-backed, so no PathTextReader is needed.
 */
import { setPlatform } from "@myproject/platform";
import { WebPlatformBridge } from "@myproject/platform-web";

setPlatform(new WebPlatformBridge());
