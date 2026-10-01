import { useEffect, useRef, useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import type { Asset } from '../domain';

const accepted = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function AssetPicker({ label, onAttach }: { label: string; onAttach: (asset: Asset) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function choose(candidate?: File | null) {
    if (!candidate) return;
    if (!accepted.includes(candidate.type)) { setError('Choose a PNG, JPEG, WebP, or GIF image.'); return; }
    if (candidate.size > 20_000_000) { setError('Images must be 20 MB or smaller.'); return; }
    setError('');
    setFile(candidate);
  }

  async function attach() {
    if (!file) return;
    setBusy(true);
    try {
      const asset = await window.lidnd.importAsset(file.name, file.type, await fileToBase64(file));
      onAttach(asset);
      setFile(null);
      if (input.current) input.current.value = '';
    } catch (reason) { setError(String(reason)); }
    finally { setBusy(false); }
  }

  return <div className="rounded-lg border border-dashed border-border p-3" tabIndex={0}
    onDragOver={event => event.preventDefault()}
    onDrop={event => { event.preventDefault(); choose(event.dataTransfer.files[0]); }}
    onPaste={event => choose(event.clipboardData.files[0])}>
    <p className="mb-2 text-sm text-muted-foreground">{label}: choose, drop, or paste an image.</p>
    <Input ref={input} className="sr-only" type="file" accept="image/png,image/jpeg,image/webp,image/gif" aria-label={`Choose ${label}`} onChange={event => choose(event.target.files?.[0])}/>
    <Button type="button" onClick={() => input.current?.click()}>Choose image</Button>
    {preview && <div className="mt-3 space-y-2"><img className="max-h-64 max-w-full rounded-md border border-border object-contain" src={preview} alt={`Preview of ${file?.name ?? 'image'}`}/><p className="text-xs text-muted-foreground">{file?.name}</p><div className="flex gap-2"><Button type="button" disabled={busy} onClick={() => void attach()}>Attach image</Button><Button type="button" variant="ghost" onClick={() => setFile(null)}>Cancel</Button></div></div>}
    {error && <p className="mt-2 text-sm text-destructive" role="alert">{error}</p>}
  </div>;
}

export function AssetImage({ id, alt, className = '' }: { id: string; alt: string; className?: string }) {
  const [source, setSource] = useState<string | null>(null);
  useEffect(() => { let alive = true; void window.lidnd.readAsset(id).then(value => { if (alive) setSource(value); }); return () => { alive = false; }; }, [id]);
  return source ? <img className={className} src={source} alt={alt}/> : <div className="rounded-lg border border-border p-3 text-sm text-muted-foreground">Loading image…</div>;
}
