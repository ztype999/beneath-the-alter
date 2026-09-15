# BENEATH THE ALTER

Responsive band website rebuilt from the original Wix site and the linked official Spotify profile.

## Website and management

- Website: https://ztype999.github.io/beneath-the-alter/
- Control room: https://ztype999.github.io/beneath-the-alter/admin/
- Content editor: https://app.pagescms.org/ — sign in with GitHub, authorize this repository, and select `ztype999/beneath-the-alter`, branch `main`.

The editor has seven sections: homepage/settings, music, biography/members, shows, merch, gallery, and videos. Images are stored under `assets`; new uploads go in `assets/uploads`.

Saving content starts a GitHub Actions build. Check the repository’s **Actions** tab for deployment status. A daily build also moves dated shows into the archive. Invalid content stops publishing and preserves the last successful deployment.

## Local development

Install Bun, then run:

```sh
SITE_URL=https://ztype999.github.io/beneath-the-alter bun build/build-site.ts .
python3 -m http.server 8000
```

Edit `data/*.json` for content, `build/site/*.ts` for templates, and `site.css`/`site.js` for presentation and interactions. The generated HTML is standalone.

## Important

- Contact forms prepare an email draft; they do not send or store messages.
- Merch uses direct inquiries. Confirm stock, sizing, shipping, and payment with the band.
- Original Wix event records remain archived. No invented dates or ticket sales.
- Existing social handles are preserved, including YouTube’s `@BeneaththeAltar`.
- Band photos, art, and recordings remain their owners’ property. Font licenses are in `licenses/`.
