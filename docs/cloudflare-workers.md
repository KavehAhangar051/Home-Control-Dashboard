# Cloudflare Workers deployment

The production Workers build uses the OpenNext Cloudflare adapter. Run:

- `bun install`
- `bun run preview` for a local Wrangler preview
- `bun run deploy` to build and deploy the Worker
- `bun run cf-typegen` to generate local Cloudflare environment types

Production builds use Next.js standalone output. GitHub Pages and Capacitor builds
retain static export output through their respective environment flags.

## Cloudflare Workers Builds settings

Configure the connected repository under **Workers & Pages → Worker → Settings →
Builds**:

- **Build command:** `npx @opennextjs/cloudflare build`
- **Deploy command (production):** `npx @opennextjs/cloudflare deploy`
- **Preview command (non-production branches):** `npx wrangler preview`

The OpenNext build command invokes the repository's existing `build` script
(which runs `next build` and static-asset compression) and then generates the
Cloudflare Worker bundle at `.open-next/worker.js`. Do not use only
`bun run build` as the Workers Builds command: that creates the Next.js output
but does not generate the Worker entry point required by Wrangler.

The Preview command runs after the Build command and expects that generated
entry point to exist. The `previews` block in `wrangler.jsonc` is required by
Wrangler Worker Previews; it may remain empty when Preview does not need separate
bindings or variables.

These Build, Deploy, and Preview commands are configured in the Cloudflare
dashboard, not in `wrangler.jsonc`.

The MQTT client is browser-side and uses the configured broker WebSocket URL
(defaulting to `wss://broker.emqx.io:8084/mqtt`). Do not move MQTT connections
into Worker server code without separately adapting and validating the transport.
