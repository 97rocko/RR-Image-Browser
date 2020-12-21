const { electron, app, ipcRenderer } = require('electron');
const axios = require('axios');
const fs = require('fs');
const Path = require('path');
//var request = require('request');
const { shell } = require('electron');
//const sleep = require('util').promisify(setTimeout);
// Electron-Store for saving preferences
var userAccountId = 0;

//var filePath = app.getPath("userData");
var INDEVELOPMENTMODE = true;
//var filePath = 'C:/RNC/';
//var appDataPath = './appData/';
//var dataCache = 'cache/';

//let photoSync = require('../appdata/photosync/ImageSyncData.json');
var inProgress = false;
var USER_ID = 0;
var PAGE_NUM = 0;

const version = document.getElementById('versionNumber');    
ipcRenderer.send('app_version');
ipcRenderer.on('app_version', (event, arg) => {
  ipcRenderer.removeAllListeners('app_version');
  version.innerText = 'V' + arg.version;
});

const notification = document.getElementById('notification');
const message = document.getElementById('message');
const restartButton = document.getElementById('restart-button');

ipcRenderer.on('update_available', () => {
  console.log('update available');
  ipcRenderer.removeAllListeners('update_available');
  message.innerText = 'A new update is available. Downloading now...';
  notification.classList.remove('hidden');
});

ipcRenderer.on('update_downloaded', () => {
  console.log('update downloaded');
  ipcRenderer.removeAllListeners('update_downloaded');
  message.innerText = 'Update Downloaded. It will be installed on restart. Restart now?';
  restartButton.classList.remove('hidden');
  notification.classList.remove('hidden');
});

function closeNotification() {
    notification.classList.add('hidden');
}

function restartApp() {
    ipcRenderer.send('restart_app');
}

// https://api.rec.net/roomserver/rooms/bulk?Id=12028058
async function getRoomInfo(roomId) {
    var url = 'https://api.rec.net/roomserver/rooms/bulk?Id=' + roomId;

    return new Promise(function (resolve, reject) {

        // https://accounts.rec.net/account?username=rocko
        axios.get(url)
            .then(function (response) {
                // handle success
                resolve(response.data);
            })
            .catch(function (error) {
                // handle error
                console.log(error);
                reject(error);
            })
            .then(function () {
                // always executed
            });
    });
}

// https://accounts.rec.net/account/bulk
// Form Data = ID Array
async function getUsernameFromId(arrayOfUserIds) {
    var url = 'https://accounts.rec.net/account/bulk';

    return new Promise(function (resolve, reject) {

        // https://accounts.rec.net/account?username=rocko
        axios.get(url)
            .then(function (response) {
                // handle success
                //return response.data.accountId;
                resolve(response.data.accountId);
            })
            .catch(function (error) {
                // handle error
                console.log(error);
                reject(error);
            })
            .then(function () {
                // always executed
            });
    });
}

// Function takes in a RecNet Display name and converts it to a RecNet user ID.
async function getUserId(recNetDisplayName) {
    var url = 'https://accounts.rec.net/account?username=' + recNetDisplayName;

    return new Promise(function (resolve, reject) {

        // https://accounts.rec.net/account?username=rocko
        axios.get(url)
            .then(function (response) {
                // handle success
                //console.log('Successfully retrieved USER_ID (' + response.data.accountId + ') for user ' + recNetDisplayName);
                //return response.data.accountId;
                resolve(response.data.accountId);
            })
            .catch(function (error) {
                // handle error
                console.log(error);
                reject(error);
            })
            .then(function () {
                // always executed
            });
    });
}

// Function takes a userID and returns back a user's entire public photo library
async function getUserPublicPhotoLibrary(userId) {
    var url = 'https://api.rec.net/api/images/v4/player/' + userId + '?skip=0&take=50000'

        return new Promise(function (resolve, reject) {

            // https://accounts.rec.net/account?username=rocko
            axios.get(url)
                .then(function (response) {
                    // handle success
                    //console.log('Successfully retreived photos for USER_ID: '+ userId + ' Count: ' + response.data.length);
                    //return response.data.accountId;
                    resolve(response.data);
                })
                .catch(function (error) {
                    // handle error
                    console.log(error);
                    reject(error);
                })
                .then(function () {
                    // always executed
                });
        })
}

// function takes in a imageName and returns the image associated
// returns image data (separate function for downloading)
async function getImageData(imageName) {
    var IMAGE_URL = 'https://img.rec.net/' + imageName;

    // 'https://api.rec.net/api/images/v4/player/PLAYER_ID?skip=0&take=50000'
    axios.get(IMAGE_URL)
        .then(function (response) {
            // handle success
            console.log('Successfully retreived image from image database.');
            return response.data;
        })
        .catch(function (error) {
            // handle error
            console.log(error);
        })
        .then(function () {
            // always executed
        });
}


// Writes JSON data to a specific users folder based on the user's RR ID.
function writeJsonFileToFolder(path, fileData, fileName, userId) {
    let data = JSON.stringify(fileData);
    var filePath = path + userId;
    if (!fs.existsSync(filePath)) {
        console.log("Creating cache folder for user: " + userId + ".");
        fs.mkdirSync(filePath);
    }
    fs.writeFileSync(filePath + '/' + fileName, data);
    // Update last sync time
}

//swap all functions to be generic and re useable

// redo feed API function to be more generic

//======================================================================
// Image Download above
//======================================================================
// New sorting code for rendering images on the page

// async function syncUserPhotoLibrary() {
//     console.log("Running Sync...");
//     var username = document.getElementById("txtUsername").value;
//     var userId = await getUserId(username);
//     var userPhotoLibrary = await getUserPublicPhotoLibrary(userId);

//     writeJsonFileToFolder(appDataPath + dataCache, userPhotoLibrary,'publicImageLibrary.json', userId);

//     console.log('Username: ' + username);
    
//     //console.log('User ID: ' + userId);
//     document.getElementById("userId").innerHTML = userId;

//     //console.log('User Photo Library Size: ' + userPhotoLibrary.length);
//     document.getElementById("totalPhotos").innerHTML = userPhotoLibrary.length;

//     //organizePhotosForDownload(userPhotoLibrary);
//     readPhotoSyncJson(true, await userId);
// }

function toggleButtonOldestNewest() {
    var button = document.getElementById("btnOldestToNewest");
    
    if (button) {
        if (button.value === "1") {
            button.value = "0";
            button.innerText = "Newest to Oldest";
        } else {
            button.value = "1";
            button.innerText = "Oldest to Newest";
        }
    }
}

async function loadImagesOntoPage() {
    var username = document.getElementById("txtUsername").value;
    var imageDiv = document.getElementById("grid");
    if (username === "") {
        while(imageDiv.firstChild) { 
            imageDiv.removeChild(imageDiv.firstChild); 
        } 
        return;
    }

    var userId = await getUserId(username);
    var userPhotoLibrary = await getUserPublicPhotoLibrary(userId);
    //document.getElementById("userId").innerHTML = userId;
    //document.getElementById("totalPhotos").innerHTML = userPhotoLibrary.length;
    var dateOrder = document.getElementById("btnOldestToNewest");
    //console.log("normal");
    //console.log(userPhotoLibrary);
    //console.log(dateOrder.value);


    if (dateOrder.value == "1") { // Oldest to Newest
        userPhotoLibrary = userPhotoLibrary.reverse();
        //console.log("Reversed");
        //console.log(userPhotoLibrary);
    }

    while(imageDiv.firstChild) { 
        imageDiv.removeChild(imageDiv.firstChild); 
    } 

    // Generate image HTML
    loadImagesIntoPage(userPhotoLibrary);
}

function loadImagesIntoPage(userPhotoLibrary) {
    var imageDiv = document.getElementById("grid");
    while (imageDiv.firstChild) {
        imageDiv.removeChild(imageDiv.firstChild);
    }

    // Generate image HTML
    var i = 0;
    for (i = 0; i < userPhotoLibrary.length; i++) {
        var img = document.createElement("img");
        var imageUrl = 'https://img.rec.net/' + userPhotoLibrary[i].ImageName + '?width=500';
        img.setAttribute('data-src', imageUrl);
        img.classList.add("grid-image");
        //img.src = "";

        var divGridItem = document.createElement("div");
        divGridItem.classList.add("grid-item");
        divGridItem.setAttribute('type', 'button');
        divGridItem.setAttribute('data-toggle', 'modal');
        divGridItem.setAttribute('data-target', '#imageDetailModal');
        divGridItem.setAttribute('onclick', 'loadDataImageDetailModal(' + userPhotoLibrary[i].Id + '); return false;');
        divGridItem.appendChild(img);

        var pImageLink = document.createElement("p");
        pImageLink.classList.add("imageLink");
        pImageLink.innerText = "https://rec.net/image/" + userPhotoLibrary[i].Id;
        divGridItem.appendChild(pImageLink);

        var src = document.getElementById("grid");
        src.appendChild(divGridItem); // append Div
    }

    const targets = document.querySelectorAll('img');

    const lazyLoad = target => {
        let observer = {
            threshold: 1
        }
        const io = new IntersectionObserver((entries, observer) => {

            entries.forEach(entry => {

                if (entry.isIntersecting) {
                    const img = entry.target;
                    const src = img.getAttribute('data-src');

                    if (img.hasAttribute('data-src')){
                        img.setAttribute('src', src);
                    }
                    observer.disconnect();
                }
            });
        });
        io.observe(target);
    };
    targets.forEach(lazyLoad);
};


function openRecNetExternalLink(url){
    shell.openExternal(url);
}

function clearImageSource() { // TODO figure out how to keep the image size so it doesnt jump up when the image loads in
    var modalDisplayImage = document.getElementById("imageDisplay");
    if (modalDisplayImage) {
        modalDisplayImage.src = "";
    }
}


async function loadDataImageDetailModal(imageId) {
    // Modal Elements
    const LOADING_TEXT = "Loading...";
    var modalDisplayImage = document.getElementById("imageDisplay");
    modalDisplayImage.src = ""; // Clear out image source so the old image is not there still

    var modalImageId = document.getElementById("imageId");
    modalImageId.innerText = LOADING_TEXT;

    // Activity Name
    var modalImageActivityName = document.getElementById("imageActivity");
    modalImageActivityName.innerText = LOADING_TEXT;

    // Event Name
    var modalImageEventName = document.getElementById("imageEvent");
    modalImageEventName.innerText = LOADING_TEXT;

    var modalImageCheerCount = document.getElementById("imageCheerCount");
    imageCheerCount.innerText = LOADING_TEXT;

    var modalImageCommentCount = document.getElementById("imageCommentCount");
    modalImageCommentCount.innerText = LOADING_TEXT;
    
    var username = document.getElementById("txtUsername").value; // This could be re written to not pull data if it is already available
    var userId = await getUserId(username);
    var userPhotoLibrary = await getUserPublicPhotoLibrary(userId);
    var imageData = {};
    var i = 0;
    for (i = 0; i < userPhotoLibrary.length; i++) {
        if (userPhotoLibrary[i].Id === imageId) {
            imageData = userPhotoLibrary[i];
            break;
        }
    };

    console.log(imageData);
    var roomData = await getRoomInfo(imageData.RoomId);
    console.log(roomData);

    // Image Display
    if (modalDisplayImage) {
        var imageUrl = 'https://img.rec.net/' + imageData.ImageName;
        console.log(imageUrl);
        modalDisplayImage.src = imageUrl;
    }

    // Image ID
    if (modalImageId) {
        var szImageId = imageData.Id;
        modalImageId.innerText = szImageId;
    }

    // Activity Name
    if (modalImageActivityName) {
        if (roomData.length >= 1) {
            var szActivityName = roomData[0].Name;
            modalImageActivityName.innerText = szActivityName;
        } else {
            modalImageActivityName.innerText = "Unavailable, room is not public."
        }
    }

    // Event Name
    if (modalImageEventName) {
        var szEventName = imageData.PlayerEventId;
        modalImageCheerCount.innerText = szCheerCount;
    }

    // Cheer Count
    if (modalImageCheerCount) {
        var szCheerCount = imageData.CheerCount;
        modalImageCheerCount.innerText = szCheerCount;
    }

    // Comment Count
    if (modalImageCommentCount) {
        var szCommentCount = imageData.CommentCount;
        modalImageCommentCount.innerText = szCommentCount;
    }
}


// Function for each filter that takes in a JSON object and returns out a JSON sorted object

// Room Info
// https://api.rec.net/roomserver/rooms/bulk?Id=9515154

// Image Comments
//https://api.rec.net//api/images/v1/44549961/comments

// Sorts

// Sort Images by Date
//  sortByDate = 1
//  sortByPlayerNumber = 2
//  sortByCommentAmount = 3
//  sortByCheerAmount = 4
// function sortPhotosBy (photoLibaray, sortType, mostNewestFirst) {

// }

// Searches