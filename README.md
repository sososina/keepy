# Keepy Cloudflare Pages Export

This directory contains the Cloudflare Pages-ready static export for `https://keepy.kr`.

## Build

```sh
npm run build
```

The generated site is written to `public/`.

## Preview

```sh
npm run preview
```

Local preview runs at `http://localhost:8788`.

## Deploy

```sh
npx wrangler login
npm run deploy -- --project-name keepy
```

The project has also been prepared for GitHub Actions deployment. Add this GitHub repository secret before relying on automatic deployments:

```text
CLOUDFLARE_API_TOKEN
```

The token needs Cloudflare Pages write permission for account `d0a2b200822251923d253b84fa3eae3a`.

After deployment, connect `keepy.kr` and `www.keepy.kr` to the `keepy` Pages project in Cloudflare Pages custom domains. Then update the `keepy.kr` nameservers at Gabia to the nameservers Cloudflare assigns for the zone.

## Notes

The export was built from the WordPress seed/theme files available in this workspace. To migrate posts, media, comments, users, plugin settings, or uploads that exist only on the live Cloudways WordPress server, export those from the live WordPress database and `wp-content/uploads`, then merge them into this static build.
