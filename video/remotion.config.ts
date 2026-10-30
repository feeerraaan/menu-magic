import { Config } from '@remotion/cli/config';
Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
// No setPublicDir override: __dirname does not resolve to the project root
// under the CLI's TypeScript loader, which silently made every staticFile() 404.
// Remotion's default (<root>/public) is already correct.
Config.setChromiumOpenGlRenderer('swangle');
Config.setConcurrency(1);
