import { useEffect, useRef, useState } from 'react';
import { Tokens } from '../design/tokens';
import { DoubleFrame, InkButton } from './atoms';
import { Photos } from '../api/photos';

const CHUNK_SIZE = 100;
const RESIZE_MAX = 1000;
const SUPPORTED = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];

interface FileMeta {
  filepath: string;
  hash: string;
  datetime: string | null;
  latitude: number | null;
  longitude: number | null;
}

type Stage = 'idle' | 'scanning' | 'confirm' | 'uploading' | 'done' | 'error';

/**
 * Port complet de main/static/main/assets/scripts/upload_images.js :
 *   1. récupère les hash existants côté serveur
 *   2. parcourt les fichiers du dossier sélectionné (webkitdirectory)
 *   3. calcule SHA-256, lit EXIF (date + GPS) et redimensionne à 1000px max
 *   4. compare avec les hashs distants → nouvelles / modifiées / à supprimer
 *   5. confirme côté utilisateur
 *   6. upload par chunks de 100 images, écoute WebSocket /ws/progress
 */
export function UploadDialog({ collectionId, onClose }: {
  collectionId: number;
  onClose: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>('idle');
  const [progress, setProgress] = useState<{ current: number; total: number; label: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<{
    files: File[];
    metadata: FileMeta[];
    toDelete: string[];
    rootCount: number;
    summary: { added: number; changed: number; removed: number };
  } | null>(null);

  useEffect(() => {
    // Ouvre le sélecteur dès l'apparition du dialogue
    setTimeout(() => inputRef.current?.click(), 100);
  }, []);

  async function onFilesPicked(rawList: FileList | null) {
    if (!rawList || rawList.length === 0) { onClose(); return; }
    setStage('scanning');
    setError(null);

    try {
      const remoteKeys = await Photos.hashes().then((r) => r.keys);
      const remoteSet = new Set(remoteKeys);
      const remoteHashSet = new Set(remoteKeys.map((k) => k.split(':').pop()));

      const localKeys: string[] = [];
      const metadata: FileMeta[] = [];
      const resized: File[] = [];
      let rootCount = 0;

      const files = Array.from(rawList);
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProgress({ current: i + 1, total: files.length, label: 'prétraitement' });

        const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
        if (file.name.startsWith('.') || !SUPPORTED.includes(ext)) continue;
        const rel = (file as any).webkitRelativePath as string;
        const parts = rel.normalize('NFC').split('/');
        if (parts.length < 3) { rootCount++; continue; }
        const cleaned = parts.slice(1).join('/');
        const hash = await sha256(file);
        const key = `${cleaned}:${hash}`;
        localKeys.push(key);

        if (!remoteSet.has(key)) {
          const small = await resizeImage(file, RESIZE_MAX);
          const datetime = await readDateTime(file);
          const gps = await readGps(file);
          resized.push(small);
          metadata.push({
            filepath: cleaned, hash, datetime,
            latitude: gps.latitude, longitude: gps.longitude,
          });
        }
      }

      const localSet = new Set(localKeys);
      const toDelete = remoteKeys.filter((k) => !localSet.has(k));
      const addHashes = new Set(metadata.map((m) => m.hash));
      const removed = toDelete.filter((k) => !addHashes.has(k.split(':').pop()!)).length;
      const changed = metadata.filter((m) => remoteHashSet.has(m.hash)).length;
      const added = metadata.length - changed;

      if (resized.length === 0 && toDelete.length === 0) {
        setStage('idle');
        if (rootCount > 0) {
          window.alert(`${rootCount} image${rootCount > 1 ? 's' : ''} à la racine ignorée${rootCount > 1 ? 's' : ''} (sous-dossier requis).`);
        } else {
          window.alert("Aucune image n'a changé.");
        }
        onClose();
        return;
      }

      setPending({ files: resized, metadata, toDelete, rootCount, summary: { added, changed, removed } });
      setStage('confirm');
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? 'Erreur lors du prétraitement');
      setStage('error');
    }
  }

  async function confirmUpload() {
    if (!pending) return;
    setStage('uploading');
    setProgress({ current: 0, total: pending.files.length, label: 'envoi' });

    const uploadId = crypto.randomUUID();
    const wsHost = window.location.host.includes('5173')
      ? 'localhost:8000'
      : window.location.host;
    const wsProto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${wsProto}://${wsHost}/ws/progress`);
    let lastIndex = 0;
    let chunkBase = 0;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.progress === 'Done') {
          if (lastIndex >= pending.files.length) ws.close();
        } else if (typeof data.progress === 'number') {
          lastIndex = chunkBase + data.progress;
          setProgress({ current: lastIndex, total: pending.files.length, label: 'ajout des images' });
        }
      } catch { /* ignore non-JSON */ }
    };
    ws.onclose = () => setStage('done');

    try {
      for (let i = 0; i < pending.files.length; i += CHUNK_SIZE) {
        const chunkFiles = pending.files.slice(i, i + CHUNK_SIZE);
        const chunkMeta = pending.metadata.slice(i, i + CHUNK_SIZE);
        chunkBase = i;
        const form = new FormData();
        chunkFiles.forEach((f) => form.append('images', f));
        form.append('upload_id', uploadId);
        form.append('metadata', JSON.stringify(chunkMeta));
        if (i === 0) form.append('imageToDelete', JSON.stringify(pending.toDelete));
        const resp = await fetch(`/api/upload-images/${collectionId}`, {
          method: 'POST', credentials: 'include', body: form,
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      }
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? "Erreur lors de l'envoi");
      setStage('error');
      try { ws.close(); } catch {}
    }
  }

  function reloadAndClose() {
    window.location.reload();
  }

  return (
    <div onClick={() => stage !== 'uploading' && onClose()} style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(28,18,8,0.7)', backdropFilter: 'blur(2px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40,
    }}>
      <div onClick={(e) => e.stopPropagation()}>
        <DoubleFrame padding={32} style={{ background: Tokens.paperLight, minWidth: 480, maxWidth: 560 }}>
          <h2 style={{
            margin: 0, fontFamily: '"Cormorant Garamond", serif',
            fontSize: 24, fontWeight: 600, marginBottom: 14,
          }}>Importer un dossier</h2>

          <input
            ref={inputRef}
            type="file"
            // @ts-ignore - webkitdirectory n'est pas dans les types standards
            webkitdirectory=""
            directory=""
            multiple
            hidden
            onChange={(e) => onFilesPicked(e.target.files)}
          />

          {stage === 'idle' && (
            <div style={{ fontStyle: 'italic', color: Tokens.inkMuted }}>
              Sélectionnez un dossier d'images organisé en <code>Pays/Région/...</code>.
              <div style={{ marginTop: 14 }}>
                <InkButton onClick={() => inputRef.current?.click()}>Choisir un dossier</InkButton>
              </div>
            </div>
          )}

          {(stage === 'scanning' || stage === 'uploading') && progress && (
            <>
              <p style={{ fontStyle: 'italic', color: Tokens.inkMuted, marginTop: 0 }}>
                {progress.label}… {progress.current}/{progress.total}
              </p>
              <div style={{
                height: 8, background: Tokens.paperDark, border: `1px solid ${Tokens.inkLight}`,
              }}>
                <div style={{
                  width: `${(progress.current / progress.total) * 100}%`,
                  height: '100%', background: Tokens.ink, transition: 'width 200ms',
                }} />
              </div>
              {stage === 'uploading' && (
                <p style={{
                  marginTop: 14, fontSize: 12, color: Tokens.inkMuted, fontStyle: 'italic',
                }}>Ne fermez pas cette fenêtre pendant le traitement.</p>
              )}
            </>
          )}

          {stage === 'confirm' && pending && (
            <>
              <p style={{ color: Tokens.ink, margin: '0 0 10px' }}>
                {confirmMessage(pending.summary, pending.rootCount)}
              </p>
              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <InkButton onClick={confirmUpload}>Confirmer</InkButton>
                <InkButton variant="outline" onClick={onClose}>Annuler</InkButton>
              </div>
            </>
          )}

          {stage === 'done' && (
            <>
              <p style={{ color: Tokens.ink, margin: '0 0 14px' }}>
                Import terminé. Recharger la page pour voir les nouvelles photos&nbsp;?
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <InkButton onClick={reloadAndClose}>Recharger</InkButton>
                <InkButton variant="outline" onClick={onClose}>Plus tard</InkButton>
              </div>
            </>
          )}

          {stage === 'error' && (
            <>
              <p style={{ color: Tokens.oxblood, fontStyle: 'italic' }}>{error}</p>
              <InkButton variant="outline" onClick={onClose}>Fermer</InkButton>
            </>
          )}
        </DoubleFrame>
      </div>
    </div>
  );
}

function confirmMessage(summary: { added: number; changed: number; removed: number }, rootCount: number) {
  const parts: string[] = [];
  if (summary.added > 0) parts.push(`ajouter ${summary.added} nouvelle${summary.added > 1 ? 's' : ''} photo${summary.added > 1 ? 's' : ''}`);
  if (summary.changed > 0) parts.push(`modifier ${summary.changed} photo${summary.changed > 1 ? 's' : ''}`);
  if (summary.removed > 0) parts.push(`supprimer ${summary.removed} photo${summary.removed > 1 ? 's' : ''}`);
  let msg = parts.length === 1
    ? `Voulez-vous ${parts[0]} ?`
    : `Voulez-vous ${parts.slice(0, -1).join(', ')} et ${parts[parts.length - 1]} ?`;
  if (rootCount > 0) {
    msg = `Attention : ${rootCount} image${rootCount > 1 ? 's' : ''} à la racine ignorée${rootCount > 1 ? 's' : ''} (sous-dossier requis).\n\n${msg}`;
  }
  return msg;
}

async function sha256(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const hashBuf = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hashBuf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function resizeImage(file: File, maxSide: number): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = (e) => { img.src = e.target?.result as string; };
    reader.onerror = reject;
    reader.readAsDataURL(file);
    img.onload = () => {
      let { width, height } = img;
      if (width > height && width > maxSide) { height = (maxSide / width) * height; width = maxSide; }
      else if (height > maxSide) { width = (maxSide / height) * width; height = maxSide; }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        if (!blob) return reject(new Error('canvas vide'));
        resolve(new File([blob], file.name, { type: file.type }));
      }, file.type, 0.9);
    };
    img.onerror = reject;
  });
}

/**
 * Lit le tag EXIF DateTimeOriginal en parcourant manuellement le segment APP1
 * du JPEG. Suffisant pour les photos d'appareil. Renvoie une chaîne au format
 * que le backend reconnaît (yyyy:MM:dd HH:mm:ss).
 */
async function readDateTime(file: File): Promise<string | null> {
  try {
    const buf = await file.arrayBuffer();
    const view = new DataView(buf);
    if (view.getUint16(0) !== 0xffd8) return null; // not JPEG
    let offset = 2;
    while (offset < view.byteLength) {
      const marker = view.getUint16(offset); offset += 2;
      if (marker === 0xffe1) { // APP1
        const size = view.getUint16(offset);
        if (view.getUint32(offset + 2) !== 0x45786966) return null; // 'Exif'
        return parseExifDateTime(view, offset + 8, size - 8);
      }
      const size = view.getUint16(offset);
      offset += size;
    }
  } catch (e) {
    return null;
  }
  return null;
}

function parseExifDateTime(view: DataView, tiffStart: number, length: number): string | null {
  const little = view.getUint16(tiffStart) === 0x4949;
  const get16 = (o: number) => little ? view.getUint16(o, true) : view.getUint16(o, false);
  const get32 = (o: number) => little ? view.getUint32(o, true) : view.getUint32(o, false);
  if (get16(tiffStart + 2) !== 0x002a) return null;
  const ifd0 = tiffStart + get32(tiffStart + 4);
  const numEntries = get16(ifd0);
  let exifIfdOffset = 0;
  for (let i = 0; i < numEntries; i++) {
    const e = ifd0 + 2 + i * 12;
    const tag = get16(e);
    if (tag === 0x8769) { exifIfdOffset = tiffStart + get32(e + 8); break; }
  }
  if (!exifIfdOffset) return null;
  const num2 = get16(exifIfdOffset);
  for (let i = 0; i < num2; i++) {
    const e = exifIfdOffset + 2 + i * 12;
    const tag = get16(e);
    if (tag === 0x9003) { // DateTimeOriginal
      const valOffset = tiffStart + get32(e + 8);
      let s = '';
      for (let k = 0; k < 19; k++) s += String.fromCharCode(view.getUint8(valOffset + k));
      return s;
    }
  }
  return null;
}

async function readGps(file: File): Promise<{ latitude: number | null; longitude: number | null }> {
  try {
    const buf = await file.arrayBuffer();
    const view = new DataView(buf);
    if (view.getUint16(0) !== 0xffd8) return { latitude: null, longitude: null };
    let offset = 2;
    while (offset < view.byteLength) {
      const marker = view.getUint16(offset); offset += 2;
      if (marker === 0xffe1) {
        const size = view.getUint16(offset);
        if (view.getUint32(offset + 2) !== 0x45786966) return { latitude: null, longitude: null };
        return parseGps(view, offset + 8) ?? { latitude: null, longitude: null };
      }
      offset += view.getUint16(offset);
    }
  } catch {/* fall through */}
  return { latitude: null, longitude: null };
}

function parseGps(view: DataView, tiffStart: number): { latitude: number; longitude: number } | null {
  const little = view.getUint16(tiffStart) === 0x4949;
  const get16 = (o: number) => view.getUint16(o, little);
  const get32 = (o: number) => view.getUint32(o, little);
  if (get16(tiffStart + 2) !== 0x002a) return null;
  const ifd0 = tiffStart + get32(tiffStart + 4);
  const num = get16(ifd0);
  let gpsIfd = 0;
  for (let i = 0; i < num; i++) {
    const e = ifd0 + 2 + i * 12;
    if (get16(e) === 0x8825) { gpsIfd = tiffStart + get32(e + 8); break; }
  }
  if (!gpsIfd) return null;
  const num2 = get16(gpsIfd);
  let latRef = '', lonRef = '', lat: number[] = [], lon: number[] = [];
  for (let i = 0; i < num2; i++) {
    const e = gpsIfd + 2 + i * 12;
    const tag = get16(e);
    if (tag === 1) latRef = String.fromCharCode(view.getUint8(e + 8));
    else if (tag === 3) lonRef = String.fromCharCode(view.getUint8(e + 8));
    else if (tag === 2) lat = readRational3(view, tiffStart + get32(e + 8), little);
    else if (tag === 4) lon = readRational3(view, tiffStart + get32(e + 8), little);
  }
  if (lat.length !== 3 || lon.length !== 3) return null;
  const toDecimal = (parts: number[], ref: string) => {
    const v = parts[0] + parts[1] / 60 + parts[2] / 3600;
    return (ref === 'S' || ref === 'W') ? -v : v;
  };
  return { latitude: toDecimal(lat, latRef), longitude: toDecimal(lon, lonRef) };
}

function readRational3(view: DataView, offset: number, little: boolean): number[] {
  const out: number[] = [];
  for (let i = 0; i < 3; i++) {
    const n = view.getUint32(offset + i * 8, little);
    const d = view.getUint32(offset + i * 8 + 4, little);
    out.push(d === 0 ? 0 : n / d);
  }
  return out;
}
