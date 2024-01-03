// The JavaScript file that handles the logic of the popup page, such as adding event listeners to the buttons and sending messages to the background script.

let colors = ["red", "green", "blue", "yellow", "pink", "cyan"];

// A function to create a list item element for each annotation
function createListItem(annotation) {
  let li = document.createElement("li");
  li.className = "annotation-list-item";
  li.style.backgroundColor = annotation.color;
  li.textContent = annotation.text;
  li.dataset.url = annotation.url;
  li.dataset.selector = annotation.selector;
  li.dataset.color = annotation.color;
  li.addEventListener("click", function() {
    // When the user clicks on an annotation, open the web page in a new tab and highlight the element
    chrome.tabs.create({url: annotation.url}, function(tab) {
      chrome.tabs.executeScript(tab.id, {code: `
        let element = document.querySelector('${annotation.selector}');
        if (element) {
          element.scrollIntoView();
          element.style.outline = '5px solid ${annotation.color}';
          setTimeout(function() {
            element.style.outline = '';
          }, 3000);
        }
      `});
    });
  });
  li.addEventListener("contextmenu", function(e) {
    // When the user right-clicks on an annotation, show a context menu with options to edit or remove the annotation
    e.preventDefault();
    let menu = document.createElement("div");
    menu.className = "annotation-context-menu";
    menu.style.left = e.pageX + "px";
    menu.style.top = e.pageY + "px";
    let editOption = document.createElement("div");
    editOption.className = "annotation-context-menu-option";
    editOption.textContent = "Edit";
    editOption.addEventListener("click", function() {
      // When the user clicks on the edit option, show a prompt to edit the annotation text
      let newText = prompt("Edit the annotation text:", annotation.text);
      if (newText && newText !== annotation.text) {
        // If the user enters a new text, send a message to the background script to edit the annotation
        chrome.runtime.sendMessage({type: "editAnnotation", data: {old: annotation, new: {...annotation, text: newText}}});
        // Update the list item text
        li.textContent = newText;
      }
      // Remove the context menu
      menu.remove();
    });
    let removeOption = document.createElement("div");
    removeOption.className = "annotation-context-menu-option";
    removeOption.textContent = "Remove";
    removeOption.addEventListener("click", function() {
      // When the user clicks on the remove option, send a message to the background script to remove the annotation
      chrome.runtime.sendMessage({type: "removeAnnotation", data: annotation});
      // Remove the list item
      li.remove();
      // Remove the context menu
      menu.remove();
    });
    menu.append(editOption, removeOption);
    document.body.append(menu);
    // Remove the context menu when the user clicks anywhere else
    document.addEventListener("click", function handler() {
      menu.remove();
      document.removeEventListener("click", handler);
    });
  });
  return li;
}

// A function to populate the annotation list with the annotations from the background script
function populateAnnotationList(annotations) {
  let ul = document.getElementById("annotation-list-ul");
  // Clear the existing list items
  ul.innerHTML = "";
  // Create and append a new list item for each annotation
  for (let annotation of annotations) {
    let li = createListItem(annotation);
    ul.append(li);
  }
}

// A function to update the record mode checkbox with the record mode status from the background script
function updateRecordModeCheckbox(recordMode) {
  let checkbox = document.getElementById("record-mode-checkbox");
  checkbox.checked = recordMode;
}

// A function to handle the export button click
function handleExportButtonClick() {
  // Send a message to the background script to export the annotations
  chrome.runtime.sendMessage({type: "exportAnnotations"});
}

// A function to handle the import button click
function handleImportButtonClick() {
  // Trigger a click on the hidden file input element
  let fileInput = document.getElementById("import-file");
  fileInput.click();
}

// A function to handle the file input change
function handleFileInputChange() {
  let fileInput = document.getElementById("import-file");
  // If the user selects a file, send a message to the background script to import the annotations
  if (fileInput.files.length > 0) {
    let file = fileInput.files[0];
    chrome.runtime.sendMessage({type: "importAnnotations", data: file});
  }
  // Reset the file input value
  fileInput.value = "";
}

// A function to handle the record mode checkbox change
function handleRecordModeCheckboxChange() {
  // Send a message to the background script to toggle the record mode
  chrome.runtime.sendMessage({type: "toggleRecordMode"});
}

// A function to create a color picker element for the hover rectangle color
function createHoverColorPicker() {
  let colorPicker = document.createElement("div");
  colorPicker.id = "hover-color-picker";
  colorPicker.style.display = "flex";
  colorPicker.style.flexWrap = "wrap";
  colorPicker.style.width = "100px";
  colorPicker.style.border = "1px solid gray";
  colorPicker.style.backgroundColor = "white";
  // Create and append a color option element for each color in the palette
  for (let color of colors) {
    let colorOption = document.createElement("div");
    colorOption.className = "color-option";
    colorOption.style.width = "20px";
    colorOption.style.height = "20px";
    colorOption.style.backgroundColor = color;
    colorOption.dataset.color = color;
    colorPicker.append(colorOption);
  }
  return colorPicker;
}

// A function to handle the hover color change
function handleHoverColorChange(color) {
  // Send a message to the background script to set the hover color
  chrome.runtime.sendMessage({type: "setHoverColor", data: color});
}

// A function to update the hover color picker with the selected color
function updateHoverColorPicker(color) {
  let colorPicker = document.getElementById("hover-color-picker");
  // Find the color option that matches the color and add the selected class to it
  let colorOption = colorPicker.querySelector(`[data-color="${color}"]`);
  if (colorOption) {
    colorOption.classList.add("selected");
  }
  // Remove the selected class from any other color option
  let otherOptions = colorPicker.querySelectorAll(`[data-color]:not([data-color="${color}"])`);
  for (let option of otherOptions) {
    option.classList.remove("selected");
  }
}

// Add event listeners to the buttons and the checkbox
document.getElementById("export-button").addEventListener("click", handleExportButtonClick);
document.getElementById("import-button").addEventListener("click", handleImportButtonClick);
document.getElementById("import-file").addEventListener("change", handleFileInputChange);
document.getElementById("record-mode-checkbox").addEventListener("change", handleRecordModeCheckboxChange);

// Create and append the hover color picker element
let hoverColorPicker = createHoverColorPicker();
document.getElementById("hover-color").append(hoverColorPicker);

// Add an event listener to the hover color picker to handle the color selection
hoverColorPicker.addEventListener("click", function(e) {
  // If the user clicks on a color option, get the color from the data attribute and call the handleHoverColorChange function
  if (e.target.classList.contains("color-option")) {
    let color = e.target.dataset.color;
    handleHoverColorChange(color);
  }
});

// Request the annotations and the record mode status from the background script
chrome.runtime.sendMessage({type: "getAnnotations"}, populateAnnotationList);
chrome.runtime.sendMessage({type: "getRecordMode"}, updateRecordModeCheckbox);

// Request the hover color from the background script and update the hover color picker accordingly
chrome.runtime.sendMessage({type: "getHoverColor"}, updateHoverColorPicker);
