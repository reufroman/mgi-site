import { defineConfig } from 'astro/config';
export default defineConfig({output:'static', site: process.env.MGI_SITE_URL || 'https://mgi-review.invalid', trailingSlash:'always', outDir: process.env.MGI_BUILD_MODE === 'release' ? './dist-release' : process.env.MGI_BUILD_MODE === 'public' ? './dist-public' : './dist-review', server:{port:4321,host:'127.0.0.1'}});
