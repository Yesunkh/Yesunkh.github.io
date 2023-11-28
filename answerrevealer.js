// ==UserScript==
// @name         Answer Revealer
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Displays answers in an overlay that can be toggled on and off with a button
// @author       Yesinskythemagician
// @match        https://www.khanacademy.org/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    window.loaded = false;
    const answersArray = [];

    // Create a button with a dot to toggle the overlay
    const toggleButton = document.createElement('button');
    toggleButton.innerHTML = '<span style="font-size: 20px;">&bull;</span>';
    toggleButton.style.position = 'fixed';
    toggleButton.style.top = '10px';
    toggleButton.style.right = '10px';
    toggleButton.style.zIndex = '10000';
    toggleButton.style.cursor = 'move'; // Make the button draggable

    let isDragging = false;
    let offsetX, offsetY;

    toggleButton.addEventListener('mousedown', (e) => {
        isDragging = true;
        offsetX = e.clientX - toggleButton.getBoundingClientRect().left;
        offsetY = e.clientY - toggleButton.getBoundingClientRect().top;
    });

    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            toggleButton.style.left = e.clientX - offsetX + 'px';
            toggleButton.style.top = e.clientY - offsetY + 'px';
        }
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
    });

    document.body.appendChild(toggleButton);

    // Create the overlay
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
    overlay.style.border = '1px solid #ccc';
    overlay.style.borderRadius = '5px';
    overlay.style.zIndex = '9999';
    overlay.style.display = 'none';
    overlay.style.overflow = 'auto';
    overlay.style.padding = '20px';

    // Calculate the initial position of the overlay based on the button's position
    const buttonRect = toggleButton.getBoundingClientRect();
    overlay.style.top = buttonRect.bottom + 'px';
    overlay.style.left = buttonRect.left + 'px';

    // Create a button to close the overlay
    const closeButton = document.createElement('button');
    closeButton.innerText = 'Close';
    closeButton.style.marginTop = '10px';
    closeButton.addEventListener('click', () => {
        overlay.style.display = 'none';
    });

    document.body.appendChild(overlay);
    overlay.appendChild(closeButton);

    toggleButton.addEventListener('click', () => {
        // Recalculate the position of the overlay when the button is clicked
        const buttonRect = toggleButton.getBoundingClientRect();
        overlay.style.top = buttonRect.bottom + 'px';
        overlay.style.left = buttonRect.left + 'px';

        // Display all answers in the overlay
        overlay.innerHTML = answersArray.map(answer => `<p>${answer.join("<br>")}</p>`).join('');

        // Delete the upper two answers if there are more than 3 answers
        if (answersArray.length > 3) {
            answersArray.splice(0, 2);
        }

        // Toggle the display of the overlay
        overlay.style.display = overlay.style.display === 'none' ? 'block' : 'none';
    });

    class Answer {
        // (Your existing Answer class code)
    }

    const originalFetch = window.fetch;
    window.fetch = function () {
        return originalFetch.apply(this, arguments).then(async (res) => {
            if (res.url.includes("/getAssessmentItem")) {
                const clone = res.clone();
                const json = await clone.json();

                let item, question;

                try {
                    item = json.data.assessmentItem.item.itemData;
                    question = JSON.parse(item).question;
                } catch {
                    let errorIteration = () => { return localStorage.getItem("error_iter") || 0; }
                    localStorage.setItem("error_iter", errorIteration() + 1);

                    if (errorIteration() < 4) {
                        return location.reload();
                    } else {
                        return console.log("%c An error occurred", "color: red; font-weight: bolder; font-size: 20px;");
                    }
                }

                if (!question) return;

                // Display answers in the overlay
                Object.keys(question.widgets).map(widgetName => {
                    switch (widgetName.split(" ")[0]) {
                        case "numeric-input":
                            return freeResponseAnswerFrom(question);
                        case "radio":
                            return multipleChoiceAnswerFrom(question);
                        case "expression":
                            return expressionAnswerFrom(question);
                        case "dropdown":
                            return dropdownAnswerFrom(question);
                    }
                });
            }

            if (!window.loaded) {
                console.clear();
                console.log("%c Answer Revealer ", "color: mediumvioletred; -webkit-text-stroke: .5px black; font-size:40px; font-weight:bolder; padding: .2rem;");
                console.log("%cCreated by Alex Dubov (@adubov1)", "color: white; -webkit-text-stroke: .5px black; font-size:15px; font-weight:bold;");
                window.loaded = true;
            }

            return res;
        })
    }

    function freeResponseAnswerFrom(question) {
        const answer = Object.values(question.widgets).map((widget) => {
            if (widget.options?.answers) {
                return widget.options.answers.map(answer => {
                    if (answer.status == "correct") {
                        return answer.value;
                    }
                });
            }
        }).flat().filter((val) => { return val !== undefined; });

        answersArray.push(answer);
    }

    function multipleChoiceAnswerFrom(question) {
        const answer = Object.values(question.widgets).map((widget) => {
            if (widget.options?.choices) {
                return widget.options.choices.map(choice => {
                    if (choice.correct) {
                        return choice.content;
                    }
                });
            }
        }).flat().filter((val) => { return val !== undefined; });

        answersArray.push(answer);
    }

    function expressionAnswerFrom(question) {
        const answer = Object.values(question.widgets).map((widget) => {
            if (widget.options?.answerForms) {
                return widget.options.answerForms.map(answer => {
                    if (Object.values(answer).includes("correct")) {
                        return answer.value;
                    }
                });
            }
        }).flat();

        answersArray.push(answer);
    }

    function dropdownAnswerFrom(question) {
        const answer = Object.values(question.widgets).map((widget) => {
            if (widget.options?.choices) {
                return widget.options.choices.map(choice => {
                    if (choice.correct) {
                        return choice.content;
                    }
                });
            }
        }).flat();

        answersArray.push(answer);
    }
})();
