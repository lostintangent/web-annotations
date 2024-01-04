// The background script that manages the annotation storage, communicates with the popup, and enables the record mode.

// A variable to store the data object containing the annotations, recordMode, and hoverColor variables
let data = null;

// A function to return a promise that resolves with an object containing the annotations, recordMode, and hoverColor variables
function getData() {
  return new Promise((resolve, reject) => {
    // Get the annotations and the hover color from the local storage
    chrome.storage.local.get(["annotations", "hoverColor"], function(result) {
      // Get the record mode from the session storage
      chrome.storage.session.get("recordMode", function(sessionResult) {
        // Create an object with the properties "annotations", "recordMode", and "hoverColor" and resolve the promise with it
        let data = {
          annotations: result.annotations || [],
          recordMode: sessionResult.recordMode || false,
          hoverColor: result.hoverColor || "blue"
        };
        resolve(data);
      });
    });
  });
}

// A function to load the data from the storage and store it in the global variable
function loadData() {
  getData().then(result => {
    data = result;
    console.log("Data loaded.");
  });
}

// A function to save the data to the storage
function saveData() {
  // Save the annotations and the hover color to the local storage
  chrome.storage.local.set({annotations: data.annotations, hoverColor: data.hoverColor}, function() {
    console.log("Annotations and hover color saved.");
  });
  // Save the record mode to the session storage
  chrome.storage.session.set({recordMode: data.recordMode}, function() {
    console.log("Record mode saved.");
  });
}

// A function to send the annotations to the content script of the current tab
function sendAnnotationsToContentScript() {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {type: "annotations", data: data.annotations});
  });
}

// A function to send the hover color to the content script of the current tab
function sendHoverColorToContentScript() {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {type: "hoverColor", data: data.hoverColor});
  });
}

// A function to toggle the record mode and send the status to the content script of the current tab
function toggleRecordMode() {
  data.recordMode = !data.recordMode;
  saveData(); // save the data to the storage
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {type: "recordMode", data: data.recordMode});
  });
}

// A function to export the annotations as a JSON file
function exportAnnotations() {
  let blob = new Blob([JSON.stringify(data.annotations)], {type: "application/json"});
  let url = URL.createObjectURL(blob);
  chrome.downloads.download({url: url, filename: "annotations.json"});
}

// A function to import the annotations from a JSON file
function importAnnotations(file) {
  let reader = new FileReader();
  reader.onload = function(e) {
    try {
      let annotations = JSON.parse(e.target.result);
      if (Array.isArray(annotations) && annotations.every(item => item.url && item.text && item.selector && item.color)) {
        data.annotations = annotations;
        saveData();
        sendAnnotationsToContentScript();
      } else {
        throw new Error("Invalid JSON format.");
      }
    } catch (error) {
      console.error(error);
    }
  };
  reader.readAsText(file);
}

// Load the data when the background script is loaded
loadData();

// Listen for messages from the popup or the content scripts
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  switch (message.type) {
    case "getData":
      // The popup requests the data
      // Wait for the data to be loaded and then send the response
      getData().then(result => {
        data = result;
        sendResponse(data);
      });
      // Return true to indicate that the response will be sent asynchronously
      return true;
    case "toggleRecordMode":
      // The popup toggles the record mode
      toggleRecordMode();
      break;
    case "exportAnnotations":
      // The popup exports the annotations
      exportAnnotations();
      break;
    case "importAnnotations":
      // The popup imports the annotations
      importAnnotations(message.data);
      break;
    case "addAnnotation":
      // The content script adds an annotation
      data.annotations.push(message.data);
      saveData();
      sendHoverColorToContentScript(); // send the hover color after adding an annotation
      break;
    case "removeAnnotation":
      // The content script removes an annotation
      data.annotations = data.annotations.filter(item => item !== message.data);
      saveData();
      sendHoverColorToContentScript(); // send the hover color after removing an annotation
      break;
    case "editAnnotation":
      // The content script edits an annotation
      let index = data.annotations.indexOf(message.data.old);
      if (index !== -1) {
        data.annotations[index] = message.data.new;
        saveData();
        sendHoverColorToContentScript(); // send the hover color after editing an annotation
      }
      break;
    case "setHoverColor":
      // The popup sets the hover color
      data.hoverColor = message.data;
      saveData();
      sendHoverColorToContentScript();
      break;
  }
});

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  data.recordMode = false;
  
  // Check if the tab status is "complete"
  if (changeInfo.status === "complete") {
    console.log("Tab updated: ", tab.url);
    // Get the tab URL and filter the annotations array by the URL
    let url = tab.url;
    let filteredAnnotations = data.annotations.filter(item => item.url === url);
    // Send the filtered annotations to the content script of the updated tab
    chrome.tabs.sendMessage(tabId, {type: "annotations", data: filteredAnnotations});
    // Send the hover color to the content script of the updated tab
    chrome.tabs.sendMessage(tabId, {type: "hoverColor", data: data.hoverColor});
  }
});
