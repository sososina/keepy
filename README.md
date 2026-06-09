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

After deployment, connect `keepy.kr` and `www.keepy.kr` to the `keepy` Pages project in Cloudflare Pages custom domains.

## Notes

The export was built from the WordPress seed/theme files available in this workspace. To migrate posts, media, comments, users, plugin settings, or uploads that exist only on the live Cloudways WordPress server, export those from the live WordPress database and `wp-content/uploads`, then merge them into this static build.
