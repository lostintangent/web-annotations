// The content script that manages displaying and editing the annotations on the web page, and also enables the record mode.

// A variable to store the annotations as an array of objects with the same properties as in the background script
let annotations = [];

// A variable to store the record mode status as a boolean
let recordMode = false;

// A variable to store the color palette as an array of strings
let colors = ["red", "green", "blue", "yellow", "pink", "cyan"];

// A variable to store the currently hovered element
let hoveredElement = null;

// A function to create a span element for each annotation
function createSpan(annotation) {
  let span = document.createElement("span");
  span.className = "annotation-span";
  span.style.backgroundColor = annotation.color;
  span.style.position = "absolute";
  span.style.zIndex = "9999";
  span.style.padding = "5px";
  span.style.borderRadius = "5px";
  span.textContent = annotation.text;
  span.dataset.url = annotation.url;
  span.dataset.selector = annotation.selector;
  span.dataset.color = annotation.color;
  span.addEventListener("click", function(e) {
    // When the user clicks on an annotation, show a tooltip with options to edit or remove the annotation
    e.stopPropagation();
    let tooltip = document.createElement("div");
    tooltip.className = "annotation-tooltip";
    tooltip.style.left = e.pageX + "px";
    tooltip.style.top = e.pageY + "px";
    let editOption = document.createElement("div");
    editOption.className = "annotation-tooltip-option";
    editOption.textContent = "Edit";
    editOption.addEventListener("click", function() {
      // When the user clicks on the edit option, show a prompt to edit the annotation text
      let newText = prompt("Edit the annotation text:", annotation.text);
      if (newText && newText !== annotation.text) {
        // If the user enters a new text, send a message to the background script to edit the annotation
        chrome.runtime.sendMessage({type: "editAnnotation", data: {old: annotation, new: {...annotation, text: newText}}});
        // Update the span text
        span.textContent = newText;
      }
      // Remove the tooltip
      tooltip.remove();
    });
    let removeOption = document.createElement("div");
    removeOption.className = "annotation-tooltip-option";
    removeOption.textContent = "Remove";
    removeOption.addEventListener("click", function() {
      // When the user clicks on the remove option, send a message to the background script to remove the annotation
      chrome.runtime.sendMessage({type: "removeAnnotation", data: annotation});
      // Remove the span
      span.remove();
      // Remove the tooltip
      tooltip.remove();
    });
    tooltip.append(editOption, removeOption);
    document.body.append(tooltip);
    // Remove the tooltip when the user clicks anywhere else
    document.addEventListener("click", function handler() {
      tooltip.remove();
      document.removeEventListener("click", handler);
    });
  });
  return span;
}

// A function to position the span element relative to the element that the annotation refers to
function positionSpan(span, element) {
  let rect = element.getBoundingClientRect();
  span.style.left = rect.left + window.scrollX + "px";
  span.style.top = rect.top + window.scrollY - span.offsetHeight - 5 + "px";
}

// A function to display the annotations on the web page
function displayAnnotations() {
  // Remove any existing spans
  let existingSpans = document.querySelectorAll(".annotation-span");
  for (let span of existingSpans) {
    span.remove();
  }
  // Create and append a new span for each annotation that matches the current URL
  for (let annotation of annotations) {
    if (annotation.url === window.location.href) {
      let element = document.querySelector(annotation.selector);
      if (element) {
        let span = createSpan(annotation);
        document.body.append(span);
        positionSpan(span, element);
        // Reposition the span when the window is resized or scrolled
        window.addEventListener("resize", function() {
          positionSpan(span, element);
        });
        window.addEventListener("scroll", function() {
          positionSpan(span, element);
        });
      }
    }
  }
}

// A function to create a color picker element
function createColorPicker() {
  let colorPicker = document.createElement("div");
  colorPicker.className = "color-picker";
  colorPicker.style.position = "absolute";
  colorPicker.style.zIndex = "9999";
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

// A function to handle the record mode click
function handleRecordModeClick(e) {
  // If the record mode is enabled and the user clicks on an element, show a prompt to enter the annotation text
  if (recordMode) {
    e.stopPropagation();
    // Remove the outline from the hovered element
    if (hoveredElement) {
      hoveredElement.style.outline = "";
    }
    let text = prompt("Enter the annotation text:");
    if (text) {
      // If the user enters a text, show a color picker to choose the annotation color
      let colorPicker = createColorPicker();
      colorPicker.style.left = e.pageX + "px";
      colorPicker.style.top = e.pageY + "px";
      document.body.append(colorPicker);
      // Add an event listener to the color picker to handle the color selection
      colorPicker.addEventListener("click", function handler(e) {
        // If the user clicks on a color option, create a new annotation object with the text, color, URL, and selector of the element
        if (e.target.classList.contains("color-option")) {
          let color = e.target.dataset.color;
          let annotation = {
            text: text,
            color: color,
            url: window.location.href,
            selector: getCssSelector(e.target)
          };
          // Send a message to the background script to add the annotation
          chrome.runtime.sendMessage({type: "addAnnotation", data: annotation});
          // Remove the color picker
          colorPicker.remove();
          // Remove the event listener
          colorPicker.removeEventListener("click", handler);
        }
      });
      // Remove the color picker when the user clicks anywhere else
      document.addEventListener("click", function handler() {
        colorPicker.remove();
        document.removeEventListener("click", handler);
      });
    }
  }
}

// A function to handle the record mode hover
function handleRecordModeHover(e) {
  // If the record mode is enabled and the user hovers over an element, show a blue rectangle around the element
  if (recordMode) {
    // If the hovered element is different from the previous one, remove the outline from the previous element and add a blue outline to the hovered element
    if (e.target !== hoveredElement) {
      if (hoveredElement) {
        hoveredElement.style.outline = "";
      }
      e.target.style.outline = "5px solid blue";
      // Update the variable to store the new hovered element
      hoveredElement = e.target;
    }
  }
}

// A function to get the CSS selector of an element
function getCssSelector(element) {
  // If the element has an id, return the id selector
  if (element.id) {
    return "#" + element.id;
  }
  // If the element is the body, return the tag name
  if (element.tagName === "BODY") {
    return "body";
  }
  // Otherwise, get the index of the element among its siblings of the same tag name
  let index = 1;
  let sibling = element.previousElementSibling;
  while (sibling) {
    if (sibling.tagName === element.tagName) {
      index++;
    }
    sibling = sibling.previousElementSibling;
  }
  // Return the selector of the parent element, followed by the tag name and the index in parentheses
  return getCssSelector(element.parentElement) + " > " + element.tagName + ":nth-of-type(" + index + ")";
}

// Add event listeners to the document to handle the record mode click and hover
document.addEventListener("click", handleRecordModeClick);
document.addEventListener("mouseover", handleRecordModeHover);

// Listen for messages from the background script
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  switch (message.type) {
    case "annotations":
      // The background script sends the annotations
      annotations = message.data;
      displayAnnotations();
      break;
    case "recordMode":
      // The background script sends the record mode status
      recordMode = message.data;
      break;
  }
});
