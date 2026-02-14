#!/usr/bin/env node

/**
 * Convert Fastify routes to Express routes
 * This script automatically converts all Fastify route files to Express
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '../..');
const routesDir = path.join(projectRoot, 'src/api/routes');

async function convertFile(filePath: string): Promise<void> {
  console.log(`Converting ${filePath}...`);
  
  let content = await fs.readFile(filePath, 'utf-8');
  
  // Skip if already converted
  if (content.includes('import { Router, Request, Response') && !content.includes('Fastify')) {
    console.log(`  Skipping (already Express)`);
    return;
  }
  
  // Replace Fastify imports with Express imports
  content = content.replace(
    /import\s+{\s*FastifyPluginAsync,\s*FastifyRequest,\s*FastifyReply\s*}\s+from\s+['"]fastify['"]/g,
    "import { Router, Request, Response, NextFunction } from 'express'"
  );
  
  content = content.replace(
    /import\s+{\s*FastifyRequest,\s*FastifyReply\s*}\s+from\s+['"]fastify['"]/g,
    "import { Request, Response, NextFunction } from 'express'"
  );
  
  content = content.replace(
    /import\s+{\s*FastifyInstance\s*}\s+from\s+['"]fastify['"]/g,
    "import { Router } from 'express'"
  );
  
  // Replace FastifyPluginAsync with Router function
  content = content.replace(
    /export\s+const\s+(\w+):\s*FastifyPluginAsync\s*=\s*async\s*\(fastify\)\s*=>\s*{/g,
    'export function create$1(): Router {\n  const router = Router();'
  );
  
  // Replace fastify.post/get/put/delete/patch with router equivalents
  content = content.replace(/fastify\.(post|get|put|delete|patch)\(/g, 'router.$1(');
  
  // Replace FastifyRequest and FastifyReply with Express types
  content = content.replace(/FastifyRequest/g, 'Request');
  content = content.replace(/FastifyReply/g, 'Response');
  
  // Replace reply.status().send() with res.status().json()
  content = content.replace(/reply\.status\((\d+)\)\.send\(/g, 'res.status($1).json(');
  content = content.replace(/reply\.send\(/g, 'res.json(');
  content = content.replace(/reply\.code\((\d+)\)\.send\(/g, 'res.status($1).json(');
  
  // Replace request with req
  content = content.replace(/request\./g, 'req.');
  content = content.replace(/\(request:/g, '(req:');
  content = content.replace(/,\s*request:/g, ', req:');
  
  // Replace reply with res
  content = content.replace(/reply\./g, 'res.');
  content = content.replace(/,\s*reply:/g, ', res:');
  content = content.replace(/\(reply:/g, '(res:');
  
  // Remove Fastify schema definitions
  content = content.replace(/,\s*{\s*schema:\s*{[^}]*}\s*}/gs, '');
  
  // Remove Fastify addHook calls
  content = content.replace(/\s*fastify\.addHook\([^)]+\);/g, '');
  
  // Replace preHandler with middleware array
  content = content.replace(
    /preHandler:\s*\[([^\]]+)\]/g,
    (match, middlewares) => middlewares.trim()
  );
  
  // Add return router at the end
  if (content.includes('export function create')) {
    content = content.replace(/}\s*$/,  '\n  return router;\n}');
  }
  
  // Write back
  await fs.writeFile(filePath, content, 'utf-8');
  console.log(`  Converted successfully`);
}

async function findRouteFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await findRouteFiles(fullPath));
    } else if (entry.name.endsWith('.routes.ts')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

async function main() {
  console.log('Converting Fastify routes to Express...\n');
  
  const routeFiles = await findRouteFiles(routesDir);
  console.log(`Found ${routeFiles.length} route files\n`);
  
  for (const file of routeFiles) {
    try {
      await convertFile(file);
    } catch (error) {
      console.error(`Error converting ${file}:`, error);
    }
  }
  
  console.log('\nConversion complete!');
}

main().catch(console.error);
