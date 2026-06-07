import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Photos } from '../api/photos';
const CHUNK_SIZE = 100;
const RESIZE_MAX = 1000;
const SUPPORTED = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
const Ctx = createContext(null);
export function BackgroundUploadProvider({ children }) {
    const [state, setState] = useState({
        stage: 'idle', current: 0, total: 0, label: '', collectionId: null,
    });
    const [dataVersion, setDataVersion] = useState(0);
    const pendingRef = useRef(null);
    const collectionIdRef = useRef(null);
    const inputRef = useRef(null);
    const pickFolder = useCallback((collectionId) => {
        if (!inputRef.current) {
            console.warn('Upload input pas encore monté');
            return;
        }
        // Reset la valeur pour pouvoir resélectionner le même dossier.
        inputRef.current.value = '';
        collectionIdRef.current = collectionId;
        inputRef.current.click();
    }, []);
    function onFileInputChange(ev) {
        const files = ev.target.files;
        const collectionId = collectionIdRef.current;
        if (!files || files.length === 0 || collectionId == null)
            return;
        scan(collectionId, files);
    }
    async function scan(collectionId, rawList) {
        setState({
            stage: 'scanning', current: 0, total: rawList.length,
            label: 'analyse du dossier', collectionId,
        });
        try {
            const remoteKeys = await Photos.hashes().then((r) => r.keys);
            const remoteSet = new Set(remoteKeys);
            const remoteHashSet = new Set(remoteKeys.map((k) => k.split(':').pop()));
            const localKeys = [];
            const metadata = [];
            const resized = [];
            let rootCount = 0;
            const files = Array.from(rawList);
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                setState((s) => ({ ...s, current: i + 1, total: files.length, label: 'prétraitement' }));
                const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
                if (file.name.startsWith('.') || !SUPPORTED.includes(ext))
                    continue;
                const rel = file.webkitRelativePath;
                const parts = rel.normalize('NFC').split('/');
                if (parts.length < 3) {
                    rootCount++;
                    continue;
                }
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
            const removed = toDelete.filter((k) => !addHashes.has(k.split(':').pop())).length;
            const changed = metadata.filter((m) => remoteHashSet.has(m.hash)).length;
            const added = metadata.length - changed;
            if (resized.length === 0 && toDelete.length === 0) {
                const msg = rootCount > 0
                    ? `${rootCount} image${rootCount > 1 ? 's' : ''} à la racine ignorée${rootCount > 1 ? 's' : ''} (sous-dossier requis).`
                    : "Aucune image n'a changé.";
                window.alert(msg);
                setState({ stage: 'idle', current: 0, total: 0, label: '', collectionId: null });
                return;
            }
            const pending = { files: resized, metadata, toDelete, rootCount, summary: { added, changed, removed } };
            pendingRef.current = pending;
            collectionIdRef.current = collectionId;
            setState({
                stage: 'confirm', current: 0, total: 0, label: '',
                collectionId, pending,
            });
        }
        catch (e) {
            setState({
                stage: 'error', current: 0, total: 0,
                label: '', collectionId, error: e?.message ?? 'Erreur',
            });
        }
    }
    const confirm = useCallback(async () => {
        const pending = pendingRef.current;
        const collectionId = collectionIdRef.current;
        if (!pending || collectionId == null)
            return;
        setState({
            stage: 'uploading', current: 0, total: pending.files.length,
            label: 'envoi', collectionId, pending,
        });
        doUpload(pending, collectionId);
    }, []);
    async function doUpload(pending, collectionId) {
        const { files, metadata, toDelete } = pending;
        const uploadId = crypto.randomUUID();
        const wsHost = window.location.host.includes('5173')
            ? 'localhost:8000'
            : window.location.host;
        const wsProto = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const ws = new WebSocket(`${wsProto}://${wsHost}/ws/progress`);
        let chunkBase = 0;
        let lastIndex = 0;
        let finished = false;
        function markDone(failed, errorMsg) {
            if (finished)
                return;
            finished = true;
            try {
                ws.close();
            }
            catch { /* ignore */ }
            if (failed) {
                setState((s) => ({ ...s, stage: 'error', error: errorMsg ?? "Erreur lors de l'envoi" }));
            }
            else {
                setState({
                    stage: 'done', current: lastIndex || files.length, total: files.length,
                    label: 'terminé', collectionId,
                });
                setDataVersion((v) => v + 1);
                setTimeout(() => {
                    setState((s) => s.stage === 'done'
                        ? { stage: 'idle', current: 0, total: 0, label: '', collectionId: null }
                        : s);
                }, 5_000);
            }
        }
        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (typeof data.progress === 'number') {
                    lastIndex = chunkBase + data.progress;
                    setState((s) => ({ ...s, current: lastIndex, label: 'ajout des images' }));
                }
                // On ignore "Done" : c'est le frontend (boucle for ci-dessous) qui sait
                // quand tous les chunks sont envoyés ; chaque POST renvoie "Done" mais
                // ce n'est pas le signal de fin global.
            }
            catch { /* non-JSON, ignore */ }
        };
        try {
            for (let i = 0; i < files.length; i += CHUNK_SIZE) {
                const chunkFiles = files.slice(i, i + CHUNK_SIZE);
                const chunkMeta = metadata.slice(i, i + CHUNK_SIZE);
                chunkBase = i;
                const form = new FormData();
                chunkFiles.forEach((f) => form.append('images', f));
                form.append('upload_id', uploadId);
                form.append('metadata', JSON.stringify(chunkMeta));
                if (i === 0)
                    form.append('imageToDelete', JSON.stringify(toDelete));
                const resp = await fetch(`/api/upload-images/${collectionId}`, {
                    method: 'POST', credentials: 'include', body: form,
                });
                if (!resp.ok) {
                    let msg = `HTTP ${resp.status}`;
                    try {
                        const body = await resp.json();
                        if (body?.error)
                            msg = body.message ? `${body.error} — ${body.message}` : body.error;
                        else if (body?.message)
                            msg = body.message;
                    }
                    catch { /* pas de JSON, garde HTTP code */ }
                    throw new Error(msg);
                }
            }
            markDone(false);
        }
        catch (e) {
            console.error('Upload échoué', e);
            markDone(true, e?.message ?? "Erreur lors de l'envoi");
        }
    }
    const cancel = useCallback(() => {
        pendingRef.current = null;
        collectionIdRef.current = null;
        setState({ stage: 'idle', current: 0, total: 0, label: '', collectionId: null });
    }, []);
    const reset = useCallback(() => {
        pendingRef.current = null;
        collectionIdRef.current = null;
        setState({ stage: 'idle', current: 0, total: 0, label: '', collectionId: null });
    }, []);
    return (_jsxs(Ctx.Provider, { value: { state, pickFolder, confirm, cancel, reset, dataVersion }, children: [_jsx("input", { ref: inputRef, type: "file", multiple: true, hidden: true, 
                // @ts-expect-error - webkitdirectory n'est pas dans les types standards
                webkitdirectory: "", directory: "", onChange: onFileInputChange }), children] }));
}
export function useBackgroundUpload() {
    const ctx = useContext(Ctx);
    if (!ctx)
        throw new Error('useBackgroundUpload doit être utilisé sous BackgroundUploadProvider');
    return ctx;
}
// ────────────────────────────────────────────────────────────────
// Helpers EXIF / hash / resize (identiques au composant précédent)
// ────────────────────────────────────────────────────────────────
async function sha256(file) {
    const buf = await file.arrayBuffer();
    const hashBuf = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(hashBuf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
async function resizeImage(file, maxSide) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const reader = new FileReader();
        reader.onload = (e) => { img.src = e.target?.result; };
        reader.onerror = reject;
        reader.readAsDataURL(file);
        img.onload = () => {
            let { width, height } = img;
            if (width > height && width > maxSide) {
                height = (maxSide / width) * height;
                width = maxSide;
            }
            else if (height > maxSide) {
                width = (maxSide / height) * width;
                height = maxSide;
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            canvas.getContext('2d').drawImage(img, 0, 0, width, height);
            canvas.toBlob((blob) => {
                if (!blob)
                    return reject(new Error('canvas vide'));
                resolve(new File([blob], file.name, { type: file.type }));
            }, file.type, 0.9);
        };
        img.onerror = reject;
    });
}
async function readDateTime(file) {
    try {
        const buf = await file.arrayBuffer();
        const view = new DataView(buf);
        if (view.getUint16(0) !== 0xffd8)
            return null;
        let offset = 2;
        while (offset < view.byteLength) {
            const marker = view.getUint16(offset);
            offset += 2;
            if (marker === 0xffe1) {
                const size = view.getUint16(offset);
                if (view.getUint32(offset + 2) !== 0x45786966)
                    return null;
                return parseExifDateTime(view, offset + 8, size - 8);
            }
            offset += view.getUint16(offset);
        }
    }
    catch {
        return null;
    }
    return null;
}
function parseExifDateTime(view, tiffStart, _length) {
    const little = view.getUint16(tiffStart) === 0x4949;
    const get16 = (o) => view.getUint16(o, little);
    const get32 = (o) => view.getUint32(o, little);
    if (get16(tiffStart + 2) !== 0x002a)
        return null;
    const ifd0 = tiffStart + get32(tiffStart + 4);
    const numEntries = get16(ifd0);
    let exifIfdOffset = 0;
    for (let i = 0; i < numEntries; i++) {
        const e = ifd0 + 2 + i * 12;
        if (get16(e) === 0x8769) {
            exifIfdOffset = tiffStart + get32(e + 8);
            break;
        }
    }
    if (!exifIfdOffset)
        return null;
    const num2 = get16(exifIfdOffset);
    for (let i = 0; i < num2; i++) {
        const e = exifIfdOffset + 2 + i * 12;
        if (get16(e) === 0x9003) {
            const valOffset = tiffStart + get32(e + 8);
            let s = '';
            for (let k = 0; k < 19; k++)
                s += String.fromCharCode(view.getUint8(valOffset + k));
            return s;
        }
    }
    return null;
}
async function readGps(file) {
    try {
        const buf = await file.arrayBuffer();
        const view = new DataView(buf);
        if (view.getUint16(0) !== 0xffd8)
            return { latitude: null, longitude: null };
        let offset = 2;
        while (offset < view.byteLength) {
            const marker = view.getUint16(offset);
            offset += 2;
            if (marker === 0xffe1) {
                if (view.getUint32(offset + 2) !== 0x45786966)
                    return { latitude: null, longitude: null };
                return parseGps(view, offset + 8) ?? { latitude: null, longitude: null };
            }
            offset += view.getUint16(offset);
        }
    }
    catch { /* fall through */ }
    return { latitude: null, longitude: null };
}
function parseGps(view, tiffStart) {
    const little = view.getUint16(tiffStart) === 0x4949;
    const get16 = (o) => view.getUint16(o, little);
    const get32 = (o) => view.getUint32(o, little);
    if (get16(tiffStart + 2) !== 0x002a)
        return null;
    const ifd0 = tiffStart + get32(tiffStart + 4);
    const num = get16(ifd0);
    let gpsIfd = 0;
    for (let i = 0; i < num; i++) {
        const e = ifd0 + 2 + i * 12;
        if (get16(e) === 0x8825) {
            gpsIfd = tiffStart + get32(e + 8);
            break;
        }
    }
    if (!gpsIfd)
        return null;
    const num2 = get16(gpsIfd);
    let latRef = '', lonRef = '', lat = [], lon = [];
    for (let i = 0; i < num2; i++) {
        const e = gpsIfd + 2 + i * 12;
        const tag = get16(e);
        if (tag === 1)
            latRef = String.fromCharCode(view.getUint8(e + 8));
        else if (tag === 3)
            lonRef = String.fromCharCode(view.getUint8(e + 8));
        else if (tag === 2)
            lat = readRational3(view, tiffStart + get32(e + 8), little);
        else if (tag === 4)
            lon = readRational3(view, tiffStart + get32(e + 8), little);
    }
    if (lat.length !== 3 || lon.length !== 3)
        return null;
    const toDecimal = (parts, ref) => {
        const v = parts[0] + parts[1] / 60 + parts[2] / 3600;
        return (ref === 'S' || ref === 'W') ? -v : v;
    };
    return { latitude: toDecimal(lat, latRef), longitude: toDecimal(lon, lonRef) };
}
function readRational3(view, offset, little) {
    const out = [];
    for (let i = 0; i < 3; i++) {
        const n = view.getUint32(offset + i * 8, little);
        const d = view.getUint32(offset + i * 8 + 4, little);
        out.push(d === 0 ? 0 : n / d);
    }
    return out;
}
