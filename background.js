let data = null;
async function ensureDataIsLoaded() {
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

async function saveData() {
  await chrome.storage.local.set({
    annotations: data.annotations,
    annotationColor: data.annotationColor
  });

  await chrome.storage.session.set({ recordMode: data.recordMode });
}

async function sendMessageToContentScript(type, data) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.tabs.sendMessage(tab.id, { type, data });
}

const initializeContentScript = (annotations = data.annnotations) => sendMessageToContentScript("init", { annotations, annotationColor: data.annotationColor });
const sendAnnotationColorToContentScript = () => sendMessageToContentScript("annotationColor", data.annotationColor);

function exportAnnotations() {
  const url = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data.annotations, null, 2))}`
  chrome.downloads.download({ url, filename: "annotations.json", saveAs: true });
}

function importAnnotations(file) {
  let reader = new FileReader();
  reader.onload = async function (e) {
    try {
      let annotations = JSON.parse(e.target.result);
      if (Array.isArray(annotations) && annotations.every(item => item.url && item.text && item.selector && item.date)) {
        data.annotations = annotations;
        await saveData();
        await sendAnnotationsToContentScript();
      } else {
        throw new Error("Invalid JSON format.");
      }
    } catch (error) {
      console.error(error);
    }
  };
  reader.readAsText(file);
}

async function updateActionButtonBadge() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab.url;
  const filteredAnnotations = data.annotations.filter(item => item.url === url);

  const text = filteredAnnotations.length > 0 ? filteredAnnotations.length.toString() : "";
  chrome.action.setBadgeText({ text, tabId: tab.id });
  chrome.action.setBadgeBackgroundColor({ color: data.annotationColor });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    /*
     * Sender = Pop-up view
     */
    case "getData": // The popup is loading and needs to be initialized with the user data
      ensureDataIsLoaded().then(() => sendResponse(data));
      return true; // This signals that the response is async

    case "toggleRecordMode": // The user toggled record mode check in the pop-up
      data.recordMode = !data.recordMode;
      sendMessageToContentScript("recordMode", data.recordMode);
      saveData();
      break;

    case "setAnnotationColor":
      data.annotationColor = message.data;
      sendAnnotationColorToContentScript();
      updateActionButtonBadge();
      saveData();
      break;

    case "exportAnnotations": // The user clicked the "Export" button
      exportAnnotations();
      break;

    case "importAnnotations": // The user clicked the "Import" button
      importAnnotations(message.data);
      break;

    case "clearAnnotations": // The user clicked the "Clear" button
      data.annotations = [];
      sendMessageToContentScript("clearAnnotations");
      updateActionButtonBadge();
      saveData();
      break;

    /*
     * Sender = Content script
     */
    case "addAnnotation": // The user just added a new annotation to the page
      data.annotations.push(message.data);
      updateActionButtonBadge();
      saveData();
      break;

    case "removeAnnotation": // The user just deleted an annotation from the page
      data.annotations = data.annotations.filter(item => item.url !== message.data.url || item.selector !== message.data.selector && item.text !== message.data.text);
      updateActionButtonBadge();
      saveData();
      break;

    case "editAnnotation": // The user just edit an annotation
      const annotation = data.annotations.find(item => item.url === message.data.annotation.url && item.selector === message.data.annotation.selector && item.text === message.data.annotation.text);
      if (annotation) {
        annotation.text = message.data.text;
        saveData();
      }
      break;
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
    await ensureDataIsLoaded();
    data.recordMode = false;
  
    const url = tab.url;
    const filteredAnnotations = data.annotations.filter(item => item.url === url);

    initializeContentScript(filteredAnnotations);
    updateActionButtonBadge();
  }
});
