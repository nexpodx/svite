import { createServer } from "node:http";
import connect from "connect";
import { htmlHandler } from "../middlewares/htmlHandler";
import { resolve } from "node:path";
import { readFileSync } from "node:fs";
import { resolveConfig } from "../config";

export function createDevServer(inlineCconfig: Object) {
  const config = resolveConfig(inlineCconfig);

  const app = connect();

  let server = createServer(app);

  app.use((req, res, next) => {
    if (req.url?.endsWith(".js")) {
      res.writeHead(200, { "Content-Type": "application/javascript" });
      // 构建文件路径并读取文件内容
      const filePath = resolve(process.cwd(), req.url.substring(1)); // 去掉开头的 '/'
      try {
        const fileContent = readFileSync(filePath, "utf-8");
        res.end(fileContent);
      } catch (error) {
        next(); // 如果文件不存在，继续下一个中间件
      }
    } else {
      next();
    }
  });

  app.use(htmlHandler);

  server.listen(3000, () => {
    console.log("Dev server running on http://localhost:3000");
  });

  console.log("server created", config);
}
