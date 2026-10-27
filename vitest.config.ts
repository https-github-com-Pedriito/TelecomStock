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
      // Plancher anti-regression de lib/ + app/api/, pas un objectif : ces
      // nombres ne doivent que monter a mesure que des routes sont couvertes.
      //
      // Recalibres lors du passage de vitest 3 a vitest 5. Le provider v8
      // compte desormais branches et fonctions differemment : a tests
      // strictement identiques, les branches sont passees de 72,2 % a 39,5 %
      // et les fonctions de 66,2 % a 36 %, tandis que lignes et instructions
      // n'ont pas bouge (42,7 % -> 44,0 % et 42,7 % -> 42,1 %). C'est donc un
      // changement de mesure, pas une perte de couverture : le nombre de
      // tests a augmente sur la meme periode (127 -> 158).
      thresholds: {
        lines: 43,
        statements: 42,
        functions: 35,
        branches: 39,
      },
    },
  },
});
