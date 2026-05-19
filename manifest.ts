import { open } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import {
  createExtension,
  errorResponse,
  jsonResponse,
} from '@jshookmcp/extension-sdk/plugin';
import type { ToolArgs } from '@jshookmcp/extension-sdk/plugin';

const PLUGIN_ID = 'io.github.vmoranv.android.archive-index';
const PLUGIN_VERSION = '0.0.1';
const TOOL_NAME = 'android_archive_index';
const CHUNK_SIZE = 1024 * 1024;

async function sha256File(filePath: string): Promise<string> {
  const hash = createHash('sha256');
  const handle = await open(filePath, 'r');
  try {
    const buffer = Buffer.allocUnsafe(CHUNK_SIZE);
    while (true) {
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, null);
      if (bytesRead === 0) break;
      hash.update(buffer.subarray(0, bytesRead));
    }
  } finally {
    await handle.close();
  }
  return hash.digest('hex');
}

async function handleArchiveIndex(args: ToolArgs) {
  const apkPath = typeof args.apkPath === 'string' ? args.apkPath.trim() : '';
  if (!apkPath) {
    return errorResponse(TOOL_NAME, new Error('apkPath is required'));
  }

  try {
    const file = await open(apkPath, 'r');
    const stats = await file.stat();
    await file.close();
    const sha256 = await sha256File(apkPath);

    return jsonResponse({
      success: true,
      apkPath,
      sizeBytes: stats.size,
      modifiedAt: stats.mtime.toISOString(),
      sha256,
    });
  } catch (error) {
    return errorResponse(TOOL_NAME, error, { apkPath });
  }
}

export default createExtension(PLUGIN_ID, PLUGIN_VERSION)
  .name('Android Archive Index')
  .description('Compute high-signal APK archive metadata such as file size, mtime, and SHA-256.')
  .author('vmoranv')
  .sourceRepo('https://github.com/vmoranv/jshook_plugin_android_archive_index')
  .compatibleCore('>=0.1.0')
  .profile(['workflow', 'full'])
  .metric('android_archive_index_calls_total')
  .tool(
    TOOL_NAME,
    'Compute APK archive metadata including size, last modification time, and SHA-256 digest.',
    {
      apkPath: {
        type: 'string',
        description: 'Absolute or relative path to the target APK file.',
      },
    },
    handleArchiveIndex,
  );
