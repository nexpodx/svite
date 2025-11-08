import path from "node:path";
import fs from "node:fs";
import fsp from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { DEFAULT_CONFIG_FILES } from "./constants";
import { isFileESM } from "./utils";
import { findNearestNodeModules } from "./packages";
import { build } from "esbuild";

export interface ConfigEnv {
  command: "serve" | "build";
  mode: string;
}

export interface UserConfig {
  /**
   * 根目录
   * @default process.cwd()
   */
  root?: string;
  /*
   * 基础路径
   * @default '/'
   */
  base?: string;
  /**
   * 静态资源目录
   * @default 'public'
   */
  publicDir?: string;
  /**
   * 运行模式
   * @default 'development'
   */
  mode?: string;
  /**
   * 应用类型
   * @default 'spa'
   */
  appType?: "spa" | "mpa";
}

export type UserConfigFn = (env: ConfigEnv) => UserConfig | Promise<UserConfig>;

export type UserConfigExport = UserConfig | Promise<UserConfig> | UserConfigFn;

const configDefault = {
  base: "/",
  publicDir: "public",
  plugins: [],
  appType: "spa",
  dev: {},
};

export function defineConfig(config: UserConfigExport): UserConfigExport {
  return config;
}

// 合并配置文件
export function resolveConfig(config: Object) {
  loadConfigFromFiles();
}

// 加载本地配置
async function loadConfigFromFiles(configRoot: string = process.cwd()) {
  // 获取配置文件
  let resolvePath: string | undefined;
  for (const file of DEFAULT_CONFIG_FILES) {
    const filePath = path.resolve(configRoot, file);
    console.log("resolved config file path", resolvePath);
    if (!fs.existsSync(filePath)) continue;
    resolvePath = filePath;
    break;
  }
  console.log("final resolved config file path", resolvePath);
  if (!resolvePath) {
    throw new Error("No svite config file found");
  }

  // 加载用户配置
  const userConfigExport = (await loadConfigFile(resolvePath)).default;

  const userConfig =
    typeof userConfigExport === "function"
      ? await userConfigExport({ command: "serve", mode: "development" })
      : userConfigExport;

  console.log("resolved config", userConfig);
}

async function loadConfigFile(fileName: string) {
  let nodeModuleDir = findNearestNodeModules(path.dirname(fileName));

  // 创建临时目录
  if (nodeModuleDir) {
    try {
      await fsp.mkdir(path.resolve(nodeModuleDir, ".svite-temp/"), {
        recursive: true,
      });
    } catch (error) {
      nodeModuleDir = null;
      throw error;
    }
  }

  // 创建临时文件，用于node加载，因为node的ES模块系统要求通过有效的url加载，不能直接执行字符串代码
  const hash = `timestamp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const ext = isFileESM(fileName) ? ".mjs" : ".cjs";
  const tempFileName = nodeModuleDir
    ? path.resolve(
        nodeModuleDir,
        `.svite-temp/${path.basename(fileName)}.${hash}${ext}`
      )
    : `${fileName}.${hash}${ext}`;

  console.log("resolved config file", tempFileName);

  const bundleCode = await bundleConfigFile(fileName, isFileESM(fileName));

  await fsp.writeFile(tempFileName, bundleCode);

  try {
    return (await import(pathToFileURL(tempFileName).href)).default;
  } finally {
    // 删除临时文件
    fs.unlink(tempFileName, () => {});
  }
}

function isNodeBuiltin(id: string) {
  return id.startsWith("node:");
}

async function bundleConfigFile(fileName: string, isESM: boolean) {
  const dirnameVarName = "__svite_injected_original_dirname";
  const filenameVarName = "__svite_injected_original_filename";
  const importMetaUrlVarName = "__svite_injected_original_import_meta_url";

  const result = await build({
    entryPoints: [fileName],
    target: `node${process.versions.node}`,
    format: isESM ? "esm" : "cjs",
    platform: "node",
    bundle: true,
    write: false,
    define: {
      __dirname: dirnameVarName,
      __filename: filenameVarName,
      "import.meta.url": importMetaUrlVarName,
      "import.meta.dirname": dirnameVarName,
      "import.meta.filename": filenameVarName,
    },
    plugins: [
      {
        name: "extenralize-deps",
        setup(build) {
          // 处理 node_modules 依赖， 避免打包进bundle
          build.onResolve({ filter: /^[^.#].*/ }, ({ path: id, kind }) => {
            if (
              kind === "entry-point" || // 入口文件，esbuild 的起点文件，必须打包
              path.isAbsolute(id) || // 绝对路径（/src/index.js）
              isNodeBuiltin(id) // Node.js 内置模块（node:fs, node:path）
            ) {
              return;
            }
            return { external: true };
          });
        },
      },
      {
        name: "inject-original-file-path",
        setup(build) {
          build.onLoad(
            { filter: /\.[cm]?[jt]s$/ },
            async ({ path: fileName }) => {
              const content = await fsp.readFile(fileName, "utf-8");
              const injectValues =
                `const ${dirnameVarName} = ${JSON.stringify(
                  path.dirname(fileName)
                )};` +
                `const ${filenameVarName} = ${JSON.stringify(fileName)};` +
                `const ${importMetaUrlVarName} = ${JSON.stringify(
                  pathToFileURL(fileName).href
                )};`;
              return {
                loader: fileName.endsWith(".ts") ? "ts" : "js",
                contents: injectValues + content,
              };
            }
          );
        },
      },
    ],
  });
  const { text } = result.outputFiles[0];
  return text;
}
