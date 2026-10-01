import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Asset } from '../src/domain';
import type { LocalDatabase } from './database';

const formats = {
  'image/png': { ext: 'png', signature: (bytes: Buffer) => bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) },
  'image/jpeg': { ext: 'jpg', signature: (bytes: Buffer) => bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 },
  'image/webp': { ext: 'webp', signature: (bytes: Buffer) => bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP' },
  'image/gif': { ext: 'gif', signature: (bytes: Buffer) => ['GIF87a', 'GIF89a'].includes(bytes.toString('ascii', 0, 6)) },
} as const;

export class AssetStore {
  constructor(private readonly directory: string, private readonly database: LocalDatabase) {}

  async import(name: string, mimeType: string, base64: string): Promise<Asset> {
    const format = formats[mimeType as keyof typeof formats];
    if (!format) throw new Error('Choose a PNG, JPEG, WebP, or GIF image.');
    if (base64.length > 28_000_000) throw new Error('Images must be 20 MB or smaller.');
    const bytes = Buffer.from(base64, 'base64');
    if (bytes.length === 0 || bytes.length > 20_000_000 || !format.signature(bytes)) throw new Error('This image could not be read.');
    const asset: Asset = { id: randomUUID(), name: name.slice(0, 256), mimeType, createdAt: new Date().toISOString() };
    await mkdir(this.directory, { recursive: true });
    await writeFile(join(this.directory, `${asset.id}.${format.ext}`), bytes, { flag: 'wx' });
    await this.database.saveAsset(asset);
    return asset;
  }

  async read(id: string): Promise<string> {
    const asset = await this.database.getAsset(id);
    if (!asset) throw new Error('Image not found.');
    const format = formats[asset.mimeType as keyof typeof formats];
    if (!format) throw new Error('Unsupported image format.');
    const bytes = await readFile(join(this.directory, `${asset.id}.${format.ext}`));
    return `data:${asset.mimeType};base64,${bytes.toString('base64')}`;
  }
}
