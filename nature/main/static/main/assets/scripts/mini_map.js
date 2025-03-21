const miniMapContainer = document.getElementById("mini-map");
let miniMap;

function showMiniMap(lat, lon) {
    console.log(lat, lon)
    if (lat && lon && !isNaN(lat) && !isNaN(lon)) {

        // Afficher la mini carte
        miniMapContainer.style.display = "block";

        // Si la carte n'existe pas encore, on la crée
        if (!miniMap) {
            console.log(lat, lon)
            miniMap = L.map('mini-map', {
                attributionControl: false,
                zoomControl: false
            }).setView([lat, lon], 10);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(miniMap);

            // Ajouter un marqueur
            L.marker([lat, lon]).addTo(miniMap);
            console.log(miniMap)
        } else {
            // Mettre à jour la vue et le marqueur
            miniMap.setView([lat, lon], 10);

            // Supprimer les anciens marqueurs
            miniMap.eachLayer((layer) => {
                if (layer instanceof L.Marker) {
                    miniMap.removeLayer(layer);
                }
            });

            L.marker([lat, lon]).addTo(miniMap);
        }
    } else {
        miniMapContainer.style.display = "none";
    }
}

function closeMiniMap() {
    miniMapContainer.style.display = "none";
    if (miniMap) {
        miniMap.eachLayer((layer) => {
            if (layer instanceof L.Marker) {
                miniMap.removeLayer(layer);
            }
        });
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const toggleMapSize = document.getElementById("toggle-map-size");

    toggleMapSize.addEventListener("click", () => {
        miniMapContainer.classList.toggle("expanded");
    });
});
