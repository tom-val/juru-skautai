// Bundles each Lambda entrypoint into a single self-contained dist/<fn>/index.mjs.
// Targets the Node 24 runtime; everything (incl. aws-jwt-verify and the AWS SDK) is
// bundled so the deployment zips need no node_modules.
import { build } from "esbuild";
import { rm } from "node:fs/promises";

const fns = ["api", "authorizer"];

await rm("dist", { recursive: true, force: true });

await Promise.all(
  fns.map((fn) =>
    build({
      entryPoints: [`src/${fn}.ts`],
      outfile: `dist/${fn}/index.mjs`,
      bundle: true,
      platform: "node",
      target: "node24",
      format: "esm",
      minify: true,
      sourcemap: false,
      // esbuild emits `import { createRequire }` shims for some CJS deps under ESM.
      banner: {
        js: "import { createRequire as __cr } from 'module'; const require = __cr(import.meta.url);",
      },
    }),
  ),
);

console.log(`Built ${fns.length} Lambda bundles: ${fns.join(", ")}`);
