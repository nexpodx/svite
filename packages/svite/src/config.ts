import path from "node:path";
import fs from 'node:fs'
import { DEFAULT_CONFIG_FILES } from "./constants"
import { isFileESM } from './utils'

const configDefault = {
  base: '/',
  publicDir: 'public',
  plugins: [],
  appType: 'spa',
  dev: {

  }
}


// 合并配置文件
export function resolveConfig(config: Object) {
  loadConfigFromFiles()
}

// 加载本地配置
function loadConfigFromFiles(
  configRoot: string = process.cwd()
) {
  // 获取配置文件
  let resolvePath: string | undefined
  for (const file of DEFAULT_CONFIG_FILES) {
    const filePath = path.resolve(configRoot, file)
    console.log('resolved config file path', resolvePath);
    if (!fs.existsSync(filePath)) continue
    resolvePath = filePath
    break
  }
  console.log('final resolved config file path', resolvePath);
  if (!resolvePath) {
    throw new Error('No svite config file found')
  }

  const resolver = isFileESM(resolvePath) ? ESMFileResolver(resolvePath) : null

  if (!resolver) {
    throw new Error('Only ESM config files are supported for now')
  }



}

function ESMFileResolver(filePath: string) {

}
