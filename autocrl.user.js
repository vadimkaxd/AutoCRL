// ==UserScript==
// @name         AutoCRL (Auto Clash Royale League)
// @namespace    https://github.com/vadimkaxd
// @homepageURL  https://github.com/vadimkaxd/AutoCRL
// @supportURL   https://github.com/vadimkaxd/AutoCRL/issues
// @license      MIT
// @version      1.0.0
// @description  Auto completes Clash Royale League live stream events (Collects drops, answers polls, predictions)
// @author       vadimkaxd
// @match        https://event.supercell.com/clashroyale/*
// @icon         https://event.supercell.com/clashroyale/favicon.ico
// @grant        none
// ==/UserScript==

function load(key, def) {
    let res = localStorage.getItem("autocrl-" + key);
    if (res === null) {
        store(key, def);
        return def;
    } else {
        return JSON.parse(res);
    }
}

function store(key, val) {
    localStorage.setItem("autocrl-" + key, JSON.stringify(val));
}

let cheerEnabled = load("cheer", true);
let pollEnabled = load("poll", true);
let quizEnabled = load("quiz", true);
let matchPredictionEnabled = load("matchPrediction", false);
let matchPredictionStrategy = load("predictionStrategy", "maj");
let dropEnabled = load("drop", true);
let sliderEnabled = load("slider", true);
let feedLoggingEnabled = load("feedLogging", true);
let dynamicLogging = load("dynamicLogging", true);
let lowDetail = load("lowDetail", false);
let noPlayer = load("noPlayer", false);
let debug = false;
let feed;

function getColor(msg) {
    if (/не удался|не появилась|не найдена|не появилось/i.test(msg)) return '#e74c3c';
    if (/отправлен|пройден|собран|сделан|Загружен/i.test(msg)) return '#2ecc71';
    if (/предикт|синих|красных/i.test(msg)) return '#9b59b6';
    if (/Проверяем|Отвечаем|Попытка|Открываем|Выбираем/i.test(msg)) return '#3498db';
    return '#f1c40f';
}

function log(msg, id) {
    if (!feedLoggingEnabled) return;

    setTimeout(() => {
        if (!feed) {
            feed = document.getElementsByClassName("feed__content")[0];
            if (!feed) return;
        }

        let color = getColor(msg);
        let textStyle = `color: ${color} !important; text-shadow: 0 2px 4px rgba(0,0,0,0.9) !important; font-weight: bold !important;`;

        if (id) {
            let existing = document.getElementById(id);
            if (existing) {
                let title = existing.getElementsByClassName("rewardCard__textContainer__title")[0];
                if (title) {
                    title.textContent = msg;
                    title.style.cssText = textStyle;
                    return;
                }
            }
        }

        let cardIdAttr = id ? `id="${id}"` : '';
        let htmlStr = `<div data-v-6ab4ab95="" data-v-e989f123="" ${cardIdAttr}>
        <div data-v-307c1ac7="" data-v-6ab4ab95="" class="contentCardContainer" with-extra-top-margin="" style="translate: none; rotate: none; scale: none; transform: translate3d(0px, 0px, 0px); opacity: 1; --v3ee5afce: #245fc1;">
            <div data-v-615f3480="" data-v-307c1ac7="" class="baseCard baseCard--paper" radius="medium">
                <div data-v-615f3480="" class="baseCard__cardBackground baseCard__cardBackground--paper-3"></div>
                <div data-v-307c1ac7="" class="contentCard contentCard--paper contentCard--isFullWidth contentCard--enabled">
                    <div data-v-307c1ac7="" class="contentCard__gameBackground"></div>
                    <div data-v-307c1ac7="" class="contentCard__slot">
                        <div data-v-6ab4ab95="" class="rewardCard">
                            <div data-v-6ab4ab95="" class="rewardCard__rewardContainer">
                                <div data-v-6ab4ab95="" class="rewardCard__infoContainer">
                                    <div data-v-6ab4ab95="" class="rewardCard__textContainer" style="opacity: 1;">
                                        <div data-v-6ab4ab95="" class="rewardCard__textContainer__title" style="${textStyle}">${msg}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <figure data-v-615f3480="" class="baseCard__corner baseCard__corner--topLeft"></figure>
                <figure data-v-615f3480="" class="baseCard__corner baseCard__corner--bottomRight"></figure>
            </div>
        </div>
    </div>`;

        if (feed.children.length >= 2) {
            feed.children[feed.children.length - 2].insertAdjacentHTML("afterend", htmlStr);
            feed.children[feed.children.length - 2].scrollIntoView();
        } else if (feed.children.length > 0) {
            feed.children[feed.children.length - 1].insertAdjacentHTML("afterend", htmlStr);
            feed.children[feed.children.length - 1].scrollIntoView();
        }
    }, 1000);
}

function purge(elements) {
    for (let elem of elements) {
        try {
            elem.remove();
        } catch (e) {}
    }
}

function checkMainDataSection() {
    const users = document.getElementById("autocrl-users-wrap");
    const teams = document.getElementById("autocrl-teams-wrap");
    const mainSec = document.getElementById("autocrl-data-section");
    const configTitle = document.getElementById("autocrl-config-title");

    if (users && teams && mainSec) {
        if (users.classList.contains("autocrl-hidden-block") &&
            teams.classList.contains("autocrl-hidden-block")) {
            mainSec.classList.add("autocrl-hidden-block");
            if (configTitle) configTitle.style.marginTop = "0px";
        } else {
            if (configTitle) configTitle.style.marginTop = "20px";
        }
    }
}

function showDataSubSection(id) {
    const mainSec = document.getElementById("autocrl-data-section");
    const subSec = document.getElementById(id);
    const configTitle = document.getElementById("autocrl-config-title");

    if (subSec && subSec.classList.contains("autocrl-hidden-block")) {
        subSec.classList.remove("autocrl-hidden-block");
    }
    if (mainSec && mainSec.classList.contains("autocrl-hidden-block")) {
        mainSec.classList.remove("autocrl-hidden-block");
    }

    if (configTitle) configTitle.style.marginTop = "20px";
}

function updateDependencies() {
    const stratRow = document.getElementById("autocrl-strat-row");
    const dynRow = document.getElementById("autocrl-dyn-row");

    if (stratRow) {
        if (matchPredictionEnabled) stratRow.classList.remove("autocrl-disabled");
        else stratRow.classList.add("autocrl-disabled");
    }

    if (dynRow) {
        if (feedLoggingEnabled) dynRow.classList.remove("autocrl-disabled");
        else dynRow.classList.add("autocrl-disabled");
    }
}

(function() {
    "use strict";

    let loaded = false;
    let conn;
    let matchpredblue;
    let matchpredred;
    let predictions;

    let lastCheerId = "";
    let lastPollId = "";
    let lastImagePollId = "";
    let lastQuizId = "";
    let lastDropId = "";
    let lastMatchPredictionId = "";
    let lastSliderId = "";

    const OriginalWebSocket = window.WebSocket;

    class PatchedWebSocket extends OriginalWebSocket {
        constructor(...args) {
            super(...args);
            const originalGet = Object.getOwnPropertyDescriptor(OriginalWebSocket.prototype, "onmessage").get;
            const originalSet = Object.getOwnPropertyDescriptor(OriginalWebSocket.prototype, "onmessage").set;

            Object.defineProperty(this, "onmessage", {
                configurable: true,
                enumerable: true,
                get() {
                    return originalGet.call(this);
                },
                set(newOnMessage) {
                    const onMessage = (event) => {
                        parse(event.data, this);
                        newOnMessage(event);
                    };
                    originalSet.call(this, onMessage);
                },
            });
            const originalSend = this.send;
            this.send = function(data) {
                if (debug) {
                    const parsed = JSON.parse(data);
                    console.log("[AutoCRL] Отправка сообщения:", data, parsed);
                }
                originalSend.call(this, data);
            };
        }
    }

    window.WebSocket = PatchedWebSocket;

    function parse(data, ws) {
        const msg = JSON.parse(data);
        msg.forEach(event => {
            const messageType = event.messageType;
            if (messageType === "global_state") {
                if (!loaded) setupAutoBsc();
                if (noPlayer) {
                    purge(document.getElementsByTagName("iframe"))
                    setTimeout(() => purge(document.getElementsByTagName("iframe")), 1000)
                }
            }

            if (messageType === "cheer") {
                if (conn) {
                    conn.textContent = event.payload.connectedClients;
                    showDataSubSection("autocrl-users-wrap");
                }

                if (lowDetail) {
                    purge(document.getElementsByClassName("cheer__gradient"));
                    purge(document.getElementsByClassName("cheer__canvas"));
                }

                if (cheerEnabled && event.payload.typeId !== lastCheerId) {
                    let cardId = "autocrl-log-cheer-" + Date.now();
                    if (dynamicLogging) {
                        log("Проверяем кнопку чирса...", cardId);
                        setTimeout(() => {
                            let cheerBtn = document.getElementsByClassName("cheerButtonContainer__cheerButton");

                            if (cheerBtn.length > 0) {
                                log("Кнопка чирс найдена, отправляем...", cardId);
                                for (let btn of cheerBtn) btn.click();
                                log("Чирс отправлен", cardId);
                            } else {
                                log("Кнопка чирс недоступна. Открываем меню...", cardId);
                                let switchBtn = document.getElementsByClassName("cheerButtonContainer__switchButton")[0];
                                if (switchBtn) {
                                    switchBtn.click();
                                    let attempts = 0;
                                    const maxAttempts = 20;
                                    const pollPin = () => {
                                        attempts++;
                                        let pinBtns = document.getElementsByClassName("cheer-pin-button");
                                        if (pinBtns.length > 0) {
                                            log("Выбираем эмодзи...", cardId);
                                            pinBtns[0].click();
                                            setTimeout(() => {
                                                let newCheerBtn = document.getElementsByClassName("cheerButtonContainer__cheerButton");
                                                if (newCheerBtn.length > 0) {
                                                    log("Эмодзи выбрано, отправляем...", cardId);
                                                    for (let btn of newCheerBtn) btn.click();
                                                    log("Чирс отправлен", cardId);
                                                } else {
                                                    log("Кнопка чирс не появилась.", cardId);
                                                }
                                            }, 1000);
                                        } else if (attempts < maxAttempts) {
                                            setTimeout(pollPin, 500);
                                        } else {
                                            log("Меню эмодзи не появилось.", cardId);
                                        }
                                    };
                                    setTimeout(pollPin, 1000);
                                } else {
                                    log("Кнопка выбора эмодзи не найдена.", cardId);
                                }
                            }
                        }, 1500);
                    } else {
                        log("Отправка чирса");
                        setTimeout(() => {
                            let cheerBtn = document.getElementsByClassName("cheerButtonContainer__cheerButton");
                            if (cheerBtn.length > 0) {
                                for (let btn of cheerBtn) btn.click();
                            } else {
                                let switchBtn = document.getElementsByClassName("cheerButtonContainer__switchButton")[0];
                                if (switchBtn) {
                                    switchBtn.click();
                                    setTimeout(() => {
                                        let pinBtns = document.getElementsByClassName("cheer-pin-button");
                                        if (pinBtns.length > 0) {
                                            pinBtns[0].click();
                                            setTimeout(() => {
                                                let newCheerBtn = document.getElementsByClassName("cheerButtonContainer__cheerButton");
                                                for (let btn of newCheerBtn) btn.click();
                                            }, 1000);
                                        }
                                    }, 1000);
                                }
                            }
                        }, 1500);
                    }
                    lastCheerId = event.payload.typeId;
                }
            }

            if (messageType === "poll" && pollEnabled) {
                if (event.payload.typeId !== lastPollId) {
                    let cardId = "autocrl-log-poll-" + Date.now();
                    if (dynamicLogging) {
                        log("Отвечаем на опрос...", cardId);
                        setTimeout(() => {
                            try {
                                for (let que of document.getElementsByClassName("multiChoiceQuestionCard")) que.getElementsByTagName("button")[0].click();
                                for (let que of document.getElementsByClassName("cardImagePoll")) que.getElementsByTagName("button")[0].click();
                            } catch (e) {}
                            log("Опрос пройден", cardId);
                        }, 3500);
                    } else {
                        log("Отправка опроса");
                        setTimeout(() => {
                            try {
                                for (let que of document.getElementsByClassName("multiChoiceQuestionCard")) que.getElementsByTagName("button")[0].click();
                                for (let que of document.getElementsByClassName("cardImagePoll")) que.getElementsByTagName("button")[0].click();
                            } catch (e) {}
                        }, 3500);
                    }
                    lastPollId = event.payload.typeId;
                }
            }

            if (messageType === "image_poll" && pollEnabled) {
                if (event.payload.typeId !== lastImagePollId) {
                    let cardId = "autocrl-log-imgpoll-" + Date.now();
                    if (dynamicLogging) {
                        log("Отвечаем на опрос с картинками...", cardId);
                        setTimeout(() => {
                            try {
                                for (let que of document.getElementsByClassName("cardImagePoll")) que.getElementsByTagName("button")[0].click();
                            } catch (e) {}
                            log("Опрос с картинками пройден", cardId);
                        }, 3500);
                    } else {
                        log("Отправка опроса с картинками");
                        setTimeout(() => {
                            try {
                                for (let que of document.getElementsByClassName("cardImagePoll")) que.getElementsByTagName("button")[0].click();
                            } catch (e) {}
                        }, 3500);
                    }
                    lastImagePollId = event.payload.typeId;
                }
            }

            if (messageType === "quiz" && quizEnabled) {
                if (event.payload.typeId !== lastQuizId) {
                    let cardId = "autocrl-log-quiz-" + Date.now();
                    const answerQuiz = () => {
                        const quizCards = document.querySelectorAll('.card-quiz[active="true"]');
                        quizCards.forEach(card => {
                            try {
                                const buttons = card.querySelectorAll('.cardButton');
                                const correctIndex = event.payload.correctAnswer.alternative;
                                if (buttons[correctIndex]) buttons[correctIndex].click();
                            } catch (e) {}
                        });
                    };
                    if (dynamicLogging) {
                        log("Отвечаем на викторину...", cardId);
                        setTimeout(() => {
                            answerQuiz();
                            log("Викторина пройдена", cardId);
                        }, 3500);
                    } else {
                        log("Отправка викторины");
                        setTimeout(() => {
                            answerQuiz();
                        }, 3500);
                    }
                    lastQuizId = event.payload.typeId;
                }
            }

            if (messageType === "match_prediction") {
                predictions = event.payload.answers;
                if (matchpredblue) matchpredblue.textContent = predictions["0"];
                if (matchpredred) matchpredred.textContent = predictions["1"];

                showDataSubSection("autocrl-teams-wrap");

                const predId =
                    event.payload.typeId ||
                    event.payload.matchId ||
                    event.payload.cardKey ||
                    (event.payload.answers
                        ? "ans_" + JSON.stringify(event.payload.answers)
                        : "time_" + Date.now());

                if (matchPredictionEnabled && predId !== lastMatchPredictionId) {
                    lastMatchPredictionId = predId;

                    let cardId = "autocrl-log-predict-" + Date.now();

                    let team = 0;
                    switch (matchPredictionStrategy) {
                        case "2":
                            team = 1;
                            break;
                        case "rand":
                            team = Math.floor(Math.random() * 2);
                            break;
                        case "maj":
                            try {
                                team = Number(predictions["0"]) > Number(predictions["1"]) ? 0 : 1;
                            } catch (e) {
                                team = 0;
                            }
                            break;
                    }

                    if (dynamicLogging)
                        log(`Попытка предикта на ${team === 0 ? "Синих" : "Красных"}...`, cardId);
                    else log("Попытка предикта...");

                    let attempts = 0;
                    const maxAttempts = 40;

                    const pollPrediction = () => {
                        attempts++;
                        const cards = document.querySelectorAll('.card-prediction[active="true"]');
                        let clicked = false;

                        cards.forEach((card) => {
                            if (card.querySelector(".picked")) {
                                clicked = true;
                                return;
                            }

                            const buttons = card.querySelectorAll("button.buttons-predictions");
                            const active = Array.from(buttons).filter(
                                (b) => !b.disabled && !b.classList.contains("is-disabled")
                            );

                            if (active[team]) {
                                const btn = active[team];

                                try {
                                    btn.click();
                                } catch (e) {}

                                try {
                                    const inner =
                                        btn.querySelector(".inner-clip-content") ||
                                        btn.querySelector(".inner-content") ||
                                        btn;
                                    inner.dispatchEvent(
                                        new MouseEvent("click", {
                                            bubbles: true,
                                            cancelable: true,
                                            view: window,
                                        })
                                    );
                                } catch (e) {}

                                clicked = true;
                            }
                        });

                        if (clicked) {
                            if (dynamicLogging)
                                log(`Предикт сделан на ${team === 0 ? "Синих" : "Красных"}`, cardId);
                            else log("Предикт сделан");
                            return;
                        }

                        if (attempts < maxAttempts) {
                            setTimeout(pollPrediction, 500);
                        } else {
                            if (dynamicLogging)
                                log("Предикт не удался: нет доступных кнопок", cardId);
                            else log("Предикт не удался");
                        }
                    };

                    setTimeout(pollPrediction, 3000);
                }
            }

            if (messageType === "loot_drop" && dropEnabled) {
                if (event.payload.typeId !== lastDropId) {
                    let cardId = "autocrl-log-drop-" + Date.now();
                    const collectLoot = () => {
                        const lootCards = document.querySelectorAll('.card-loot[active="true"]');
                        lootCards.forEach(card => {
                            try {
                                const isClaimed = card.querySelector('.card-loot-content .content.is-claimed');
                                if (isClaimed) return;

                                const grabBtn = card.querySelector('button.cta');
                                if (grabBtn && !grabBtn.disabled) {
                                    grabBtn.click();
                                }
                            } catch (e) {}
                        });
                    };
                    if (dynamicLogging) {
                        log("Собираем дроп...", cardId);
                        setTimeout(() => {
                            collectLoot();
                            log("Дроп собран", cardId);
                        }, 2000);
                    } else {
                        log("Сбор дропа");
                        setTimeout(() => {
                            collectLoot();
                        }, 2000);
                    }
                    lastDropId = event.payload.typeId;
                }
            }

            if (messageType === "slider" && sliderEnabled) {
                if (event.payload.typeId !== lastSliderId) {
                    let cardId = "autocrl-log-slider-" + Date.now();
                    if (dynamicLogging) {
                        log("Отвечаем на слайдер...", cardId);
                        setTimeout(() => {
                            for (let drop of document.getElementsByClassName("sliderQuestionCard")) {
                                try {
                                    let elem = drop.getElementsByTagName("input")[0];
                                    elem.value = "100";
                                    elem.dispatchEvent(new InputEvent("input"));
                                    elem.dispatchEvent(new Event("change"));
                                } catch (e) {}
                            }
                            log("Слайдер пройден", cardId);
                        }, 2000);
                    } else {
                        log("Ответ на слайдер");
                        setTimeout(() => {
                            for (let drop of document.getElementsByClassName("sliderQuestionCard")) {
                                try {
                                    let elem = drop.getElementsByTagName("input")[0];
                                    elem.value = "100";
                                    elem.dispatchEvent(new InputEvent("input"));
                                    elem.dispatchEvent(new Event("change"));
                                } catch (e) {}
                            }
                        }, 2000);
                    }
                    lastSliderId = event.payload.typeId;
                }
            }
        });
    }

    function setupAutoBsc() {
        loaded = true;

        const interval = setInterval(() => {
            const div = document.getElementsByClassName("feed__content")[0];
            if (div) {
                div.insertAdjacentHTML("afterbegin", loadedMessageHtml);
                clearInterval(interval);
            }
        }, 500);

        document.body.insertAdjacentHTML("afterbegin", `
    <style>
    #autocrl-overlay, #autocrl-overlay *, [id^="autocrl-log-"] * {
        box-sizing: border-box;
    }

    #autocrl-overlay {
        position: fixed;
        top: 15%;
        left: 10px;
        z-index: 99999999;
        direction: ltr !important;
        text-align: left !important;
        background: rgba(26, 27, 38, 0.75);
        backdrop-filter: blur(12px);
        color: #e0e2ea;
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        width: 140px;
        transition: width 0.3s ease, border-radius 0.3s ease, left 0.3s ease, top 0.3s ease;
        overflow: hidden;
    }
    #autocrl-overlay.open {
        width: 300px;
    }
    #autocrl-header {
        padding: 12px 16px;
        font-weight: 700;
        font-size: 1.15rem;
        cursor: grab;
        background: rgba(0, 0, 0, 0.2);
        border-radius: 12px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        user-select: none;
        border-bottom: 1px solid transparent;
        white-space: nowrap;
        touch-action: none;
    }
    #autocrl-header:active {
        cursor: grabbing;
    }
    #autocrl-overlay.open #autocrl-header {
        border-bottom-left-radius: 0;
        border-bottom-right-radius: 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    .autocrl-chevron {
        transition: transform 0.3s ease;
        font-size: 0.8rem;
        margin-left: .5rem;
    }
    #autocrl-overlay.open .autocrl-chevron {
        transform: rotate(180deg);
    }

    #autocrl-body {
        max-height: 0;
        opacity: 0;
        padding: 0;
        visibility: hidden;
        overflow-y: hidden;
        transition: max-height 0.3s ease, opacity 0.2s ease, padding 0.3s ease;
        direction: ltr;
        scrollbar-gutter: stable;
    }
    #autocrl-overlay.open #autocrl-body {
        max-height: 75vh;
        opacity: 1;
        padding: 16px 16px 16px 8px;
        visibility: visible;
        transition: max-height 0.4s ease, opacity 0.4s ease, padding 0.3s ease;
    }

    #autocrl-body.allow-scroll {
        overflow-y: auto;
    }

    .autocrl-inner-content {
        direction: ltr;
        padding-left: 8px;
    }

    .autocrl-hidden-block {
        max-height: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        opacity: 0 !important;
        overflow: hidden !important;
        border: none !important;
    }

    #autocrl-data-section, #autocrl-users-wrap, #autocrl-teams-wrap {
        transition: max-height 0.4s ease, opacity 0.4s ease, margin 0.4s ease, padding 0.4s ease;
    }

    #autocrl-data-section { max-height: 200px; margin-bottom: 8px; opacity: 1; overflow: hidden; }
    #autocrl-users-wrap { max-height: 40px; margin-bottom: 12px; opacity: 1; }
    #autocrl-teams-wrap { max-height: 80px; opacity: 1; }

    .autocrl-section-title {
        font-size: 1.15rem;
        font-weight: 700;
        color: #f1c40f;
        margin-bottom: 12px;
        margin-top: 20px;
        border-bottom: 1px solid rgba(241, 196, 15, 0.2);
        padding-bottom: 6px;
        white-space: nowrap;
        transition: margin-top 0.4s ease;
    }
    .autocrl-section-title:first-child { margin-top: 0; }

    .autocrl-stat-row {
        font-size: 0.9rem;
        margin-bottom: 4px;
        display: flex;
        justify-content: space-between;
        white-space: nowrap;
    }

    .autocrl-config-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
        font-size: 0.9rem;
        white-space: nowrap;
        transition: opacity 0.3s ease;
        gap: 12px;
    }

    .autocrl-disabled {
        opacity: 0.4;
        pointer-events: none;
    }

    .autocrl-switch {
        position: relative;
        display: inline-block;
        width: 38px;
        height: 20px;
        flex-shrink: 0;
    }
    .autocrl-switch input { opacity: 0; width: 0; height: 0; }
    .autocrl-slider-btn {
        position: absolute;
        cursor: pointer;
        top: 0; left: 0; right: 0; bottom: 0;
        background-color: #414868;
        transition: .3s;
        border-radius: 20px;
    }
    .autocrl-slider-btn:before {
        position: absolute;
        content: "";
        height: 14px;
        width: 14px;
        left: 3px;
        bottom: 3px;
        background-color: white;
        transition: .3s;
        border-radius: 50%;
    }
    .autocrl-switch input:checked + .autocrl-slider-btn { background-color: #3498db; }
    .autocrl-switch input:checked + .autocrl-slider-btn:before { transform: translateX(18px); }

    .autocrl-select {
        background: #24283b;
        color: #e0e2ea;
        border: 1px solid #414868;
        border-radius: 6px;
        padding: 4px 8px;
        font-family: inherit;
        outline: none;
        width: 100%;
    }
    .autocrl-btn-danger {
        width: 100%;
        background: rgba(231, 76, 60, 0.2);
        color: #e74c3c;
        border: 1px solid rgba(231, 76, 60, 0.4);
        padding: 8px;
        border-radius: 6px;
        font-family: inherit;
        font-weight: 600;
        cursor: pointer;
        margin-top: 14px;
        transition: background 0.2s;
        white-space: nowrap;
    }
    .autocrl-btn-danger:hover { background: rgba(231, 76, 60, 0.4); }
    #autocrl-body::-webkit-scrollbar { width: 6px; }
    #autocrl-body::-webkit-scrollbar-track { background: transparent; }
    #autocrl-body::-webkit-scrollbar-thumb { background: #414868; border-radius: 4px; }
    .Video__InteractionBlocker, .VideoCover.VideoCover--hidden { all: unset !important; display: none; }
    </style>

    <div id="autocrl-overlay">
        <div id="autocrl-header">
            <span dir="ltr" style="display:inline-block; color: #f1c40f; text-shadow: 1px 1px 0 #000;">Auto<span style="color:#e74c3c;">C</span><span style="color:#3498db;">R</span><span style="color:#2ecc71;">L</span></span>
            <span class="autocrl-chevron">▼</span>
        </div>

        <div id="autocrl-body">
            <div class="autocrl-inner-content">
                <div id="autocrl-data-section" class="autocrl-hidden-block">
                    <div class="autocrl-section-title">Данные</div>
                    <div id="autocrl-users-wrap" class="autocrl-hidden-block">
                        <div class="autocrl-stat-row">
                            <span>Подключено:</span>
                            <strong id="autocrl-connected" style="color:#f1c40f">неизвестно</strong>
                        </div>
                    </div>

                    <div id="autocrl-teams-wrap" class="autocrl-hidden-block">
                        <div class="autocrl-stat-row">
                            <span>Синяя команда:</span> <strong id="autocrl-pick-blue" style="color:#3498db">неизвестно</strong>
                        </div>
                        <div class="autocrl-stat-row">
                            <span>Красная команда:</span> <strong id="autocrl-pick-red" style="color:#e74c3c">неизвестно</strong>
                        </div>
                    </div>
                </div>

                <div class="autocrl-section-title" id="autocrl-config-title" style="margin-top: 0px;">Настройки</div>
                <div class="autocrl-config-row">
                    <span>Авточирс</span>
                    <label class="autocrl-switch"><input type="checkbox" id="autocrl-cheer"><span class="autocrl-slider-btn"></span></label>
                </div>
                <div class="autocrl-config-row">
                    <span>Отвечать на опросы</span>
                    <label class="autocrl-switch"><input type="checkbox" id="autocrl-poll"><span class="autocrl-slider-btn"></span></label>
                </div>
                <div class="autocrl-config-row">
                    <span>Отвечать на викторины</span>
                    <label class="autocrl-switch"><input type="checkbox" id="autocrl-quiz"><span class="autocrl-slider-btn"></span></label>
                </div>
                <div class="autocrl-config-row">
                    <span>Отвечать на слайдеры</span>
                    <label class="autocrl-switch"><input type="checkbox" id="autocrl-slider"><span class="autocrl-slider-btn"></span></label>
                </div>
                <div class="autocrl-config-row">
                    <span>Собирать дропы</span>
                    <label class="autocrl-switch"><input type="checkbox" id="autocrl-lootdrop"><span class="autocrl-slider-btn"></span></label>
                </div>
                <div class="autocrl-config-row">
                    <span>Автопредикт</span>
                    <label class="autocrl-switch"><input type="checkbox" id="autocrl-predict"><span class="autocrl-slider-btn"></span></label>
                </div>
                <div class="autocrl-config-row" id="autocrl-strat-row" style="flex-direction: column; align-items: flex-start; gap: 8px;">
                    <span>Стратегия предикта</span>
                    <select class="autocrl-select" id="autocrl-predict-strat">
                        <option value="1">Только синие</option>
                        <option value="2">Только красные</option>
                        <option value="rand">Случайно</option>
                        <option value="maj">За большинством</option>
                    </select>
                </div>
                <div class="autocrl-config-row">
                    <span>Логи в чат</span>
                    <label class="autocrl-switch"><input type="checkbox" id="autocrl-feedlogging"><span class="autocrl-slider-btn"></span></label>
                </div>
                <div class="autocrl-config-row" id="autocrl-dyn-row">
                    <span>Динамические логи</span>
                    <label class="autocrl-switch"><input type="checkbox" id="autocrl-dynamiclogging"><span class="autocrl-slider-btn"></span></label>
                </div>
                <div class="autocrl-config-row">
                    <span>Без графики чирса</span>
                    <label class="autocrl-switch"><input type="checkbox" id="autocrl-lowdetail"><span class="autocrl-slider-btn"></span></label>
                </div>
                <div class="autocrl-config-row">
                    <span>Отключить плеер</span>
                    <label class="autocrl-switch"><input type="checkbox" id="autocrl-noplayer"><span class="autocrl-slider-btn"></span></label>
                </div>

                <button class="autocrl-btn-danger" onclick='if(confirm("Вы уверены?")) document.getElementById("autocrl-overlay").remove()'>
                    Скрыть меню
                </button>
            </div>
        </div>
    </div>
        `);

        dragElement(document.getElementById("autocrl-overlay"));

        const elems = {
            cheer: document.getElementById("autocrl-cheer"),
            poll: document.getElementById("autocrl-poll"),
            quiz: document.getElementById("autocrl-quiz"),
            slider: document.getElementById("autocrl-slider"),
            lootdrop: document.getElementById("autocrl-lootdrop"),
            predict: document.getElementById("autocrl-predict"),
            predictstrat: document.getElementById("autocrl-predict-strat"),
            feedlogging: document.getElementById("autocrl-feedlogging"),
            dynamiclogging: document.getElementById("autocrl-dynamiclogging"),
            lowdetail: document.getElementById("autocrl-lowdetail"),
            noplayer: document.getElementById("autocrl-noplayer")
        };

        elems.cheer.checked = cheerEnabled;
        elems.poll.checked = pollEnabled;
        elems.quiz.checked = quizEnabled;
        elems.slider.checked = sliderEnabled;
        elems.predict.checked = matchPredictionEnabled;
        elems.lootdrop.checked = dropEnabled;
        elems.feedlogging.checked = feedLoggingEnabled;
        elems.dynamiclogging.checked = dynamicLogging;
        elems.predictstrat.value = matchPredictionStrategy;
        elems.lowdetail.checked = lowDetail;
        elems.noplayer.checked = noPlayer;

        updateDependencies();

        elems.cheer.onchange = function(e) {
            cheerEnabled = e.target.checked;
            store("cheer", cheerEnabled);
        };
        elems.poll.onchange = function(e) {
            pollEnabled = e.target.checked;
            store("poll", pollEnabled);
        };
        elems.quiz.onchange = function(e) {
            quizEnabled = e.target.checked;
            store("quiz", quizEnabled);
        };
        elems.slider.onchange = function(e) {
            sliderEnabled = e.target.checked;
            store("slider", sliderEnabled);
        };
        elems.predict.onchange = function(e) {
            matchPredictionEnabled = e.target.checked;
            store("matchPrediction", matchPredictionEnabled);
            updateDependencies();
        };
        elems.lootdrop.onchange = function(e) {
            dropEnabled = e.target.checked;
            store("drop", dropEnabled);
        };
        elems.feedlogging.onchange = function(e) {
            feedLoggingEnabled = e.target.checked;
            store("feedLogging", feedLoggingEnabled);
            updateDependencies();
        };
        elems.dynamiclogging.onchange = function(e) {
            dynamicLogging = e.target.checked;
            store("dynamicLogging", dynamicLogging);
        };
        elems.predictstrat.onchange = function(e) {
            matchPredictionStrategy = e.target.value;
            store("predictionStrategy", matchPredictionStrategy);
        };
        elems.lowdetail.onchange = function(e) {
            lowDetail = e.target.checked;
            store("lowDetail", lowDetail);
            if (!lowDetail) return;
            purge(document.getElementsByClassName("cheer__gradient"));
            purge(document.getElementsByClassName("cheer__canvas"));
        };
        elems.noplayer.onchange = function(e) {
            noPlayer = e.target.checked;
            store("noPlayer", noPlayer);
            if (!noPlayer) return;
            purge(document.getElementsByTagName("iframe"))
            setTimeout(() => purge(document.getElementsByTagName("iframe")), 1000)
        }

        conn = document.getElementById("autocrl-connected");
        matchpredblue = document.getElementById("autocrl-pick-blue");
        matchpredred = document.getElementById("autocrl-pick-red");
        if (noPlayer) {
          purge(document.getElementsByTagName("iframe"))
          setTimeout(() => purge(document.getElementsByTagName("iframe")), 1000)
        }
    }

    const loadedMessageHtml = `<div data-v-6ab4ab95="" data-v-e989f123="" id="autocrl-log-startup">
    <div data-v-307c1ac7="" data-v-6ab4ab95="" class="contentCardContainer" with-extra-top-margin="" style="translate: none; rotate: none; scale: none; transform: translate3d(0px, 0px, 0px); opacity: 1; --v3ee5afce: #245fc1;">
        <div data-v-615f3480="" data-v-307c1ac7="" class="baseCard baseCard--paper" radius="medium">
            <div data-v-615f3480="" class="baseCard__cardBackground baseCard__cardBackground--paper-3"></div>
            <div data-v-307c1ac7="" class="contentCard contentCard--paper contentCard--isFullWidth contentCard--enabled">
                <div data-v-307c1ac7="" class="contentCard__gameBackground"></div>
                <div data-v-307c1ac7="" class="contentCard__slot">
                    <div data-v-6ab4ab95="" class="rewardCard">
                        <div data-v-6ab4ab95="" class="rewardCard__rewardContainer">
                            <div data-v-6ab4ab95="" class="rewardCard__reward" style="translate: none; rotate: none; scale: none; transform: translate3d(0px, -1.3431px, 0px);">
                                <picture data-v-58643600="" data-v-6ab4ab95="" class="cmsImage cmsImage--loaded cmsImage--fullWidth"><img data-v-58643600="" class="cmsImage cmsImage--loaded cmsImage--fullWidth" src="https://event.supercell.com/clashroyale/assets/rewards/images/7emETQCs7gjPr7rg1VJyFa.svg" loading="lazy"></picture>
                            </div>
                            <div data-v-6ab4ab95="" class="rewardCard__infoContainer">
                                <div data-v-6ab4ab95="" class="rewardCard__textContainer" style="opacity: 1;">
                                    <div data-v-6ab4ab95="" class="rewardCard__textContainer__title" style="color: #f1c40f !important; text-shadow: 0 2px 4px rgba(0,0,0,0.9) !important; font-weight: bold !important;">AutoCRL Загружен (Auto Clash Royale League)</div>
                                    <div data-v-6ab4ab95="" class="rewardCard__textContainer__subTitle" style="color: #b8c5d6 !important; font-family: 'SupercellText-Regular', sans-serif !important;">vadimkaxd<br>UI by 123SONIC321<br>на основе AutoBSC от catme0w</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <figure data-v-615f3480="" class="baseCard__corner baseCard__corner--topLeft"></figure>
            <figure data-v-615f3480="" class="baseCard__corner baseCard__corner--bottomRight"></figure>
        </div>
    </div>
</div>`;
})();

function dragElement(elmnt) {
    let pos1 = 0,
        pos2 = 0,
        pos3 = 0,
        pos4 = 0;
    let dragger = document.getElementById("autocrl-header");
    let isDragging = false;

    if (dragger) {
        dragger.onmousedown = dragStart;
        dragger.ontouchstart = dragStart;
    }

    window.addEventListener('resize', () => enforceBounds(elmnt));

    function dragStart(e) {
        isDragging = false;

        let clientX = e.type === "touchstart" ? e.touches[0].clientX : e.clientX;
        let clientY = e.type === "touchstart" ? e.touches[0].clientY : e.clientY;

        pos3 = clientX;
        pos4 = clientY;

        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
        document.ontouchend = closeDragElement;
        document.ontouchmove = elementDrag;

        elmnt.style.transition = "width 0.3s ease, border-radius 0.3s ease";
    }

    function elementDrag(e) {
        let clientX = e.type === "touchmove" ? e.touches[0].clientX : e.clientX;
        let clientY = e.type === "touchmove" ? e.touches[0].clientY : e.clientY;

        if (Math.abs(pos3 - clientX) > 4 || Math.abs(pos4 - clientY) > 4) {
            isDragging = true;
        }

        if (!isDragging) return;

        pos1 = pos3 - clientX;
        pos2 = pos4 - clientY;
        pos3 = clientX;
        pos4 = clientY;

        let newTop = elmnt.offsetTop - pos2;
        let newLeft = elmnt.offsetLeft - pos1;

        let maxLeft = window.innerWidth - elmnt.offsetWidth;
        let maxTop = window.innerHeight - elmnt.offsetHeight;

        newLeft = Math.max(0, Math.min(newLeft, maxLeft));
        newTop = Math.max(0, Math.min(newTop, maxTop));

        elmnt.style.top = newTop + "px";
        elmnt.style.left = newLeft + "px";
    }

    function closeDragElement(e) {
        document.onmouseup = null;
        document.onmousemove = null;
        document.ontouchend = null;
        document.ontouchmove = null;

        elmnt.style.transition = "width 0.3s ease, border-radius 0.3s ease, left 0.3s ease, top 0.3s ease";

        if (!isDragging) {
            if (e && e.type === "touchend") {
                e.preventDefault();
            }

            let willBeOpen = !elmnt.classList.contains('open');

            if (willBeOpen) {
                elmnt.classList.add('open');

                setTimeout(() => {
                    if (elmnt.classList.contains('open')) {
                        document.getElementById("autocrl-body").classList.add("allow-scroll");
                    }
                }, 400);

                let targetWidth = 300;
                let currentLeft = elmnt.offsetLeft;
                if (currentLeft + targetWidth > window.innerWidth) {
                    elmnt.style.left = Math.max(0, window.innerWidth - targetWidth - 10) + "px";
                }
                setTimeout(() => enforceBounds(elmnt), 350);
            } else {
                document.getElementById("autocrl-body").classList.remove("allow-scroll");
                elmnt.classList.remove('open');
            }
        }
    }

    function enforceBounds(el) {
        let maxLeft = window.innerWidth - el.offsetWidth;
        let maxTop = window.innerHeight - el.offsetHeight;

        let correctedLeft = Math.max(0, Math.min(el.offsetLeft, maxLeft - 10));
        let correctedTop = Math.max(0, Math.min(el.offsetTop, maxTop - 10));

        el.style.left = correctedLeft + "px";
        el.style.top = correctedTop + "px";
    }
}
