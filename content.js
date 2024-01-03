// The content script that manages displaying and editing the annotations on the web page, and also enables the record mode.

// A variable to store the annotations as an array of objects with the same properties as in the background script
let annotations = [];

// A variable to store the record mode status as a boolean
let recordMode = false;

// A variable to store the hover color as a string
let hoverColor = "blue"; // default value

// A variable to store the currently hovered element
let hoveredElement = null;

// A function to create a span element for each annotation
function createSpan(annotation) {
  let span = document.createElement("span");
  span.className = "annotation-span";
  span.style.backgroundColor = hoverColor;
  span.style.position = "absolute";
  span.style.zIndex = "9999";
  span.style.padding = "5px";
  span.style.borderRadius = "5px";
  span.textContent = annotation.text;
  span.dataset.url = annotation.url;
  span.dataset.selector = annotation.selector;
  span.dataset.color = hoverColor;
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
  // Add an event listener for the mouseenter event on the span element
  span.addEventListener("mouseenter", function() {
    // Call the highlightElement function with the element that the annotation refers to and the hover color as arguments
    let element = document.querySelector(annotation.selector);
    if (element) {
      highlightElement(element, hoverColor);
    }
  });
  // Add an event listener for the mouseleave event on the span element
  span.addEventListener("mouseleave", function() {
    // Call the unhighlightElement function with the element that the annotation refers to as an argument
    let element = document.querySelector(annotation.selector);
    if (element) {
      unhighlightElement(element);
    }
  });
  return span;
}

const ANNOTATION_MARGIN = 5;
function positionSpan(span, element) {
  const rect = element.getBoundingClientRect();
  const leftPosition = rect.left + window.scrollX;

  const availableSpace = rect.top - span.offsetHeight + ANNOTATION_MARGIN;
  let topPosition;
  if (availableSpace > 0) {
    topPosition = rect.top - span.offsetHeight - ANNOTATION_MARGIN;
  } else {
    topPosition = rect.bottom + ANNOTATION_MARGIN;
  }

  span.style.top = `${topPosition}px`;
  span.style.left = `${leftPosition}px`;
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
    e.preventDefault();
    // Remove the outline from the hovered element
    if (hoveredElement) {
      hoveredElement.style.outline = "";
      hoveredElement = null;
    }
    let text = prompt("Enter the annotation text:");
    if (text) {
      const selector = getCssSelector(e.target)
          let annotation = {
            text,
            url: window.location.href,
            selector
          };
          // Send a message to the background script to add the annotation
          chrome.runtime.sendMessage({type: "addAnnotation", data: annotation});
          annotations.push(message.data); // update the annotations array
          displayAnnotations(); 
    }
  }
}

// A function to handle the record mode hover
function handleRecordModeHover(e) {
  // If the record mode is enabled and the user hovers over an element, show a rectangle around the element with the selected hover color
  if (recordMode) {
    // If the hovered element is different from the previous one, remove the outline from the previous element and add an outline with the hover color to the hovered element
    if (e.target !== hoveredElement) {
      if (hoveredElement) {
        hoveredElement.style.outline = "";
      }
      e.target.style.outline = "5px solid " + hoverColor; // use the hover color variable instead of the hardcoded value "blue"
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
  if (element.classList) {
    for (let className of element.classList) {
      const matches = document.querySelectorAll("." + className);
      if (matches && matches.length === 1) {
        return "." + className;
      }
    }
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

// A function to highlight an element with a given color
function highlightElement(element, color) {
  // Set the element's outline to a 5px solid border with the given color
  element.style.outline = "5px solid " + color;
}

// A function to unhighlight an element
function unhighlightElement(element) {
  // Remove the element's outline
  element.style.outline = "";
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
      if (recordMode && !message.data && hoveredElement) {
        hoveredElement.style.outline = "";
        hoveredElement = null;
      }

      // The background script sends the record mode status
      recordMode = message.data;
      
      break;
    case "hoverColor":
      // The background script sends the hover color
      hoverColor = message.data;
      break;
  }
});
