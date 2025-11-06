import typescript from "@rollup/plugin-typescript"

export default {
  input: {
    'cli': 'src/cli.ts',
  },
  output: {
    dir: './dist',
    entryFileNames: '[name].js',
    format: 'esm',
    sourcemap: true
  },
  plugins: [
    typescript({
      tsconfig: './tsconfig.json',
      sourceMap: true,
      declaration: true,
      declarationDir: './dist/types',
    })
  ]
}