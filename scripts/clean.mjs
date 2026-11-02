import { rmSync } from "node:fs";

rmSync(new URL("../_site/", import.meta.url), { recursive: true, force: true });
