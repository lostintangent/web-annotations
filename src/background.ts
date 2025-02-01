import { Annotation, AppData, ChromeMessage } from './types';

let data: AppData | null = null;
const injectedTabs = new Set<number>();

async function ensureDataIsLoaded(): Promise<void> {
  if (!data) {
    const { annotations, annotationColor } = await chrome.storage.local.get(["annotations", "annotationColor"]);
    const { recordMode } = await chrome.storage.session.get("recordMode");
    data = {
      annotations: annotations || [],
      recordMode: recordMode || false,
      annotationColor: annotationColor || "blue"
    };
  }
}

async function saveData(): Promise<void> {
  if (!data) return;
  await chrome.storage.local.set({
    annotations: data.annotations,
    annotationColor: data.annotationColor
  });
  await chrome.storage.session.set({ recordMode: data.recordMode });
}

async function injectContentScriptIfNeeded(tabId: number, url: string) {
  if (!url || url.startsWith('chrome://')) return;
  
  await ensureDataIsLoaded();
  if (!data) return;

  const hasAnnotations = data.annotations.some(item => item.url === url);
  const shouldInject = hasAnnotations || data.recordMode;

  if (shouldInject && !injectedTabs.has(tabId)) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content.js']
      });
      injectedTabs.add(tabId);
      
      // Initialize the content script after injection
      if (hasAnnotations) {
        const filteredAnnotations = data.annotations.filter(item => item.url === url);
        await initializeContentScript(filteredAnnotations);
      }
      await updateActionButtonBadge();
    } catch (error) {
      console.error('Failed to inject content script:', error);
    }
  }
}

async function sendMessageToContentScript(type: string, data: any): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    if (!injectedTabs.has(tab.id)) {
      await injectContentScriptIfNeeded(tab.id, tab.url || '');
    }
    chrome.tabs.sendMessage(tab.id, { type, data });
  }
}

const initializeContentScript = (annotations: Annotation[] = data?.annotations || []) => 
  sendMessageToContentScript("init", { annotations, annotationColor: data?.annotationColor });

const sendAnnotationColorToContentScript = () => 
  sendMessageToContentScript("annotationColor", data?.annotationColor);

function exportAnnotations(): void {
  if (!data) return;
  const url = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data.annotations, null, 2))}`;
  chrome.downloads.download({ url, filename: "annotations.json", saveAs: true });
}

function importAnnotations(file: File): void {
  let reader = new FileReader();
  reader.onload = async function (e) {
    try {
      if (!e.target?.result || typeof e.target.result !== 'string') return;
      
      let annotations = JSON.parse(e.target.result);
      if (Array.isArray(annotations) && annotations.every(item => item.url && item.text && item.selector && item.date)) {
        if (data) {
          data.annotations = annotations;
          await saveData();
          await sendMessageToContentScript("init", { annotations, annotationColor: data.annotationColor });
        }
      } else {
        throw new Error("Invalid JSON format.");
      }
    } catch (error) {
      console.error(error);
    }
  };
  reader.readAsText(file);
}

async function updateActionButtonBadge(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !data) return;
  
  const url = tab.url;
  const filteredAnnotations = data.annotations.filter(item => item.url === url);
  const text = filteredAnnotations.length > 0 ? filteredAnnotations.length.toString() : "";
  chrome.action.setBadgeText({ text, tabId: tab.id });
  chrome.action.setBadgeBackgroundColor({ color: data.annotationColor });
}

chrome.runtime.onMessage.addListener((message: ChromeMessage, sender, sendResponse) => {
  switch (message.type) {
    case "getData":
      ensureDataIsLoaded().then(() => sendResponse(data));
      return true;
    case "toggleRecordMode":
      if (data) {
        data.recordMode = !data.recordMode;
                sendMessageToContentScript("recordMode", data.recordMode);
        saveData();
      }
      break;
    case "setAnnotationColor":
      if (data) {
        data.annotationColor = message.data;
        sendAnnotationColorToContentScript();
        updateActionButtonBadge();
        saveData();
      }
      break;
    case "exportAnnotations":
      exportAnnotations();
      break;
    case "importAnnotations":
      importAnnotations(message.data);
      break;
    case "clearAnnotations":
      if (data) {
        data.annotations = [];
        sendMessageToContentScript("clearAnnotations", null);
        updateActionButtonBadge();
        saveData();
      }
      break;
    case "addAnnotation":
      if (data) {
        data.annotations.push(message.data);
        updateActionButtonBadge();
        saveData();
      }
      break;
    case "removeAnnotation":
      if (data) {
        data.annotations = data.annotations.filter(item => 
          item.url !== message.data.url || 
          item.selector !== message.data.selector && 
          item.text !== message.data.text
        );
        updateActionButtonBadge();
        saveData();
      }
      break;
    case "editAnnotation":
      if (data) {
        const annotation = data.annotations.find(item => 
          item.url === message.data.annotation.url && 
          item.selector === message.data.annotation.selector && 
          item.text === message.data.annotation.text
        );
        if (annotation) {
          annotation.text = message.data.text;
          saveData();
        }
      }
      break;
  }
});

chrome.tabs.onUpdated.addListener(async (tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    await ensureDataIsLoaded();
    if (data) {
      // Remove the tab from injected set when the page is refreshed
      injectedTabs.delete(tabId);
      await injectContentScriptIfNeeded(tabId, tab.url);
    }
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  injectedTabs.delete(tabId);
});