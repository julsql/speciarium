const rows = document.querySelectorAll("tr");
const popup = document.getElementById("popup");
const popupImg = document.getElementById("popup-img");
const nextImageButton = document.getElementById('next-image');
const prevImageButton = document.getElementById('prev-image');
const imageInfo = document.getElementById('image-info');
const imageTitle = document.getElementById('image-title');
const closePopupButton = document.getElementById('close-popup');

let currentGroup = [];
let currentIndex = 0;

// Ouvrir la pop-up avec le groupe d'images
rows.forEach(row => {
    row.addEventListener("click", (event) => {
        if (event.target.tagName === "IMG") {
            disableScroll(false);
            const allImagesData = row.querySelector(".all-images")?.dataset.images;
            console.log(allImagesData)
            if (allImagesData) {
                currentGroup = JSON.parse(allImagesData); // Convertir JSON en array d'objets
            } else {
                currentGroup = [];
            }
            const clickedSrc = event.target.dataset.full;
            currentIndex = currentGroup.findIndex(img => img.full === clickedSrc);
            showImage();
            popup.style.display = "flex";

            if (currentGroup.length < 2) {
                nextImageButton.style.display = "none";
                prevImageButton.style.display = "none";
            } else {
                nextImageButton.style.display = "flex";
                prevImageButton.style.display = "flex";
            }
        }
    });
});

// Fermer la pop-up
closePopupButton.addEventListener('click', () => {
    closePopup()
});

// Afficher l'image dans la pop-up
function showImage() {
    if (currentGroup.length > 0) {
        const img = currentGroup[currentIndex]
        popupImg.src = img.full;
        imageInfo.innerHTML = img.info;
        imageTitle.innerHTML = img.title;
        showMiniMap(img.latitude, img.longitude)
    }
}

// Fonction pour afficher l'image suivante
function showNextImage() {
    currentIndex = (currentIndex + 1) % currentGroup.length;
    showImage()
}

// Fonction pour afficher l'image précédente
function showPrevImage() {
    currentIndex = (currentIndex - 1 + currentGroup.length) % currentGroup.length;
    showImage()
}

// Fonction pour fermer la pop up
function closePopup() {
    disableScroll(true);
    popup.style.display = 'none';
    currentGroup = [];
    closeMiniMap();
}

// Navigation
prevImageButton.addEventListener("click", () => {
    showPrevImage();
});

nextImageButton.addEventListener("click", () => {
    showNextImage();
});

// Fermer la pop-up si on clique en dehors de l'image
popup.addEventListener("click", (event) => {
    if (event.target === popup) {
        closePopup()
    }
});

// Fermer avec le clavier
document.addEventListener('keydown', (e) => {
    if (popup.style.display === 'flex') {
        switch (e.key) {
            case 'ArrowRight': // Flèche droite
                showNextImage();
                break;
            case 'ArrowLeft': // Flèche gauche
                showPrevImage();
                break;
            case 'Escape': // Échap
                closePopup()
                break;
        }
    }
});

// Désactiver le défilement avec les touches fléchées
function disableScrollKeys(event) {
    const keysToPrevent = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "PageUp", "PageDown", "Home", "End"];
    if (keysToPrevent.includes(event.key)) {
        event.preventDefault(); // Empêche le défilement par défaut
    }
}

// Blocage des flêches
function disableScroll(disable) {
    if (disable) {
        document.removeEventListener("keydown", disableScrollKeys);
    } else {
        document.addEventListener("keydown", disableScrollKeys);
    }
}
