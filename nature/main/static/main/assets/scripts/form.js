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

window.onload = function () {
    const clearBtnAll = document.getElementById('clear-all');
    clearBtnAll.addEventListener('click', () => {
        inputs.forEach((input, index) => {
            const clearBtn = clearBtns[index];
            clearInput(input, clearBtn);
        });
    });

    inputs.forEach((input, index) => {
        const clearBtn = clearBtns[index];
        toggleClearBtn(input, clearBtn);
        input.addEventListener('input', () => toggleClearBtn(input, clearBtn));
        clearBtn.addEventListener('click', () => clearInput(input, clearBtn));
    });

    const inputDate = document.getElementById('id_date');
    const clearBtnDate = document.getElementById('clear-date');
    inputDate.addEventListener('input', () => {
        clearBtnDate.style.display = 'inline-block';
    });
    if (clearBtnDate) {
        clearBtnDate.addEventListener('click', () => {
            inputDate.value = '';
            clearBtnDate.style.display = 'none';
        });
    }
}

