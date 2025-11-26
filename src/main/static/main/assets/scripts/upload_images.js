// ==== UTILITAIRES EXIF ====

function getTimestamp(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const tags = ExifReader.load(e.target.result);

                // On teste plusieurs tags
                const date =
                    tags.DateTimeOriginal?.description ||
                    tags.DateTimeDigitized?.description ||
                    tags.DateTime?.description ||
                    null;

                resolve(date);
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
                resolve({latitude, longitude});
            } else {
                resolve({latitude: null, longitude: null});
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

function getImageToDelete(remoteKeys, localKeys) {
    return remoteKeys.filter(key => !localKeys.includes(key));
}

function getCsrfToken() {
    const cookie = document.cookie.split(';').find(c => c.trim().startsWith('csrftoken='));
    return cookie?.split('=')[1] || null;
}

function getWsRequest() {
    return window.location.hostname === "speciarium.julsql.fr"
        ? "wss://speciarium.julsql.fr"
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

        reader.onload = (e) => {
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);

        img.onload = () => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");

            let {width, height} = img;

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
                resolve(new File([blob], file.name, {type: file.type}));
            }, file.type, 0.9);
        };

        img.onerror = reject;
    });
}

// ==== ÉVÈNEMENT PRINCIPAL ====

const folderInput = document.getElementById("folderInput");

const CHUNK_SIZE = 100;
const MAX_DATA_SIZE_UPLOAD = 209715200;

folderInput.addEventListener("click", () => {
    folderInput.value = "";
});

folderInput.addEventListener("change", async (event) => {
    const info = document.getElementById("upload-info");
    const infoContainer = document.getElementById("upload-info-container");
    const loading = document.getElementById("loading");
    const progressBar = document.getElementById('progress-bar');
    const progressBarContainer = document.getElementById('progress-bar-container');

    loading.style.display = "block";
    infoContainer.style.display = "flex";
    info.style.display = "none";
    progressBarContainer.style.display = "none";

    await cleanDatabase();
    const remoteKeys = await getKeys();

    const files = event.target.files;
    const localKeys = [];
    const metadata = [];
    const resizedFiles = [];
    const species = new Set();

    let i = 0;
    for (const file of files) {
        loading.style.display = "none";
        progressBarContainer.style.display = "block";
        info.style.display = "block";
        info.style.width = "130px";
        info.innerHTML = `prétraitement<br>${i + 1}/${files.length}`;
        const progress = ((i+1) / files.length) * 100;
        progressBar.style.width = progress + '%';

        i += 1;

        try {
            const ext = file.name.split('.').pop().toLowerCase();
            if (file.name[0] !== "." && ["jpg", "jpeg", "png", "gif", "bmp", "webp"].includes(ext)) {
                const filePath = normaliserUnicode(file.webkitRelativePath).split('/');
                const cleanedPath = filePath.slice(1).join('/');
                const hash = await calculateHash(file);
                const key = `${cleanedPath}:${hash}`;
                localKeys.push(key);

                if (!remoteKeys.includes(key)) {
                    console.log(key);
                    species.add(filePath[filePath.length - 1]);
                    const resized = await resizeImage(file, 1000, 1000);
                    resizedFiles.push(resized);
                    const timestamp = await getTimestamp(file);
                    const coordinates = await getCoordinates(file);
                    metadata.push({
                        filepath: cleanedPath,
                        hash,
                        datetime: timestamp,
                        latitude: coordinates.latitude,
                        longitude: coordinates.longitude,
                    });
                }
            }
        } catch (e) {
            console.error(e);
            alert(`Problème avec l'image : ${file.webkitRelativePath}`);
        }
    }

    const imageToDelete = getImageToDelete(remoteKeys, localKeys);

    if (imageToDelete.length === 0 && metadata.length === 0) {
        info.textContent = "Aucune image n'a changé";
        loading.style.display = "none";
        info.style.display = "block";
        info.style.width = "200px";
        return;
    }

    let confirmText;
    if (metadata.length > 1) {
        confirmText = `Envoyer ${metadata.length} photos et en supprimer ${imageToDelete.length} ?`;
    } else {
        confirmText = `Envoyer ${metadata.length} photo et en supprimer ${imageToDelete.length} ?`;
    }

    const upload = window.confirm(confirmText);

    if (!upload) {
        loading.style.display = "none";
        progressBarContainer.style.display = "none";
        info.style.display = "none";
        return;
    }

    const csrfToken = getCsrfToken();
    const headers = new Headers();
    if (csrfToken) headers.append("X-CSRFToken", csrfToken);
    i = 0;

    const socket = new WebSocket(`${getWsRequest()}/ws/progress/`);
    let currentIndex = 0;

    socket.onmessage = function (event) {
        const data = JSON.parse(event.data);
        if (data.progress === "Done" && currentIndex >= resizedFiles.length) {
            socket.close();
        } else if (!isNaN(data.progress)) {
            loading.style.display = "none";
            progressBarContainer.style.display = "block";
            info.style.display = "block";
            info.style.width = "130px";
            currentIndex = parseInt(data.progress) + i
            info.innerHTML = `Ajout des images<br>${currentIndex}/${species.size}`;
            const progress = ((currentIndex) / species.size) * 100;
            progressBar.style.width = progress + '%';
        }
    };

    socket.onerror = function () {
        info.textContent = "Erreur lors du traitement des images";
        progressBar.style.width = '0';
        progressBarContainer.style.display = "none";
    };

    socket.onclose = function () {
        info.textContent = `Images ajoutées`;
        progressBar.style.width = '0';
        progressBarContainer.style.display = "none";
        location.reload();
    };

    loading.style.display = "block";
    info.style.display = "none";
    progressBarContainer.style.display = "none";

    try {
        for (i; i < resizedFiles.length; i += CHUNK_SIZE) {
            const chunkFiles = resizedFiles.slice(i, i + CHUNK_SIZE);
            const chunkMetadata = metadata.slice(i, i + CHUNK_SIZE);
            if (chunkMetadata.length >= MAX_DATA_SIZE_UPLOAD) {
                throw new Error("Trop d'images dans un seul lot");
            }
            const formData = new FormData();

            for (const file of chunkFiles) {
                formData.append("images", file);
            }

            formData.append("metadata", JSON.stringify(chunkMetadata));

            if (i === 0) {
                formData.append("imageToDelete", JSON.stringify(imageToDelete));
            }

            const response = await fetch(`/upload-images/${currentCollectionId}/`, {
                method: "POST",
                headers,
                body: formData,
            });

            if (!response.ok) {
                throw new Error("Erreur durant l'envoi d'un lot d'images");
            }
        }
    } catch (error) {
        console.error(error);
        info.textContent = "Erreur lors de l'envoi des images";
        info.style.display = "block";
        info.style.width = "200px";
    }

    loading.style.display = "none";
});
