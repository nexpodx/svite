import cac from 'cac';
import { readFileSync } from 'node:fs'

const { version: VERSION } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)).toString());

console.log('starting2...');

const cli = cac('svite');

// 全局配置
cli
  .option('-m, --mode <mode>', '["development" | "production"] set env mode')

// dev 配置
cli
  .command('[root]', 'Start svite dev')
  .alias('dev')
  .option('--port [port]', '[number] Port to run dev server on')
  .action(async (root: string, option) => {
    console.log('dev', root, option);
    const { createDevServer } = await import('./server')
    createDevServer({ root, ...option })
  })

cli.help()
cli.version(VERSION)
cli.parse();