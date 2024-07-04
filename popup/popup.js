let colors = ["red", "green", "blue", "yellow", "pink", "cyan"];

function createListItem(annotation) {
  let li = document.createElement("li");
  li.className = "annotation-list-item";
  li.style.backgroundColor = annotation.color;
  li.textContent = annotation.text;
  li.dataset.url = annotation.url;
  li.dataset.selector = annotation.selector;
  li.dataset.color = annotation.color;
  li.addEventListener("click", function() {
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
    e.preventDefault();
    let menu = document.createElement("div");
    menu.className = "annotation-context-menu";
    menu.style.left = e.pageX + "px";
    menu.style.top = e.pageY + "px";
    let editOption = document.createElement("div");
    editOption.className = "annotation-context-menu-option";
    editOption.textContent = "Edit";
    editOption.addEventListener("click", function() {
      let newText = prompt("Edit the annotation text:", annotation.text);
      if (newText && newText !== annotation.text) {
        chrome.runtime.sendMessage({type: "editAnnotation", data: {old: annotation, new: {...annotation, text: newText}}});
        li.textContent = newText;
      }
      menu.remove();
    });
    let removeOption = document.createElement("div");
    removeOption.className = "annotation-context-menu-option";
    removeOption.textContent = "Remove";
    removeOption.addEventListener("click", function() {
      chrome.runtime.sendMessage({type: "removeAnnotation", data: annotation});
      li.remove();
      menu.remove();
    });
    menu.append(editOption, removeOption);
    document.body.append(menu);
    document.addEventListener("click", function handler() {
      menu.remove();
      document.removeEventListener("click", handler);
    });
  });

  const dateSpan = document.createElement("span");
  dateSpan.style.color = "grey";
  dateSpan.style.marginLeft = "10px";
  dateSpan.textContent = "(" + formatDate(annotation.date) + ")";
  li.append(dateSpan);

  return li;
}

function formatDate(timestamp) {
  const date = new Date(timestamp);
  let month = date.getMonth() + 1;
  let day = date.getDate();
  let year = date.getFullYear();
  let hours = date.getHours();
  let minutes = date.getMinutes();
  let ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  minutes = minutes < 10 ? "0" + minutes : minutes;
  return month + "/" + day + "/" + year + " " + hours + ":" + minutes + " " + ampm;
}

function populateAnnotationList(annotations) {
  let ul = document.getElementById("annotation-list-ul");
  ul.innerHTML = "";

  annotations.sort((a, b) => b.date - a.date);
  for (let annotation of annotations) {
    let li = createListItem(annotation);
    ul.append(li);
  }
}

function updateRecordModeCheckbox(recordMode) {
  let checkbox = document.getElementById("record-mode-checkbox");
  checkbox.checked = recordMode;
}

function handleExportButtonClick() {
  chrome.runtime.sendMessage({type: "exportAnnotations"});
}

function handleImportButtonClick() {
  let fileInput = document.getElementById("import-file");
  fileInput.click();
}

function handleFileInputChange() {
  let fileInput = document.getElementById("import-file");
  if (fileInput.files.length > 0) {
    let file = fileInput.files[0];
    chrome.runtime.sendMessage({type: "importAnnotations", data: file});
  }
  fileInput.value = "";
}

function handleRecordModeCheckboxChange() {
  chrome.runtime.sendMessage({type: "toggleRecordMode"});
}

function handleClearButtonClick() {
  document.getElementById("annotation-list-ul").innerHTML = "";
  chrome.runtime.sendMessage({ type: "clearAnnotations" });
}

function createAnnotationColorPicker() {
  let colorPicker = document.createElement("div");
  colorPicker.id = "annotation-color-picker";
  colorPicker.style.display = "flex";
  colorPicker.style.flexWrap = "wrap";
  colorPicker.style.width = "100px";
  colorPicker.style.border = "1px solid gray";
  colorPicker.style.backgroundColor = "white";
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

function handleAnnotationColorChange(color) {
  chrome.runtime.sendMessage({type: "setAnnotationColor", data: color});
}

function updateAnnotationColorPicker(color) {
  let colorPicker = document.getElementById("annotation-color-picker");
  let colorOption = colorPicker.querySelector(`[data-color="${color}"]`);
  if (colorOption) {
    colorOption.classList.add("selected");
  }
  let otherOptions = colorPicker.querySelectorAll(`[data-color]:not([data-color="${color}"])`);
  for (let option of otherOptions) {
    option.classList.remove("selected");
  }
}

document.getElementById("export-button").addEventListener("click", handleExportButtonClick);
document.getElementById("import-button").addEventListener("click", handleImportButtonClick);
document.getElementById("import-file").addEventListener("change", handleFileInputChange);
document.getElementById("record-mode-checkbox").addEventListener("change", handleRecordModeCheckboxChange);
document.getElementById("clear-button").addEventListener("click", handleClearButtonClick);

let annotationColorPicker = createAnnotationColorPicker();
document.getElementById("annotation-color").append(annotationColorPicker);

annotationColorPicker.addEventListener("click", function(e) {
  if (e.target.classList.contains("color-option")) {
    let color = e.target.dataset.color;
    updateAnnotationColorPicker(color);
    handleAnnotationColorChange(color);
  }
});

chrome.runtime.sendMessage({ type: "getData" }).then((response) => {
  populateAnnotationList(response.annotations);
  updateRecordModeCheckbox(response.recordMode);
  updateAnnotationColorPicker(response.annotationColor);
});
