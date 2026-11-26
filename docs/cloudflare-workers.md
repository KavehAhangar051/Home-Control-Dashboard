# Cloudflare Workers deployment

The production Workers build uses the OpenNext Cloudflare adapter. Run:

- `bun install`
- `bun run preview` for a local Wrangler preview
- `bun run deploy` to build and deploy the Worker
- `bun run cf-typegen` to generate local Cloudflare environment types

Production builds use Next.js standalone output. GitHub Pages and Capacitor builds
retain static export output through their respective environment flags.

Wrangler Worker Previews require a `previews` block in `wrangler.jsonc`.
The empty block is intentional when Preview does not need separate bindings or
variables; it does not move or duplicate top-level assets and compatibility
settings.

The MQTT client is browser-side and uses the configured broker WebSocket URL
(defaulting to `wss://broker.emqx.io:8084/mqtt`). Do not move MQTT connections
into Worker server code without separately adapting and validating the transport.
