import { test } from '@playwright/test';
import { pages, origin } from '../../src/pages.mjs';
import { validateSocialHtml, validateSocialImage } from '../../scripts/social-preview.mjs';

test('built pages serve social metadata and a real raster without running JavaScript', async ({ request }) => {
  let checkedImage;
  for (const page of pages.filter(p => !p.noindex)) {
    const response = await request.get(page.path);
    const { image, type } = validateSocialHtml(await response.text(), `${origin}${page.path}`);
    if (image !== checkedImage) {
      const asset = await request.get(new URL(image).pathname);
      if (asset.status() !== 200) throw new Error(`Social image returned ${asset.status()}`);
      await validateSocialImage(await asset.body(), asset.headers()['content-type']);
      if (asset.headers()['content-type'] !== type) throw new Error('Social image MIME differs from metadata');
      checkedImage = image;
    }
  }
});
