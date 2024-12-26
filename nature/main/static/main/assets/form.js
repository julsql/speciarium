const inputs = document.querySelectorAll('.input-container input');
const clearBtns = document.querySelectorAll('.input-container .clear-btn');

// Fonction pour afficher ou cacher la croix
function toggleClearBtn(input, clearBtn) {
    if (input.value) {
        clearBtn.style.display = 'inline-block';
    } else {
        clearBtn.style.display = 'none';
    }
}

// Fonction pour effacer la valeur de l'input
function clearInput(input, clearBtn) {
    input.value = '';
    toggleClearBtn(input, clearBtn); // Met à jour la visibilité de la croix après effacement
}

// Ajouter les événements sur tous les champs
inputs.forEach((input, index) => {
    const clearBtn = clearBtns[index];
    toggleClearBtn(input, clearBtn);
    input.addEventListener('input', () => toggleClearBtn(input, clearBtn));
    clearBtn.addEventListener('click', () => clearInput(input, clearBtn));
});


const inputDate = document.getElementById('id_date');
const clearBtnDate = document.getElementById('clear-date');
window.onload = function () {
    console.log(inputDate.value)
}
inputDate.addEventListener('input', () => {
    clearBtnDate.style.display = 'inline-block';
});
clearBtnDate.addEventListener('click', () => {
    inputDate.value = '';
    clearBtnDate.style.display = 'none';
});
