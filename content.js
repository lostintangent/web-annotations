let annotations = [];
let recordMode = false;
let hoverColor = "blue";

let hoveredElement = null;

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

function handleRecordModeClick(e) {
  if (!recordMode) return;

  e.stopPropagation();
  e.preventDefault();
  
  if (hoveredElement) {
    unhighlightElement(hoveredElement);
  }

  const text = prompt("Enter the annotation text:");
  if (text) {
    const selector = getCssSelector(e.target)
    const annotation = {
      text,
      url: window.location.href,
      selector
    };

    annotations.push(annotation);
    displayAnnotations(); 

    chrome.runtime.sendMessage({ type: "addAnnotation", data: annotation });
  }
}

function handleRecordModeHover(e) {
  if (!recordMode) return;

  if (hoveredElement && e.target !== hoveredElement) {
    unhighlightElement(hoveredElement);
  }

  if (e.target.classList.contains("annotation-span")) {
    return;
  }

  highlightElement(e.target, hoverColor);
}

function getCssSelector(element) {
  if (element.id) {
    return `#${element.id}`;
  }

  if (element.classList) {
    for (let className of element.classList) {
      const matches = document.querySelectorAll("." + className);
      if (matches && matches.length === 1) {
        return `.${className}`;
      }
    }
  }
  if (element.tagName === "BODY") {
    return "body";
  }

  let index = 1;
  let sibling = element.previousElementSibling;
  while (sibling) {
    if (sibling.tagName === element.tagName) {
      index++;
    }
    sibling = sibling.previousElementSibling;
  }
  return getCssSelector(element.parentElement) + " > " + element.tagName + ":nth-of-type(" + index + ")";
}

function highlightElement(element, color) {
  hoveredElement = element;
  element.style.outline = "5px solid " + color;
}

function unhighlightElement(element) {
  element.style.outline = "";
}

document.addEventListener("click", handleRecordModeClick);
document.addEventListener("mouseover", handleRecordModeHover);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    /*
     * Sender = Background script
     */
    case "annotations": // We're being provided with annotations for the current page
      annotations = message.data;
      displayAnnotations();
      break;

    case "recordMode": // The user has toggeled the record mode
      if (recordMode && !message.data && hoveredElement) {
        hoveredElement.style.outline = "";
        hoveredElement = null;
      }
      recordMode = message.data;
      break;

    case "hoverColor": // The user has changed the hover color
      hoverColor = message.data;
      if (hoveredElement && recordMode) {
        highlightElement(hoveredElement, hoverColor);
      }
      if (annotations.length > 0) {
        displayAnnotations();
      }
      break;
  }
});