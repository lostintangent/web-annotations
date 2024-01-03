// The JavaScript file that handles the logic of the popup page, such as adding event listeners to the buttons and sending messages to the background script.

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

// Add event listeners to the buttons and the checkbox
document.getElementById("export-button").addEventListener("click", handleExportButtonClick);
document.getElementById("import-button").addEventListener("click", handleImportButtonClick);
document.getElementById("import-file").addEventListener("change", handleFileInputChange);
document.getElementById("record-mode-checkbox").addEventListener("change", handleRecordModeCheckboxChange);

// Request the annotations and the record mode status from the background script
chrome.runtime.sendMessage({type: "getAnnotations"}, populateAnnotationList);
chrome.runtime.sendMessage({type: "getRecordMode"}, updateRecordModeCheckbox);
