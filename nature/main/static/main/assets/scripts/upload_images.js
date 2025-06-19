// ==== UTILITAIRES EXIF ====

function getTimestamp(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const tags = ExifReader.load(e.target.result);
                resolve(tags.DateTimeOriginal?.description || null);
            } catch (error) {
                console.error("Erreur lors de la lecture des métadonnées EXIF :", error);
                resolve(null);
            }
        };

        reader.onerror = (error) => reject(error);

        reader.readAsArrayBuffer(file);
    });
}

function getCoordinates(file) {
    return new Promise((resolve) => {
        EXIF.getData(file, function () {
            const lat = EXIF.getTag(this, 'GPSLatitude');
            const lon = EXIF.getTag(this, 'GPSLongitude');

            if (lat && lon) {
                const latitude = convertToDecimal(lat, EXIF.getTag(this, 'GPSLatitudeRef'));
                const longitude = convertToDecimal(lon, EXIF.getTag(this, 'GPSLongitudeRef'));
                resolve({ latitude, longitude });
            } else {
                resolve({ latitude: null, longitude: null });
            }
        });
    });
}

function convertToDecimal([deg, min, sec], ref) {
    const decimal = deg + min / 60 + sec / 3600;
    return ['S', 'W'].includes(ref) ? -decimal : decimal;
}

// ==== AUTRES UTILITAIRES ====

function normaliserUnicode(text) {
    return text.normalize("NFC");
}

async function getFormDataSize(formData) {
    const entries = Array.from(formData.entries());
    const boundary = "----WebKitFormBoundary" + Math.random().toString(16);
    let body = "";

    for (const [key, value] of entries) {
        body += `--${boundary}\r\n`;

        if (value instanceof File) {
            const fileContent = await value.arrayBuffer().then(buf => new Uint8Array(buf));
            body += `Content-Disposition: form-data; name="${key}"; filename="${value.name}"\r\n`;
            body += `Content-Type: ${value.type || "application/octet-stream"}\r\n\r\n`;
            body += new TextDecoder().decode(fileContent);
        } else {
            body += `Content-Disposition: form-data; name="${key}"\r\n\r\n${value}`;
        }

        body += "\r\n";
    }

    body += `--${boundary}--\r\n`;

    return new Blob([body]).size;
}

function getImageToDelete(remoteKeys, localKeys) {
    return remoteKeys.filter(key => !localKeys.includes(key));
}

function getCsrfToken() {
    const cookie = document.cookie.split(';').find(c => c.trim().startsWith('csrftoken='));
    return cookie?.split('=')[1] || null;
}

function getWsRequest() {
    return window.location.hostname === "especes.julsql.fr"
        ? "wss://especes.julsql.fr"
        : "ws://localhost:8000";
}

// ==== INTERACTIONS AVEC LE SERVEUR ====

async function getKeys() {
    const res = await fetch(`/hash/${currentCollectionId}/`);
    if (!res.ok) {
        alert("Erreur lors de la récupération des clés.");
        return [];
    }

    const data = await res.json();
    return Array.isArray(data.keys) ? data.keys : [];
}

async function cleanDatabase() {
    const res = await fetch(`/clean/${currentCollectionId}/`);
    if (!res.ok) alert("Erreur lors du nettoyage de la base de données.");
}

async function calculateHash(file) {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

async function resizeImage(file, maxWidth, maxHeight) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const reader = new FileReader();

        reader.onload = (e) => { img.src = e.target.result; };
        reader.readAsDataURL(file);

        img.onload = () => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");

            let { width, height } = img;

            if (width > height && width > maxWidth) {
                height = (maxWidth / width) * height;
                width = maxWidth;
            } else if (height > maxHeight) {
                width = (maxHeight / height) * width;
                height = maxHeight;
            }

            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob(blob => {
                resolve(new File([blob], file.name, { type: file.type }));
            }, file.type, 0.9);
        };

        img.onerror = reject;
    });
}

// ==== ÉVÈNEMENT PRINCIPAL ====

const folderInput = document.getElementById("folderInput");

folderInput.addEventListener("click", () => {
    folderInput.value = "";
});

folderInput.addEventListener("change", async (event) => {
    const files = event.target.files;
    const info = document.getElementById("upload-info");
    const infoContainer = document.getElementById("upload-info-container");
    const loading = document.getElementById("loading");
    const progressBar = document.getElementById("progress-bar");
    const progressBarContainer = document.getElementById("progress-bar-container");

    loading.style.display = "block";
    infoContainer.style.display = "flex";
    info.style.display = "none";
    progressBarContainer.style.display = "none";

    await cleanDatabase();
    const remoteKeys = await getKeys();

    const formData = new FormData();
    const localKeys = [];
    const metadata = [];
    const species = new Set();
    let hasFilesToUpload = false;

    const MAX_UPLOAD_IMAGES = 100;
    const MAX_DATA_SIZE_UPLOAD = 209715200;

    for (const file of files) {
        try {
            if (metadata.length >= MAX_UPLOAD_IMAGES) break;

            const ext = file.name.split('.').pop().toLowerCase();
            if (file.name[0] === "." || !["jpg", "jpeg", "png", "gif", "bmp", "webp"].includes(ext)) continue;

            const pathParts = normaliserUnicode(file.webkitRelativePath).split('/');
            const cleanedPath = pathParts.slice(1).join('/');
            const hash = await calculateHash(file);
            const key = `${cleanedPath}:${hash}`;
            localKeys.push(key);

            if (!remoteKeys.includes(key)) {
                species.add(pathParts.at(-1));
                const resized = await resizeImage(file, 1000, 1000);
                formData.append('images', resized);
                metadata.push({
                    filepath: cleanedPath,
                    hash: hash,
                    datetime: await getTimestamp(file),
                    ...await getCoordinates(file),
                });
                hasFilesToUpload = true;
            }
        } catch (e) {
            console.error(e);
            alert(`Problème avec l'image : ${file.webkitRelativePath}`);
        }
    }

    formData.append("metadata", JSON.stringify(metadata));
    const imageToDelete = getImageToDelete(remoteKeys, localKeys);
    formData.append("imageToDelete", JSON.stringify(imageToDelete));

    const size = await getFormDataSize(formData);

    if (size > MAX_DATA_SIZE_UPLOAD) {
        info.textContent = "Quantité de données trop lourde";
        loading.style.display = "none";
        return;
    }

    if (imageToDelete.length === 0 && !hasFilesToUpload) {
        info.textContent = "Aucune image n'a changé";
        info.style.display = "block";
        info.style.width = "200px";
        loading.style.display = "none";
        return;
    }

    const confirmMessage = `Envoyer ${metadata.length} ${metadata.length > 1 ? 'photos' : 'photo'} et supprimer ${imageToDelete.length} ${imageToDelete.length > 1 ? 'photos' : 'photo'} ?${metadata.length >= MAX_UPLOAD_IMAGES ? ` (Maximum ${MAX_UPLOAD_IMAGES})` : ''}`;
    if (!window.confirm(confirmMessage)) {
        loading.style.display = "none";
        return;
    }

    const socket = new WebSocket(`${getWsRequest()}/ws/progress/`);
    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.progress === "Done") {
            socket.close();
        } else if (Number.isInteger(Number(data.progress))) {
            loading.style.display = "none";
            info.style.display = "block";
            info.style.width = "50px";
            progressBarContainer.style.display = "block";
            info.textContent = `${data.progress}/${species.size}`;
            progressBar.style.width = `${(parseInt(data.progress) / species.size) * 100}%`;
        }
    };

    socket.onerror = () => {
        info.textContent = "Erreur lors du traitement des images";
        progressBar.style.width = '0';
        progressBarContainer.style.display = "none";
        info.style.width = "auto";
    };

    socket.onclose = () => {
        info.textContent = "Images ajoutées";
        progressBar.style.width = '0';
        progressBarContainer.style.display = "none";
        info.style.width = "auto";
    };

    const csrfToken = getCsrfToken();
    const headers = new Headers();
    if (csrfToken) headers.append("X-CSRFToken", csrfToken);

    const response = await fetch(`/upload-images/${currentCollectionId}/`, {
        method: "POST",
        headers,
        body: formData,
    });

    if (!response.ok) {
        loading.style.display = "none";
        info.textContent = response.status === 413
            ? "Quantité de données trop lourde"
            : "Erreur lors de l'envoi des images";
    }

    loading.style.display = "none";
});
