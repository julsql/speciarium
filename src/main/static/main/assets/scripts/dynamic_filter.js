
document.addEventListener('DOMContentLoaded', function() {
    const fields = ['continent', 'country', 'region', 'year', 'kingdom', 'class_field', 'order_field'];
    const fieldLabels = {
        'continent': 'Continent',
        'country': 'Pays',
        'region': 'Région',
        'year': 'Année',
        'kingdom': 'Règne',
        'class_field': 'Classe',
        'order_field': 'Ordre'
    };

    // Fonction pour obtenir tous les filtres actuels
    function getCurrentFilters() {
        const filters = {};
        fields.forEach(field => {
            const input = document.querySelector(`input[name="${field}"]`);
            if (input && input.value.trim()) {
                filters[field] = input.value;
            }
        });
        return filters;
    }

    // Fonction pour mettre à jour les options d'un champ
    async function updateFieldOptions(field) {
        const filters = getCurrentFilters();

        // Construire les paramètres de query
        const params = new URLSearchParams({field: field});
        Object.entries(filters).forEach(([key, value]) => {
            params.append(key, value);
        });

        try {
            const response = await fetch(`/api/filtered-options/?${params}`);
            const data = await response.json();

            // Mettre à jour la datalist
            updateDatalist(field, data.options, fieldLabels[field]);
        } catch (error) {
            console.error('Erreur lors de la récupération des options:', error);
        }
    }

    // Fonction pour mettre à jour une datalist avec les nouvelles options
    function updateDatalist(field, options, label) {
        const datalistId = `${field}-list`;
        let datalist = document.getElementById(datalistId);

        // Créer la datalist si elle n'existe pas
        if (!datalist) {
            datalist = document.createElement('datalist');
            datalist.id = datalistId;
            document.body.appendChild(datalist);

            // Mettre à jour l'input correspondant
            const input = document.querySelector(`input[name="${field}"]`);
            if (input) {
                input.setAttribute('list', datalistId);
            }
        }

        // Vider la datalist
        datalist.innerHTML = '';

        // Ajouter les nouvelles options
        options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option;
            datalist.appendChild(optionElement);
        });
    }

    // Fonction pour mettre à jour tous les champs
    function updateAllFields() {
        fields.forEach(field => {
            updateFieldOptions(field);
        });
    }

    // Ajouter des écouteurs d'événements sur tous les champs
    fields.forEach(field => {
        const input = document.querySelector(`input[name="${field}"]`);
        if (input) {
            // Événement change (sélection depuis la datalist)
            input.addEventListener('change', function() {
                updateAllFields();
            });

            // Événement input (saisie au clavier)
            input.addEventListener('input', function() {
                // Debounce pour éviter trop de requêtes
                clearTimeout(input.updateTimeout);
                input.updateTimeout = setTimeout(() => {
                    updateAllFields();
                }, 300);
            });
        }
    });

    // Écouter les clics sur les boutons "clear-btn" pour supprimer les filtres
    const clearButtons = document.querySelectorAll('.clear-btn');
    clearButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Trouver l'input parent
            const inputContainer = this.closest('.input-container');
            if (inputContainer) {
                const input = inputContainer.querySelector('input');
                if (input) {
                    input.value = '';
                    input.dispatchEvent(new Event('input', { bubbles: true }));

                    // Mettre à jour tous les champs après un délai
                    setTimeout(updateAllFields, 100);
                }
            }
        });
    });

    // Écouter le bouton "clear-all"
    const clearAllButton = document.getElementById('clear-all');
    if (clearAllButton) {
        clearAllButton.addEventListener('click', function() {
            // Attendre que tous les champs soient vidés
            setTimeout(() => {
                updateAllFields();
            }, 100);
        });
    }

    // Initialiser les options au chargement
    updateAllFields();
});