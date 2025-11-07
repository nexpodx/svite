export function isFileESM(filePath: string) {
  if (/\.m[jt]s$/.test(filePath)) {
    return true
  } else if(/\.c[jt]s$/.test(filePath)) {
    return false
  }
}