import { copyFile, mkdir } from "node:fs/promises";

const publishDirectory = new URL("../dist/", import.meta.url);
const invitation = new URL("../jewel-mae-eighteen.html", import.meta.url);

await mkdir(publishDirectory, { recursive: true });
await copyFile(invitation, new URL("index.html", publishDirectory));
await copyFile(invitation, new URL("jewel-mae-eighteen.html", publishDirectory));
