import {defineCollection,z} from 'astro:content';
import {file} from 'astro/loaders';
const editorial=defineCollection({loader:file('src/data/editorial.json'),schema:z.object({eyebrow:z.string(),title:z.string(),summary:z.string(),answer:z.string(),sections:z.array(z.object({heading:z.string(),body:z.string(),bullets:z.array(z.string()).optional()})),faqs:z.array(z.object({question:z.string(),answer:z.string()})),ctaLabel:z.string(),reviewNotes:z.array(z.string()),sources:z.array(z.string()).min(1)})});
export const collections={editorial};
