// Dispatch Helper - Copyright (c) 2023 Discookie. Released under the BSD 3-clause license.
// https://github.com/Discookie/dispatch-helper

export let rawInput;
export let mapInfo;
export let mapLayout;
export let lengthOverrides;
export let speedOverrides;
export let timetable;
export let levelContent;

export let levelLoaded = false;
export let displayedStations = [];
export let stationData = {};
export let globalTime = new Date(0);

let intervalId;
let lastTick = true;

// TODO: Separate savestates for each map
const autoLoad = () => window.localStorage.getItem('autoLoad') === 'true' ?? false;
const setAutoLoad = (autoLoad) => window.localStorage.setItem('autoLoad', autoLoad);

let localPaused = true;
const isPaused = () => autoLoad() ? (window.localStorage.getItem('paused') === 'true' ?? true) : localPaused;
const setPaused = (paused) => window.localStorage.setItem('paused', paused);

const syncTime = () => autoLoad() ? new Date(+(window.localStorage.getItem('syncTime') ?? globalTime.getTime())) : globalTime;
const setSyncTime = (syncTime) => window.localStorage.setItem('syncTime', syncTime.getTime());

export function initialSetup() {
    document.body.innerHTML = '';

    const headerSection = document.createElement('header');
    const navbarOuter = document.createElement('nav');
    const navbar = document.createElement('ul');
    
    const loadLevelButton = document.createElement('li');
    loadLevelButton.id = 'file-toggle';
    loadLevelButton.textContent = 'File';
    loadLevelButton.addEventListener('click', () => {
        document.querySelector('#load-level').classList.toggle('hidden');
    });
    navbar.appendChild(loadLevelButton);

    const stationSelectButton = document.createElement('li');
    stationSelectButton.id = 'stations-toggle';
    stationSelectButton.textContent = 'Stations';
    stationSelectButton.addEventListener('click', () => {
        document.querySelector('#station-select').classList.toggle('hidden');
    });
    navbar.appendChild(stationSelectButton);

    const settingsButton = document.createElement('li');
    settingsButton.id = 'settings-toggle';
    settingsButton.textContent = 'Settings';
    settingsButton.addEventListener('click', () => {
        document.querySelector('#settings').classList.toggle('hidden');
    });
    navbar.appendChild(settingsButton);

    const aboutButton = document.createElement('li');
    aboutButton.id = 'about-toggle';
    aboutButton.textContent = 'About';
    aboutButton.addEventListener('click', () => {
        document.querySelector('#about').classList.toggle('hidden');
    });
    navbar.appendChild(aboutButton);

    navbarOuter.appendChild(navbar);

    const title = document.createElement('h1');
    title.textContent = 'Dispatch Helper';
    navbarOuter.appendChild(title);

    const saveTitle = document.createElement('h2');
    saveTitle.id = 'save-title';
    saveTitle.textContent = 'No save loaded';
    navbarOuter.appendChild(saveTitle);

    headerSection.appendChild(navbarOuter);
    document.body.appendChild(headerSection);

    const mainSection = document.createElement('main');

    const selectLevelDiv = document.createElement('section');
    selectLevelDiv.id = 'load-level';
    selectLevelDiv.classList.add('hidden');

    {
        const headerDiv = document.createElement('div');
        
        const selectLevelTitle = document.createElement('h2');
        selectLevelTitle.innerText = 'Select level';
        headerDiv.appendChild(selectLevelTitle);

        const closeSelectLevelButton = document.createElement('button');
        closeSelectLevelButton.classList.add('close');
        closeSelectLevelButton.innerText = 'X';
        closeSelectLevelButton.addEventListener('click', () => {
            document.querySelector('#load-level').classList.add('hidden');
        });
        headerDiv.appendChild(closeSelectLevelButton);

        selectLevelDiv.appendChild(headerDiv);
    }

    {
        const fileUploadDiv = document.createElement('div');

        const fileUpload = document.createElement('input');
        fileUpload.type = 'file';
        fileUpload.id = 'file-upload';
        fileUpload.accept = '.txt';
        fileUploadDiv.appendChild(fileUpload);

        const fileUploadLabel = document.createElement('label');
        fileUploadLabel.innerText = 'Select level file';
        fileUploadLabel.htmlFor = 'file-upload';
        fileUploadDiv.appendChild(fileUploadLabel);

        fileUpload.addEventListener('change', () => {
            fileUploadLabel.innerText = `Selected file: ${fileUpload.files[0].name}`;
        });

        const loadFileButton = document.createElement('button');
        loadFileButton.innerText = 'Load file';
        loadFileButton.addEventListener('click', () => {
            const file = fileUpload.files[0];
            if (!file) {
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => {
                processInputs(e.target.result);
            };
            reader.readAsText(file);
        });
        fileUploadDiv.appendChild(loadFileButton);

        selectLevelDiv.appendChild(fileUploadDiv);
    }

    {
        const textUploadDiv = document.createElement('div');

        const textUpload = document.createElement('textarea');
        textUpload.id = 'pasted-level';
        textUpload.placeholder = 'Paste level here';
        textUploadDiv.appendChild(textUpload);

        const loadTextButton = document.createElement('button');
        loadTextButton.innerText = 'Load raw text';
        loadTextButton.addEventListener('click', () => {
            processInputs(textUpload.value);
        });
        textUploadDiv.appendChild(loadTextButton);

        selectLevelDiv.appendChild(textUploadDiv);
    }

    
    {
        const localSaveDiv = document.createElement('div');

        // TODO: Display name of local save
        const loadLocalButton = document.createElement('button');
        loadLocalButton.innerText = 'Load local save';
        loadLocalButton.addEventListener('click', () => {
            const save = localStorage.getItem('save');
            processInputs(save);
        });
        localSaveDiv.appendChild(loadLocalButton);

        const saveLocalButton = document.createElement('button');
        saveLocalButton.innerText = 'Save locally';
        saveLocalButton.addEventListener('click', () => {
            localStorage.setItem('save', rawInput);
            setLoadedState(levelLoaded);
        });
        localSaveDiv.appendChild(saveLocalButton);

        const clearLocalButton = document.createElement('button');
        clearLocalButton.innerText = 'Clear local save';
        clearLocalButton.addEventListener('click', () => {
            localStorage.removeItem('save');
            setLoadedState(levelLoaded);
        });
        localSaveDiv.appendChild(clearLocalButton);

        selectLevelDiv.appendChild(localSaveDiv);
    }

    mainSection.appendChild(selectLevelDiv);

    const stationsConfigDiv = document.createElement('section');
    stationsConfigDiv.id = 'station-select';
    stationsConfigDiv.classList.add('hidden');

    {
        const headerDiv = document.createElement('div');

        const stationSelectTitle = document.createElement('h2');
        stationSelectTitle.innerText = 'Select stations';
        headerDiv.appendChild(stationSelectTitle);

        const closeStationSelectButton = document.createElement('button');
        closeStationSelectButton.classList.add('close');
        closeStationSelectButton.innerText = 'X';

        closeStationSelectButton.addEventListener('click', () => {
            document.querySelector('#station-select').classList.add('hidden');
        });

        headerDiv.appendChild(closeStationSelectButton);

        stationsConfigDiv.appendChild(headerDiv);
    }

    {
        const selectStationsDiv = document.createElement('div');

        const stationList = document.createElement('select');
        stationList.name = 'station-list';
        stationList.id = 'station-list';
        selectStationsDiv.appendChild(stationList);

        const addStationButton = document.createElement('button');
        addStationButton.innerText = 'Add station';
        addStationButton.addEventListener('click', () => {
            const station = document.querySelector('#station-list').value;
            if (displayedStations.includes(station)) return;
            displayedStations.push(station);
            initStations(displayedStations);
        });
        selectStationsDiv.appendChild(addStationButton);

        const removeStationButton = document.createElement('button');
        removeStationButton.innerText = 'Remove station';
        removeStationButton.addEventListener('click', () => {
            const station = document.querySelector('#station-list').value;
            displayedStations = displayedStations.filter((e) => e !== station);
            initStations(displayedStations);
        });
        selectStationsDiv.appendChild(removeStationButton);

        stationsConfigDiv.appendChild(selectStationsDiv);
    }

    mainSection.appendChild(stationsConfigDiv);

    const settingsDiv = document.createElement('section');
    settingsDiv.id = 'settings';
    settingsDiv.classList.add('hidden');

    {
        const headerDiv = document.createElement('div');

        const settingsTitle = document.createElement('h2');
        settingsTitle.innerText = 'Settings';
        headerDiv.appendChild(settingsTitle);

        const closeSettingsButton = document.createElement('button');
        closeSettingsButton.classList.add('close');
        closeSettingsButton.innerText = 'X';

        closeSettingsButton.addEventListener('click', () => {
            document.querySelector('#settings').classList.add('hidden');
        });

        headerDiv.appendChild(closeSettingsButton);

        settingsDiv.appendChild(headerDiv);
    }

    const gracePeriodLabel = document.createElement('span');
    gracePeriodLabel.innerText = 'Arrival filter grace period (mins):';
    settingsDiv.appendChild(gracePeriodLabel);

    {
        const settingsButtonsDiv = document.createElement('div');

        const gracePeriodBeforeLabel = document.createElement('label');
        gracePeriodBeforeLabel.htmlFor = 'arrival-limit';
        gracePeriodBeforeLabel.innerText = 'Before arrival:';
        settingsButtonsDiv.appendChild(gracePeriodBeforeLabel);

        const gracePeriodBefore = document.createElement('input');
        gracePeriodBefore.id = 'arrival-limit';
        gracePeriodBefore.type = 'number';
        gracePeriodBefore.value = 5;
        gracePeriodBefore.min = 0;
        // TODO: Update grace period
        settingsButtonsDiv.appendChild(gracePeriodBefore);

        const gracePeriodAfterLabel = document.createElement('label');
        gracePeriodAfterLabel.htmlFor = 'departure-limit';
        gracePeriodAfterLabel.innerText = 'After departure:';
        settingsButtonsDiv.appendChild(gracePeriodAfterLabel);

        const gracePeriodAfter = document.createElement('input');
        gracePeriodAfter.id = 'departure-limit';
        gracePeriodAfter.type = 'number';
        gracePeriodAfter.value = 1;
        gracePeriodAfter.min = 0;
        // TODO: Update grace period
        settingsButtonsDiv.appendChild(gracePeriodAfter);

        settingsDiv.appendChild(settingsButtonsDiv);
    }
        
    {
        const timetableManagementDiv = document.createElement('div');

        const autoLoadLabel = document.createElement('label');
        autoLoadLabel.htmlFor = 'auto-load';
        autoLoadLabel.innerText = 'Sync save across tabs:';
        timetableManagementDiv.appendChild(autoLoadLabel);

        const autoLoadCheckbox = document.createElement('input');
        autoLoadCheckbox.id = 'auto-load';
        autoLoadCheckbox.type = 'checkbox';
        autoLoadCheckbox.checked = autoLoad();
        autoLoadCheckbox.addEventListener('change', () => {
            setAutoLoad(autoLoadCheckbox.checked);
        });
        timetableManagementDiv.appendChild(autoLoadCheckbox);

        const resetTimetableButton = document.createElement('button');
        resetTimetableButton.innerText = 'Reset timetable';
        resetTimetableButton.addEventListener('click', () => {
            resetTimetable();
            for (const station of displayedStations) {
                updateTimetable(station);
            }
        });
        timetableManagementDiv.appendChild(resetTimetableButton);

        settingsDiv.appendChild(timetableManagementDiv);
    }

    mainSection.appendChild(settingsDiv);

    const aboutDiv = document.createElement('section');
    aboutDiv.id = 'about';
    aboutDiv.classList.add('hidden');

    {
        const aboutHeader = document.createElement('div');

        const aboutTitle = document.createElement('h2');
        aboutTitle.innerText = 'About';
        aboutHeader.appendChild(aboutTitle);

        const closeAboutButton = document.createElement('button');
        closeAboutButton.classList.add('close');
        closeAboutButton.innerText = 'X';
        closeAboutButton.addEventListener('click', () => {
            document.querySelector('#about').classList.add('hidden');
        });
        aboutHeader.appendChild(closeAboutButton);

        aboutDiv.appendChild(aboutHeader);
    }

    {
        const aboutText = document.createElement('p');
        aboutText.appendChild(document.createTextNode('A timetable viewer and dispatch tracking system for the game '));

        const gameLink = document.createElement('a');
        gameLink.href = 'https://railroute.eu/';
        gameLink.innerText = 'Rail Route';
        aboutText.appendChild(gameLink);

        aboutText.appendChild(document.createTextNode('.'));
        aboutText.appendChild(document.createElement('br'));
        aboutText.appendChild(document.createElement('br'));

        aboutText.appendChild(document.createTextNode('Check out the project on '));

        const githubLink = document.createElement('a');
        githubLink.href = 'https://github.com/Discookie/dispatch-helper';
        githubLink.innerText = 'GitHub';
        aboutText.appendChild(githubLink);

        aboutText.appendChild(document.createTextNode('!'));

        aboutText.appendChild(document.createElement('br'));
        aboutText.appendChild(document.createElement('br'));

        aboutText.appendChild(document.createTextNode('Created by '));

        const creatorLink = document.createElement('a');
        creatorLink.href = 'https://github.com/Discookie';
        creatorLink.innerText = 'Discookie';
        aboutText.appendChild(creatorLink);

        aboutText.appendChild(document.createTextNode('. Released under the '));

        const licenseLink = document.createElement('a');
        licenseLink.href = 'https://github.com/Discookie/dispatch-helper/blob/main/LICENSE';
        licenseLink.innerText = 'BSD 3-clause license';
        aboutText.appendChild(licenseLink);

        aboutText.appendChild(document.createTextNode('.'));

        aboutText.appendChild(document.createElement('br'));
        aboutText.appendChild(document.createElement('br'));

        const woof = document.createElement('small');
        woof.innerText = 'woof';
        aboutText.appendChild(woof);

        aboutDiv.appendChild(aboutText);
    }

    mainSection.appendChild(aboutDiv);
    
    const timeDiv = document.createElement('section');
    timeDiv.id = 'time';

    const timeDisplay = document.createElement('span');
    timeDisplay.textContent = '<time>';
    timeDisplay.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && isPaused()) {
            const time = e.target.textContent;
            globalTime = parseTime(time);
            lastTick = lastTick ?? true;
            e.preventDefault();

            if (isPaused()) {
                setSyncTime(globalTime);
            }
        }
    });
    timeDiv.appendChild(timeDisplay);

    const timePauseButton = document.createElement('button');
    timePauseButton.innerText = 'Start';
    timePauseButton.addEventListener('click', () => {
        if (isPaused()) {
            setPaused(false);
            lastTick = Date.now();
        } else {
            setPaused(true);
            setSyncTime(globalTime);
        }
    });
    timeDiv.appendChild(timePauseButton);

    mainSection.appendChild(timeDiv);

    const timetablesDiv = document.createElement('section');
    timetablesDiv.id = 'timetables';
    mainSection.appendChild(timetablesDiv);

    document.body.appendChild(mainSection);

    if (intervalId) {
        clearInterval(intervalId);
    }

    setPaused(true);
    intervalId = setInterval(tick, 250);

    setLoadedState(false);

    if (autoLoad()) {
        const save = localStorage.getItem('save');
        if (save) {
            processInputs(save, false);
        }
    }
}

export function setLoadedState(isLoaded) {
    levelLoaded = isLoaded;

    const [_close, loadFile, loadRaw, loadLocal, saveLocal, clearLocal] = document.querySelectorAll('#load-level button');

    if (isLoaded) {
        loadFile.classList.add('red');
        loadRaw.classList.add('red');
        clearLocal.classList.remove('red');
        saveLocal.classList.add('green');
        saveLocal.disabled = false;

        if (localStorage.getItem('save')) {
            loadLocal.classList.add('red');
            
            loadLocal.disabled = false;
            clearLocal.disabled = false;
        } else {
            loadLocal.classList.remove('red');
            
            loadLocal.disabled = true;
            clearLocal.disabled = true;
        }
    } else {
        loadFile.classList.remove('red');
        loadRaw.classList.remove('red');
        loadLocal.classList.remove('red');
        
        clearLocal.classList.add('red');
        saveLocal.classList.remove('green');
        saveLocal.disabled = true;

        if (localStorage.getItem('save')) {
            loadLocal.disabled = false;
            clearLocal.disabled = false;
        } else {
            loadLocal.disabled = true;
            clearLocal.disabled = true;
        }
    }

    const saveTitle = document.querySelector('#save-title');
    saveTitle.textContent = isLoaded ? mapInfo.Name : 'No save loaded';

}

export function processInputs(raw, shouldSync = true) {
    setLoadedState(false);

    rawInput = raw;
    const segments = raw.split('\n+++');

    let [info, layout] = segments[0].split('\n');
    mapInfo = JSON.parse(info);
    // Not displayed for now
    mapLayout = layout;

    for (const segment in segments) {
        const [header, ...data] = segments[segment].split('\n');
        switch (header.slice(0, -1)) {
            case 'stations':
                // Unused section
                break;
            case 'length overrides': {
                lengthOverrides = data.map((e) => {
                    const [type, id, length] = e.split(' ');
                    return [type, id, length];
                });
                break;
            }
            case 'speed overrides': {
                speedOverrides = data.map((e) => {
                    const [type, id, speed] = e.split(' ');
                    return [type, id, speed];
                });
                break;
            }
            case 'timetable': {
                timetable = Object.fromEntries(data.map((e) => {
                    const [trainID, trainType, maxSpeed, composition, _unknown1, _unknown2, ...stopData] = e.split(' ');
                    const stops = stopData.map((e) => {
                        const [stationID, platform, arrival, layover, _unknown3] = e.split('#');
                        
                        const arrivalTime = parseTime(arrival);
                        const departureTime = new Date(arrivalTime.getTime() + +layover * 60000);

                        return { stationID, platform: +platform, arrival: arrivalTime, layover: +layover, departure: departureTime };
                    });
                return [trainID, { trainType, maxSpeed, composition, stops }];
                }));
                break;
            }
            case 'level content': {
                levelContent = JSON.parse(data[0]);
                break;
            }
            default:
                break;
        }
    }

    displayedStations = [];
    stationData = {};
    setLoadedState(true);

    setPaused(true);
    const timePauseButton = document.querySelector('#time button');
    timePauseButton.innerText = 'Start';

    // Initial timestamp is a minute before the first arrival
    const initialTimestamp = Math.min(...Object.values(timetable).map((e) => e.stops[0].arrival.getTime())) - 60000;
    globalTime = new Date(initialTimestamp);
    lastTick = true;

    if (shouldSync) {
        setSyncTime(globalTime);
    }

    const stationSelectDiv = document.querySelector('#station-select');
    stationSelectDiv.classList.remove('hidden');

    const stationList = document.querySelector('#station-list');
    stationList.innerHTML = '';

    for (const station of Object.values(levelContent['stations']['stations']).sort((a, b) => a.name > b.name)) {
        const option = document.createElement('option');
        option.value = station.uuid;
        option.innerText = station.name;
        stationList.appendChild(option);
    }

    initStations(displayedStations);
}

export function initStations(stations) {
    document.querySelector('#timetables').innerHTML = '';

    const stationList = levelContent['stations']['stations'];

    for (const uuid of stations) {
        const station = stationList.find((e) => e.uuid === uuid);

        if (!station) {
            continue;
        }

        const stationDiv = document.createElement('div');
        stationDiv.classList.add('station');
        stationDiv.id = `station-${station.uuid}`;
        
        const stationName = document.createElement('h2');
        stationName.innerText = station.name;

        const scrollToFill = document.createElement('small');
        const scrollToFillInner = document.createElement('a');
        scrollToFillInner.innerText = '#';
        scrollToFillInner.href = `#station-${station.uuid}`;
        scrollToFill.appendChild(scrollToFillInner);
        stationName.appendChild(scrollToFill);

        stationDiv.appendChild(stationName);

        {
            const settingsBar = document.createElement('div');

            const searchBox = document.createElement('input');
            searchBox.type = 'text';
            searchBox.placeholder = 'Train Number';
            searchBox.addEventListener('input', () => updateTimetable(station.uuid));
            settingsBar.appendChild(searchBox);

            for (const filterName of ['All trains', 'Approaching', 'Unconfirmed']) {
                const filterSelection = document.createElement('input');
                filterSelection.type = 'radio';
                filterSelection.name = `filter-${station.uuid}`;
                filterSelection.value = filterName;
                filterSelection.checked = filterName === 'All trains';
                filterSelection.addEventListener('change', () => updateTimetable(station.uuid));
                settingsBar.appendChild(filterSelection);

                const label = document.createElement('label');
                label.innerText = filterName;
                settingsBar.appendChild(label);
            }

            const separator = document.createElement('span');
            separator.classList.add('separator');
            settingsBar.appendChild(separator);

            for (const sortName of ['Arrival time', 'Departure time', 'Next action']) {
                const sortSelection = document.createElement('input');
                sortSelection.type = 'radio';
                sortSelection.name = `sort-${station.uuid}`;
                sortSelection.value = sortName;
                sortSelection.checked = sortName === 'Arrival time';
                sortSelection.addEventListener('change', () => updateTimetable(station.uuid));
                settingsBar.appendChild(sortSelection);

                const label = document.createElement('label');
                label.innerText = sortName;
                settingsBar.appendChild(label);
            }

            stationDiv.appendChild(settingsBar);
        }

        const scrollWrapper = document.createElement('div');
        scrollWrapper.classList.add('timetable');

        const timetable = document.createElement('table');

        const headerRow = document.createElement('tr');
        headerRow.classList.add('header');

        for (const header of ['ID', 'Type', 'Arrival time', 'From', 'Stop', 'Departure time', 'To']) {
            const cell = document.createElement('th');
            cell.innerText = header;
            headerRow.appendChild(cell);
        }

        timetable.appendChild(headerRow);
        scrollWrapper.appendChild(timetable);
        stationDiv.appendChild(scrollWrapper);

        document.querySelector('#timetables').appendChild(stationDiv);
    }

    for (const uuid of stations) {
        updateTimetable(uuid);
    }
}

export function updateTimetable(stationID, forceUpdate = true) {
    const stationDiv = document.querySelector(`#station-${stationID}`);
    if (!stationDiv) {
        return;
    }

    const timetableElement = stationDiv.querySelector('.timetable table');

    if (!stationData[stationID]) {
        stationData[stationID] = {
            trains: {},
        };
    }

    const searchBox = stationDiv.querySelector('input[type=text]');
    const filterSelection = stationDiv.querySelector(`input[name=filter-${stationID}]:checked`);
    const sortSelection = stationDiv.querySelector(`input[name=sort-${stationID}]:checked`);
    const arrivalLimit = document.querySelector('#arrival-limit').value;
    const departureLimit = document.querySelector('#departure-limit').value;

    const station = levelContent['stations']['stations'].find((e) => e.uuid === stationID);

    let trains = Object.entries(timetable).filter(([_, e]) => e.stops.find((e) => e.stationID === station.uuid));
    if (searchBox.value) {
        trains = trains.filter(([id, _]) => id.startsWith(searchBox.value));
    }

    trains.sort(([aId, a], [bId, b]) => {
        const aStop = a.stops.find((e) => e.stationID === station.uuid);
        const bStop = b.stops.find((e) => e.stationID === station.uuid);
        
        if (sortSelection.value === 'Arrival time') {
            return aStop.arrival.getTime() - bStop.arrival.getTime();
        } else if (sortSelection.value === 'Departure time') {
            return aStop.departure.getTime() - bStop.departure.getTime();
        } else if (sortSelection.value === 'Next action') {
            const isDepartingA = stationData[station.uuid].trains[aId]?.arrived;
            const isDepartingB = stationData[station.uuid].trains[bId]?.arrived;

            const aDifference = isDepartingA ? aStop.departure  : aStop.arrival;
            const bDifference = isDepartingB ? bStop.departure : bStop.arrival;
            return aDifference - bDifference;
        }
    });
    
    trains = trains.filter(([id, train]) => {
        if (filterSelection.value === 'All trains') {
            // display all
        } else if (filterSelection.value === 'Approaching') {
            const arrivalDifference = train.stops.find((e) => e.stationID === station.uuid).arrival - globalTime;
            const departureDifference = globalTime - train.stops.find((e) => e.stationID === station.uuid).departure;

            if (arrivalDifference > arrivalLimit * 60 * 1000 || departureDifference > (departureLimit + 1) * 60 * 1000) {
                return false;
            }
        } else if (filterSelection.value === 'Unconfirmed') {
            const arrivalConfirmed = stationData[station.uuid].trains[id]?.arrived;
            const departureConfirmed = stationData[station.uuid].trains[id]?.departed;
            const isPassThrough = train.stops.find((e) => e.stationID === station.uuid).layover === 0;

            if (arrivalConfirmed && (departureConfirmed || isPassThrough)) {
                return false;
            }
        }
        return true;
    });


    const tableEntries = timetableElement.querySelectorAll('tr');

    // Remove all trains that are not in the timetable
    for (const row of tableEntries) {
        const id = row.dataset.id;
        if (!trains.find(([e]) => e === id)) {
            row.remove();
        }
    }

    // If all trains are the same, do not update
    const trainIDs = [...tableEntries].map((e) => e.dataset.id);
    if (!forceUpdate && trainIDs.length === trains.length && trainIDs.every((e, i) => e === trains[i][0])) {
        return;
    }

    timetableElement.innerHTML = '';

    const headerRow = document.createElement('tr');
    headerRow.classList.add('header');

    for (const header of ['ID', 'Type', 'Arrival time', 'From', 'Stop', 'Departure time', 'To']) {
        const cell = document.createElement('th');
        cell.innerText = header;
        headerRow.appendChild(cell);
    }

    timetableElement.appendChild(headerRow);

    const addTrain = (id, train) => {
        const currentStop = train.stops.find((e) => e.stationID === station.uuid);

        if (!stationData[stationID].trains[id]) {
            stationData[stationID].trains[id] = {
                arrived: false,
                departed: false,
            };
        }

        const isPassThrough = currentStop.layover === 0;
        const arrivalMinutes = Math.floor((globalTime - currentStop.arrival) / 1000 / 60);
        const departureMinutes = Math.floor((globalTime - currentStop.departure) / 1000 / 60);

        const arrivalHighlight = stationData[stationID].trains[id].arrived ? null :
            arrivalMinutes >= 0 ? 'now' :
            arrivalMinutes >= -3 ? 'approaching' : null;
        const departureHighlight = currentStop.layover === 0 ? arrivalHighlight :
            (departureMinutes === 0 || (!stationData[stationID].trains[id].departed && departureMinutes > 0)) ? 'now' :
            stationData[stationID].trains[id].departed ? null :
            departureMinutes >= -3 ? 'approaching' : null;

        const row = document.createElement('tr');
        row.classList.add('train');
        row.dataset.id = id;

        const trainID = document.createElement('td');
        trainID.innerText = id;

        if (arrivalHighlight === 'now' || departureHighlight === 'now') {
            trainID.classList.add('now');
        } else if (arrivalHighlight === 'approaching' || departureHighlight === 'approaching') {
            trainID.classList.add('approaching');
        }

        row.appendChild(trainID);

        const trainType = document.createElement('td');
        
        const trainTypeNames = {
            "COMMUTER": "COM",
            "IC": "IC",
            "FREIGHT": "FR",
        };
        const trainTypeText = document.createElement('span');
        trainTypeText.innerText = trainTypeNames[train.trainType] || train.trainType;
        trainType.appendChild(trainTypeText);

        const trainMaxSpeed = document.createElement('span');
        trainMaxSpeed.innerText = `${train.maxSpeed} km/h`;
        trainType.appendChild(trainMaxSpeed);

        const trainComposition = document.createElement('small');
        const composition = train.composition.length <= 14 ? train.composition: 
            train.composition.slice(0, 4) + '..' + train.composition.length + '..' + train.composition.slice(-4);
        trainComposition.innerText = composition;
        trainType.appendChild(trainComposition);

        row.appendChild(trainType);

        const arrivalTime = document.createElement('td');
        if (arrivalHighlight) {
            arrivalTime.classList.add(arrivalHighlight);
        }
        
        const arrivalConfirmed = document.createElement('input');
        arrivalConfirmed.type = 'checkbox';
        arrivalConfirmed.checked = !!stationData[station.uuid].trains[id].arrived;
        arrivalConfirmed.addEventListener('change', (e) => {
            // TODO: Place timestamp in train data
            stationData[station.uuid].trains[id].arrived = e.target.checked ? globalTime : false;
            updateTimetable(station.uuid)
        });
        arrivalTime.appendChild(arrivalConfirmed);

        const plannedArrivalTime = document.createElement('span');
        plannedArrivalTime.innerText = displayTime(currentStop.arrival);
        arrivalTime.appendChild(plannedArrivalTime);

        if (stationData[station.uuid].trains[id].arrived) {
            const actualArrivalTime = document.createElement('span');
            actualArrivalTime.innerText = `(${displayTime(stationData[station.uuid].trains[id].arrived)})`;
            arrivalTime.appendChild(actualArrivalTime);

            // const delay = document.createElement('span');
            // const delayMinutes = Math.floor((stationData[station.uuid].trains[id].arrived - currentStop.arrival) / 1000 / 60);
            // delay.innerText = delayMinutes > 0 ? `+${delayMinutes} min` : `${delayMinutes} min`;
            // arrivalTime.appendChild(delay);
        } else {
            const delay = document.createElement('span');
            delay.innerText = arrivalMinutes > 0 ? `+${arrivalMinutes} min` : `${arrivalMinutes} min`;
            arrivalTime.appendChild(delay);
        }

        row.appendChild(arrivalTime);

        const from = document.createElement('td');

        const previousStopIdx = train.stops.findIndex((e) => e.stationID === station.uuid) - 1;
        const previousStopUuid = train.stops[previousStopIdx]?.stationID;
        const previousStopName = levelContent['stations']['stations'].find(e => e.uuid === previousStopUuid)?.name;
        const previousStop = document.createElement('span');
        previousStop.innerText = previousStopName ?? '(incoming)';
        from.appendChild(previousStop);

        if (previousStopIdx >= 1) {
            const firstStopName = levelContent['stations']['stations'].find(e => e.uuid === train.stops[0].stationID)?.name;
            const firstStop = document.createElement('span');
            firstStop.innerText = firstStopName;
            from.appendChild(firstStop);
        }

        row.appendChild(from);

        const stopInfo = document.createElement('td');


        const stopDuration = document.createElement('span');
        stopDuration.innerText = isPassThrough ? '(pass-through)' : `${currentStop.layover} min`;
        stopInfo.appendChild(stopDuration);

        const stopPlatform = document.createElement('span');
        stopPlatform.innerText = `#${currentStop.platform}`;
        stopInfo.appendChild(stopPlatform);

        row.appendChild(stopInfo);
        
        const departureTime = document.createElement('td');
        if (departureHighlight) {
            departureTime.classList.add(departureHighlight);
        }

        if (!isPassThrough) {
            const departureConfirmed = document.createElement('input');
            departureConfirmed.type = 'checkbox';
            departureConfirmed.checked = !!stationData[station.uuid].trains[id].departed;
            departureConfirmed.addEventListener('change', (e) => {
                stationData[station.uuid].trains[id].departed = e.target.checked ? globalTime : false;
                updateTimetable(station.uuid)
            });
            departureTime.appendChild(departureConfirmed);
        }

        const plannedDepartureTime = document.createElement('span');
        plannedDepartureTime.innerText = displayTime(currentStop.departure);
        departureTime.appendChild(plannedDepartureTime);

        if (isPassThrough) {
            if (stationData[station.uuid].trains[id].arrived) {
                const actualDepartureTime = document.createElement('span');
                actualDepartureTime.innerText = `(${displayTime(stationData[station.uuid].trains[id].arrived)})`;
                departureTime.appendChild(actualDepartureTime);
            }
        } else {
            if (stationData[station.uuid].trains[id].departed) {
                const actualDepartureTime = document.createElement('span');
                actualDepartureTime.innerText = `(${displayTime(stationData[station.uuid].trains[id].departed)})`;
                departureTime.appendChild(actualDepartureTime);

                // const delay = document.createElement('span');
                // const delayMinutes = Math.floor((stationData[station.uuid].trains[id].departed - currentStop.departure) / 1000 / 60);
                // delay.innerText = delayMinutes > 0 ? `+${delayMinutes} min` : `${delayMinutes} min`;
                // departureTime.appendChild(delay);
            } else {
                const delay = document.createElement('span');
                delay.innerText = departureMinutes > 0 ? `+${departureMinutes} min` : `${departureMinutes} min`;
                departureTime.appendChild(delay);
            }
        }

        row.appendChild(departureTime);

        const to = document.createElement('td');
        const nextStopIdx = train.stops.findIndex((e) => e.stationID === station.uuid) + 1;
        const nextStopUuid = train.stops[nextStopIdx]?.stationID;
        const nextStopName = levelContent['stations']['stations'].find(e => e.uuid === nextStopUuid)?.name;
        const nextStop = document.createElement('span');
        nextStop.innerText = nextStopName ?? '(outgoing)';
        to.appendChild(nextStop);

        if (nextStopIdx < train.stops.length - 1) {
            const lastStopName = levelContent['stations']['stations'].find(e => e.uuid === train.stops[train.stops.length - 1].stationID)?.name;
            const lastStop = document.createElement('span');
            lastStop.innerText = lastStopName;
            to.appendChild(lastStop);
        }

        row.appendChild(to);

        timetableElement.appendChild(row);
    }

    for (const [id, train] of trains) {

        addTrain(id, train);
    }
}

export function resetTimetable() {
    stationData = {};
}

export function parseTime(timeString) {
    const [hours, minutes, seconds] = timeString.split(':');
    const time = new Date(0);
    time.setUTCHours(hours ?? 0);
    time.setUTCMinutes(minutes ?? 0);
    time.setUTCSeconds(seconds ?? 0);
    return time;
}

export function displayTime(time, precision = 'minutes') {
    return time.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: precision === 'seconds' ? '2-digit' : undefined, timeZone: 'UTC' });
}

export function tick() {
    if (!isPaused()) {
        const lastTickMinutes = globalTime?.getUTCMinutes();

        const time = Date.now();
        const difference = lastTick ? time - lastTick : 0;
        lastTick = time;
        globalTime = new Date(globalTime.getTime() + difference);

        const currentTickMinutes = globalTime.getUTCMinutes();

        for (const [stationUuid, _station] of Object.entries(stationData)) {
            updateTimetable(stationUuid, currentTickMinutes !== lastTickMinutes);
        }
    } else if (!lastTick && globalTime.getTime() === syncTime().getTime()) {
        return;
    } else {
        globalTime = syncTime();

        if (lastTick) {
            lastTick = undefined;

            for (const [stationUuid, _station] of Object.entries(stationData)) {
                updateTimetable(stationUuid, true);
            }
        }
    }
    
    const timePauseButton = document.querySelector('#time > button');
    if (isPaused() && timePauseButton.innerText === 'Pause') {
        timePauseButton.innerText = 'Resume';
    } else if (!isPaused() && timePauseButton.innerText !== 'Pause') {
        timePauseButton.innerText = 'Pause';
    }

    const timeDisplay = document.querySelector('#time > span');
    if (timeDisplay.innerText !== displayTime(globalTime, 'seconds')) {
        setSyncTime(globalTime);
        timeDisplay.innerText = displayTime(globalTime, 'seconds');
    }

    if (isPaused()) {
        timeDisplay.contentEditable = true;
    } else {
        timeDisplay.contentEditable = false;
    }
}
