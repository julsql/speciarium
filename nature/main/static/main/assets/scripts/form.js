const inputs = document.querySelectorAll('.input-container input');
const clearBtns = document.querySelectorAll('.input-container .clear-btn');

const inputDateStart = document.getElementById('id_start_date');
const inputDateEnd = document.getElementById('id_end_date');
const clearBtnDateStart = document.getElementById('clear-start-date');
const clearBtnDateEnd = document.getElementById('clear-end-date');

const inputDates = [inputDateStart, inputDateEnd];
const clearBtnDates = [clearBtnDateStart, clearBtnDateEnd];

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
        inputDates.forEach((input) => {
            input.value = "";
        })
    });

    inputs.forEach((input, index) => {
        const clearBtn = clearBtns[index];
        toggleClearBtn(input, clearBtn);
        input.addEventListener('input', () => toggleClearBtn(input, clearBtn));
        clearBtn.addEventListener('click', () => clearInput(input, clearBtn));
    });

    inputDates.forEach((input, index) => {
        const clearBtnDate = clearBtnDates[index];
        input.addEventListener('input', () => {
            clearBtnDate.style.display = 'block';
        });
        if (clearBtnDate) {
            clearBtnDate.addEventListener('click', () => {
                input.value = '';
                clearBtnDate.style.display = 'none';
            });
        }
    })
}
