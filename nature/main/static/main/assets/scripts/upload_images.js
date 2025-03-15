function getTimestamp(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = function (e) {
            try {
                const tags = ExifReader.load(e.target.result);
                const dateTaken = tags.DateTimeOriginal?.description;
                resolve(dateTaken); // Résolution de la promesse avec la date
            } catch (error) {
                console.error("Erreur lors de la lecture des métadonnées EXIF :", error);
                resolve(null); // En cas d'erreur, on retourne `null`
            }
        };

        reader.onerror = function (error) {
            reject(error); // Rejeter la promesse en cas d'erreur de lecture
        };

        reader.readAsArrayBuffer(file); // Lire le fichier comme un buffer binaire
    });
}

function normaliserUnicode(texte) {
    return texte.normalize("NFC"); // Convertit toutes les variations en une forme unique
}

async function getFormDataSize(formData) {
    const entries = Array.from(formData.entries());
    const boundary = "----WebKitFormBoundary" + Math.random().toString(16);

    let body = "";

    for (const [key, value] of entries) {
        body += `--${boundary}\r\n`;
        if (value instanceof File) {
            body += `Content-Disposition: form-data; name="${key}"; filename="${value.name}"\r\n`;
            body += `Content-Type: ${value.type || "application/octet-stream"}\r\n\r\n`;
            body += await value.arrayBuffer().then(buf => new Uint8Array(buf)).then(bytes => new TextDecoder().decode(bytes));
        } else {
            body += `Content-Disposition: form-data; name="${key}"\r\n\r\n`;
            body += value;
        }
        body += "\r\n";
    }

    body += `--${boundary}--\r\n`;

    return new Blob([body]).size;
}

const folderInput = document.getElementById("folderInput");
folderInput.addEventListener("click", () => {
    folderInput.value = ""; // Réinitialise avant la sélection
});

folderInput.addEventListener("change", async (event) => {

    const info = document.getElementById("upload-info");
    const loading = document.getElementById("loading");
    loading.style.display = "block";
    info.style.display = "none";

    // récupération des clefs uniques
    const remoteKeys = await getKeys();

    const files = event.target.files;

    const formData = new FormData();
    const localKeys = [];
    let hasFilesToUpload = false;
    const metadata = [];

    let upload = true;
    const species = new Set()

    for (const file of files) {
        try {
            const ext = file.name.split('.').pop().toLowerCase();
            if (file.name[0] !== "." && ["jpg", "jpeg", "png", "gif", "bmp", "webp"].includes(ext)) {
                const filePath = normaliserUnicode(file.webkitRelativePath).split('/');
                const cleanedPath = filePath.slice(1).join('/');
                const hash = await calculateHash(file);
                const key = `${cleanedPath}:${hash}`;
                localKeys.push(key);

                if (!remoteKeys.includes(key)) {
                    species.add(filePath[filePath.length - 1])
                    // l'image n'existe pas dans la base de données
                    console.log(key);
                    const resizedFile = await resizeImage(file, 500, 500);
                    hasFilesToUpload = true;
                    formData.append('images', resizedFile);
                    const timestamp = await getTimestamp(file)
                    metadata.push({
                        filepath: cleanedPath,
                        hash: hash,
                        datetime: timestamp,
                    })
                }
            }
        } catch (e) {
            alert(`Problème avec l'image : ${file.webkitRelativePath}`);
        }
    }
    formData.append("metadata", JSON.stringify(metadata));
    const imageToDelete = getImageToDelete(remoteKeys, localKeys);
    formData.append("imageToDelete", JSON.stringify(imageToDelete));

    const size = await getFormDataSize(formData);
    console.log(`Taille des données à envoyer : ${size} bytes`);

    if (imageToDelete.length === 0 && !hasFilesToUpload) {
        info.textContent = "Aucune image n'a changé";
        info.style.display = "block";
        loading.style.display = "none";
    } else {
        upload = upload && window.confirm(`Envoyer ${metadata.length} photos et supprimer ${imageToDelete.length} photos ?`);
        if (upload) {
            const csrfToken = getCsrfToken();
            const headers = new Headers();

            if (csrfToken) {
                headers.append("X-CSRFToken", csrfToken);
            }
            const socket = new WebSocket(
                `ws://${window.location.host}/ws/progress/`
            );

            socket.onmessage = function (event) {
                const data = JSON.parse(event.data);
                console.log(data)
                if (data.progress === "done") {
                    socket.close();
                } else {
                    loading.style.display = "none";
                    info.style.display = "block";
                    info.textContent = `${data.progress}/${species.size}`;
                }
            };

            socket.onerror = function (event) {
                info.textContent = "Erreur lors de l'envoi des images";
            };

            socket.onclose = function (event) {
                info.textContent = `Images ajoutées`;
            };

            const response = await fetch(`http://${window.location.host}/upload-images/`, {
                method: "POST",
                headers: headers,
                body: formData,
            });

            if (response.ok) {
            } else if (response.status === 413) {
                loading.style.display = "none";
                info.textContent = "Quantité de données trop lourde";
            } else {
                console.log(response)
                loading.style.display = "none";
                info.textContent = "Erreur lors de l'envoi des images";
            }
        }
    }
    //loading.style.display = "none";
});

function getImageToDelete(remoteKeys, localKeys) {
    const imageToDelete = [];
    for (const remoteKey of remoteKeys) {
        if (!localKeys.includes(remoteKey)) {
            imageToDelete.push(remoteKey)
        }
    }
    return imageToDelete
}

function getCsrfToken() {
    const csrfCookie = document.cookie.split(';').find(cookie => cookie.trim().startsWith('csrftoken='));
    return csrfCookie ? csrfCookie.split('=')[1] : null;
}

async function getKeys() {
    const response = await fetch(`http://${window.location.host}/hash/`, {
        method: "GET",
    });

    if (response.ok) {
        const result = await response.json();

        if (result.keys && Array.isArray(result.keys)) {
            return result.keys;
        } else {
            console.error("La clé 'keys' est manquante ou invalide dans la réponse :", result);
            return [];
        }
    } else {
        alert("Failed to upload images.");
    }
}

async function calculateHash(file) {
    const arrayBuffer = await file.arrayBuffer(); // Lire le fichier comme ArrayBuffer
    const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer); // Calculer SHA-256
    const hashArray = Array.from(new Uint8Array(hashBuffer)); // Convertir en tableau d'octets
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join(""); // Hexadécimal
}

async function resizeImage(file, maxWidth, maxHeight) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const reader = new FileReader();

        reader.onload = (e) => {
            img.src = e.target.result;
        };

        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            let {width, height} = img;

            // Calculer les nouvelles dimensions tout en respectant les proportions
            if (width > height) {
                if (width > maxWidth) {
                    height = (maxWidth / width) * height;
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width = (maxHeight / height) * width;
                    height = maxHeight;
                }
            }

            // Définir les dimensions du canvas
            canvas.width = width;
            canvas.height = height;

            // Dessiner l'image redimensionnée sur le canvas
            ctx.drawImage(img, 0, 0, width, height);

            // Convertir le canvas en un fichier Blob
            canvas.toBlob(
                (blob) => {
                    resolve(new File([blob], file.name, {type: file.type}));
                },
                file.type,
                0.9 // Qualité (0.9 pour 90%)
            );
        };

        img.onerror = (err) => {
            reject(err);
        };

        reader.readAsDataURL(file);
    });
}
