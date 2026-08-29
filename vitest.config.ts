import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import swc from 'unplugin-swc';

export default defineConfig({
  plugins: [
    tsconfigPaths(),
    // TypeORM entities rely on emitDecoratorMetadata, which esbuild (Vitest's
    // default transform) does not support. SWC does, so we use it instead.
    swc.vite({
      jsc: {
        parser: { syntax: 'typescript', decorators: true },
        transform: { legacyDecorator: true, decoratorMetadata: true },
        target: 'es2022',
      },
    }),
  ],
  test: {
    environment: 'node',
    globals: true,
    include: ['**/*.test.ts'],
    exclude: ['node_modules/**', '.next/**'],
    setupFiles: ['./test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      // Only lib/ and app/api/ have tests today (backend logic). Measuring
      // coverage over the whole repo (including untested UI components)
      // would make the number meaningless. Widen this as UI/e2e tests are added.
      include: ['lib/**/*.ts', 'app/api/**/*.ts'],
      exclude: ['**/*.test.ts', 'lib/db.ts'],
      // Current real coverage of lib/ + app/api/ (many routes still untested).
      // Thresholds are set as a regression floor, not an aspirational target:
      // this should only ever go up as more routes/lib functions get tests.
      thresholds: {
        lines: 28,
        statements: 28,
        functions: 44,
        branches: 60,
      },
    },
  },
});
