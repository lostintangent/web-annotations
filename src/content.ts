import { Annotation, ChromeMessage } from './types';

let annotations: Annotation[] = [];
let recordMode = false;
let annotationColor = "blue";
let hoveredElement: HTMLElement | null = null;

function createSpan(annotation: Annotation): HTMLSpanElement {
  let span = document.createElement("span");
  span.className = "annotation-span";
  span.style.backgroundColor = annotationColor;
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
    let element = document.querySelector(annotation.selector) as HTMLElement;
    if (element) {
      highlightElement(element, annotationColor);
    }
  });
  
  span.addEventListener("mouseleave", () => {
    editButton.style.display = "none";
    deleteButton.style.display = "none";

    const element = document.querySelector(annotation.selector) as HTMLElement;
    if (element) {
      unhighlightElement(element);
    }
  });

  editButton.addEventListener("click", (e) => {
    e.stopPropagation();
    e.preventDefault();

    const newText = prompt("Edit the annotation text:", annotation.text);
    if (newText && newText !== annotation.text) {
      annotation.text = newText;
      span.firstChild!.textContent = newText;
      chrome.runtime.sendMessage({ type: "editAnnotation", data: { annotation, text: newText }});
    }

    const element = document.querySelector(annotation.selector) as HTMLElement;
    if (element) {
      unhighlightElement(element);
    }
  });

  deleteButton.addEventListener("click", (e) => {
    e.stopPropagation();
    e.preventDefault();

    const element = document.querySelector(annotation.selector) as HTMLElement;
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
function positionSpan(span: HTMLSpanElement, element: HTMLElement): void {
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

function handleRecordModeClick(e: MouseEvent): void {
  if (!recordMode) return;
  e.stopPropagation();
  e.preventDefault();
  
  if (hoveredElement) {
    unhighlightElement(hoveredElement);
  }
  const text = prompt("Enter the annotation text:");
  if (text && e.target instanceof HTMLElement) {
    const selector = getCssSelector(e.target)
    const annotation: Annotation = {
      text,
      url: window.location.href,
      selector,
      date: Date.now()
    };
    annotations.push(annotation);
    displayAnnotations(); 
    chrome.runtime.sendMessage({ type: "addAnnotation", data: annotation });
  }
}

function handleRecordModeHover(e: MouseEvent): void {
  if (!recordMode) return;
  if (hoveredElement && e.target !== hoveredElement) {
    unhighlightElement(hoveredElement);
  }
  if (e.target instanceof HTMLElement) {
    if (e.target.classList.contains("annotation-span")) {
      return;
    }
    highlightElement(e.target, annotationColor);
  }
}

function escapeSelector(str: string): string {
  return str.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}

function getCssSelector(element: HTMLElement): string {
  if (element.id) {
    return `#${escapeSelector(element.id)}`;
  }
  if (element.classList) {
    for (let className of element.classList) {
      const matches = document.querySelectorAll("." + escapeSelector(className));
      if (matches && matches.length === 1) {
        return `.${escapeSelector(className)}`;
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
  return getCssSelector(element.parentElement!) + " > " + element.tagName + ":nth-of-type(" + index + ")";
}

function highlightElement(element: HTMLElement, color: string): void {
  hoveredElement = element;
  element.style.outline = "5px solid " + color;
}

function unhighlightElement(element: HTMLElement): void {
  element.style.outline = "";
}

const MAX_WAIT_TIME = 5000;
async function waitForElement(annotation: Annotation): Promise<HTMLElement> {
  return new Promise((resolve, reject) => {
    let element = document.querySelector<HTMLElement>(annotation.selector);
    if (element) {
      return resolve(element);
    }
  
    const timer = setTimeout(() => {
      reject(`Element not found for annotation: ${annotation.text}`);
    }, MAX_WAIT_TIME);

    const observer = new MutationObserver((mutations, observer) => {
      element = document.querySelector<HTMLElement>(annotation.selector);
      if (element) {
        clearTimeout(timer);
        observer.disconnect();
        resolve(element);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });
}

async function displayAnnotation(annotation: Annotation): Promise<void> {
  try {
    const element = await waitForElement(annotation);
    
    const span = createSpan(annotation);
    document.body.append(span);
    positionSpan(span, element);
    const reposition = () => positionSpan(span, element);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition);
  } catch (e) {
    console.log("Annotation not found: ", annotation);
  }
}

function displayAnnotations(): void {
  const existingSpans = document.querySelectorAll<HTMLElement>(".annotation-span");
  for (let span of existingSpans) {
    span.remove();
  }
  
  annotations.forEach(displayAnnotation);
}

function enumerateAnnotations(handler: (element: Element) => void): void {
  const annnotations = document.querySelectorAll(".annotation-span");
  annnotations.forEach(handler);
}

document.addEventListener("click", handleRecordModeClick, { capture: true });
document.addEventListener("mouseover", handleRecordModeHover, { capture: true });

chrome.runtime.onMessage.addListener(({ type, data }: ChromeMessage) => {
  switch (type) {
    case "init":
      annotations = data.annotations;
      annotationColor = data.annotationColor;
      displayAnnotations();
      break;
    case "recordMode":
      if (recordMode && !data && hoveredElement) {
        hoveredElement.style.outline = "";
        hoveredElement = null;
      }
      recordMode = data;
      break;
    case "annotationColor":
      annotationColor = data;
      if (hoveredElement && recordMode) {
        highlightElement(hoveredElement, annotationColor);
      }
      enumerateAnnotations((annotation) => {
        if (annotation instanceof HTMLElement) {
          annotation.style.backgroundColor = annotationColor;
        }
      });
      break;
    case "clearAnnotations":
      annotations = [];
      enumerateAnnotations((annotation) => annotation.remove());
      break;
  }
});