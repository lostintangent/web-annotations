// The background script that manages the annotation storage, communicates with the popup, and enables the record mode.

// A variable to store the annotations as an array of objects with the following properties:
// url: the URL of the web page where the annotation was made
// text: the text content of the annotation
// selector: the CSS selector of the element that the annotation refers to
// color: the color of the annotation
let annotations = [];

// A variable to store the record mode status as a boolean
let recordMode = false;

// A variable to store the hover color as a string
let hoverColor = "blue"; // default value

// A function to save the annotations to the local storage
function saveAnnotations() {
  chrome.storage.local.set({annotations: annotations}, function() {
    console.log("Annotations saved.");
  });
}

// A function to load the annotations from the local storage
function loadAnnotations() {
  chrome.storage.local.get("annotations", function(result) {
    if (result.annotations) {
      annotations = result.annotations;
      console.log("Annotations loaded.");
    }
  });
}

// A function to save the hover color to the local storage
function saveHoverColor() {
  chrome.storage.local.set({hoverColor: hoverColor}, function() {
    console.log("Hover color saved.");
  });
}

// A function to load the hover color from the local storage
function loadHoverColor() {
  chrome.storage.local.get("hoverColor", function(result) {
    if (result.hoverColor) {
      hoverColor = result.hoverColor;
      console.log("Hover color loaded.");
    }
  });
}

// A function to send the annotations to the content script of the current tab
function sendAnnotations() {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {type: "annotations", data: annotations});
  });
}

// A function to send the hover color to the content script of the current tab
function sendHoverColor() {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {type: "hoverColor", data: hoverColor});
  });
}

// A function to toggle the record mode and send the status to the content script of the current tab
function toggleRecordMode() {
  recordMode = !recordMode;
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {type: "recordMode", data: recordMode});
  });
}

// A function to export the annotations as a JSON file
function exportAnnotations() {
  let blob = new Blob([JSON.stringify(annotations)], {type: "application/json"});
  let url = URL.createObjectURL(blob);
  chrome.downloads.download({url: url, filename: "annotations.json"});
}

// A function to import the annotations from a JSON file
function importAnnotations(file) {
  let reader = new FileReader();
  reader.onload = function(e) {
    try {
      let data = JSON.parse(e.target.result);
      if (Array.isArray(data) && data.every(item => item.url && item.text && item.selector && item.color)) {
        annotations = data;
        saveAnnotations();
        sendAnnotations();
      } else {
        throw new Error("Invalid JSON format.");
      }
    } catch (error) {
      console.error(error);
    }
  };
  reader.readAsText(file);
}

// Load the annotations and the hover color when the background script is loaded
loadAnnotations();
loadHoverColor();

// Listen for messages from the popup or the content scripts
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  switch (message.type) {
    case "getAnnotations":
      // The popup requests the annotations
      sendResponse(annotations);
      break;
    case "getRecordMode":
      // The popup requests the record mode status
      sendResponse(recordMode);
      break;
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
      annotations.push(message.data);
      saveAnnotations();
      sendHoverColor(); // send the hover color after adding an annotation
      break;
    case "removeAnnotation":
      // The content script removes an annotation
      annotations = annotations.filter(item => item !== message.data);
      saveAnnotations();
      sendHoverColor(); // send the hover color after removing an annotation
      break;
    case "editAnnotation":
      // The content script edits an annotation
      let index = annotations.indexOf(message.data.old);
      if (index !== -1) {
        annotations[index] = message.data.new;
        saveAnnotations();
        sendHoverColor(); // send the hover color after editing an annotation
      }
      break;
    case "getHoverColor":
      // The popup requests the hover color
      sendResponse(hoverColor);
      break;
    case "setHoverColor":
      // The popup sets the hover color
      hoverColor = message.data;
      saveHoverColor();
      sendHoverColor();
      break;
  }
});
