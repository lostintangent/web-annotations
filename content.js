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
  span.dataset.selector = annotation.selector;

  const editButton = document.createElement("button");
  editButton.textContent = "\u{270F}"; // Pencil emoji
  editButton.style.display = "none";
  editButton.style.marginLeft = "5px";
  editButton.style.cursor = "pointer";
  span.append(editButton);

  const deleteButton = document.createElement("button");
  deleteButton.textContent = "\u{1F5D1}"; // Wastebasket emoji
  deleteButton.style.display = "none";
  deleteButton.style.marginLeft = "5px";
  deleteButton.style.cursor = "pointer";
  span.append(deleteButton);

  span.addEventListener("mouseenter", () => {
    editButton.style.display = "inline-block";
    deleteButton.style.display = "inline-block";
    let element = document.querySelector(annotation.selector);
    if (element) {
      highlightElement(element, hoverColor);
    }
  });
  
  span.addEventListener("mouseleave", () => {
    editButton.style.display = "none";
    deleteButton.style.display = "none";

    const element = document.querySelector(annotation.selector);
    if (element) {
      unhighlightElement(element);
    }
  });

  editButton.addEventListener("click", (e) => {
    e.stopPropagation();
    e.preventDefault();

    const newText = prompt("Edit the annotation text:", annotation.text);
    if (newText && newText !== annotation.text) {
      span.textContent = newText;
      chrome.runtime.sendMessage({ type: "editAnnotation", data: { annotation, text: newText }});
    }

    const element = document.querySelector(annotation.selector);
    if (element) {
      unhighlightElement(element);
    }
  });

  deleteButton.addEventListener("click", (e) => {
    e.stopPropagation();
    e.preventDefault();

    const element = document.querySelector(annotation.selector);
    if (element) {
      unhighlightElement(element);
    }

    annotations = annotations.filter(item => item != annotation);
    span.remove();
    
    chrome.runtime.sendMessage({ type: "removeAnnotation", data: annotation });
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

const MAX_WAIT_TIME = 5000;
async function waitForElement(annotation) {
  return new Promise((resolve, reject) => {
    let element = document.querySelector(annotation.selector);
    if (element) {
      return resolve(element);
    }
  
    const timer = setTimeout(() => {
      reject(`Element not found for annotation: ${annotation.text}`);
    }, MAX_WAIT_TIME);

    // TODO: 
    const observer = new MutationObserver((mutations, observer) => {
      element = document.querySelector(annotation.selector);
        if (element) {
          clearTimeout(timer);
          observer.disconnect();
          resolve(element);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  });
}

async function displayAnnotation(annotation) {
  try {
    const element = await waitForElement(annotation);
    
    const span = createSpan(annotation);
    document.body.append(span);
    positionSpan(span, element);

    const reposition = () => positionSpan(span, element);

    // TODO: Refactor this into a single handler that
    // repositions all active annotations.
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition);
  } catch (e) {
    console.log("Annotation not found: ", annotation);

    // TODO: Show an error about this element in the popup view
  }
}

function displayAnnotations() {
  const existingSpans = document.querySelectorAll(".annotation-span");
  for (let span of existingSpans) {
    span.remove();
  }
  
  annotations.forEach(displayAnnotation);
}

document.addEventListener("click", handleRecordModeClick, { capture: true });
document.addEventListener("mouseover", handleRecordModeHover, { capture: true });

function enumerateAnnotations(handler) {
  const annnotations = document.querySelectorAll(".annotation-span");
  annnotations.forEach(handler);
}

chrome.runtime.onMessage.addListener(({ type, data }) => {
  switch (type) {
    /*
     * Sender = Background script
     */
    case "init": // We're being initialized with annotations and hover color for the current page
      annotations = data.annotations;
      hoverColor = data.hoverColor;
      
      displayAnnotations();
      break;

    case "recordMode": // The user has toggeled the record mode
      if (recordMode && !data && hoveredElement) {
        hoveredElement.style.outline = "";
        hoveredElement = null;
      }

      recordMode = data;
      
      break;

    case "hoverColor": // The user has changed the hover color
      hoverColor = data;

      if (hoveredElement && recordMode) {
        highlightElement(hoveredElement, hoverColor);
      }
      enumerateAnnotations((annotation) => { annotation.style.backgroundColor = hoverColor; });
      break;

    case "clearAnnotations": // The user has cleared the annotations
      annotations = [];

      enumerateAnnotations((annotation) => annotation.remove());
      break;
  }
});
