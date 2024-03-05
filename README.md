# Web Annotations

Web Annotations is a browser extension that allows you to display, record, and share visual annotations for web pages. You can use it to highlight and comment on any element on a web page, and export or import your annotations as JSON files. You can also enable a record mode that lets you add annotations by clicking on elements. This extension is useful for web developers, designers, researchers, educators, or anyone who wants to annotate the web.

## Features

- Display annotations on top of web pages, with a customizable color and position
- Record annotations by clicking on elements while in record mode
- Edit or remove annotations by right-clicking on them
- Export or import annotations as JSON files
- Manage annotations from the extension popup, where you can see the list of annotations for the current page, toggle record mode, change the annotation color, and clear all annotations
- Sync annotations across browser sessions using the Chrome storage API

## Usage

To use the extension, you need to install it from the Chrome Web Store or load it as an unpacked extension from the source code. Then, you can enable it on any web page by clicking on the extension icon in the toolbar.

### Installation

To install the extension from the Chrome Web Store, follow these steps:

- Go to the [Web Annotations page](https://chrome.google.com/webstore/detail/web-annotations/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx) on the Chrome Web Store.
- Click on the "Add to Chrome" button and confirm the permissions.
- The extension icon should appear in the toolbar.

To install the extension from the source code, follow these steps:

- Clone or download the [source code](https://github.com/lostintangent/web-annotations) from GitHub.
- Go to the Chrome extensions page (`chrome://extensions`) and enable the developer mode.
- Click on the "Load unpacked" button and select the folder where the source code is located.
- The extension icon should appear in the toolbar.

### Displaying annotations

To display annotations on a web page, you need to have a JSON file with the annotations data. The JSON file should be an array of objects, where each object has the following properties:

- `text`: The annotation text
- `url`: The web page URL where the annotation belongs
- `selector`: The CSS selector of the element that the annotation refers to
- `date`: The timestamp of when the annotation was created

For example, the following JSON file contains two annotations for the Google homepage:

```json
[
  {
    "text": "This is the logo",
    "url": "https://www.google.com/",
    "selector": "#hplogo",
    "date": 1634745600000
  },
  {
    "text": "This is the search box",
    "url": "https://www.google.com/",
    "selector": ".gLFyf",
    "date": 1634745610000
  }
]
```

To import the annotations from the JSON file, follow these steps:

- Click on the extension icon in the toolbar to open the popup.
- Click on the "Import" button and select the JSON file from your computer.
- The annotations should appear on the web page, as well as in the list in the popup.

![Screenshot of the extension popup with the import button and the list of annotations](screenshots/popup-import.png)

![Screenshot of the web page with the annotations displayed](screenshots/page-annotations.png)

### Recording annotations

To record annotations on a web page, follow these steps:

- Click on the extension icon in the toolbar to open the popup.
- Check the "Record mode" checkbox to enable the record mode.
- The extension icon should change to a red circle to indicate that the record mode is on.
- Go to the web page where you want to add annotations and click on any element that you want to annotate.
- A prompt should appear where you can enter the annotation text.
- After entering the text, the annotation should appear on the web page, as well as in the list in the popup.

![Screenshot of the extension popup with the record mode checkbox checked](screenshots/popup-record.png)

![Screenshot of the web page with the record mode on and the prompt for the annotation text](screenshots/page-record.png)

### Editing or removing annotations

To edit or remove an annotation on a web page, follow these steps:

- Right-click on the annotation that you want to edit or remove.
- A context menu should appear with the options "Edit" and "Remove".
- Click on the "Edit" option to edit the annotation text, or click on the "Remove" option to remove the annotation.
- The annotation should be updated or deleted on the web page, as well as in the list in the popup.

![Screenshot of the web page with the context menu for the annotation](screenshots/page-context.png)

### Exporting annotations

To export the annotations from a web page, follow these steps:

- Click on the extension icon in the toolbar to open the popup.
- Click on the "Export" button to download a JSON file with the annotations data.
- The JSON file should have the same format as the one used for importing annotations.

![Screenshot of the extension popup with the export button](screenshots/popup-export.png)

### Changing the annotation color

To change the color of the annotations on a web page, follow these steps:

- Click on the extension icon in the toolbar to open the popup.
- Click on the color picker next to the "Annotation Color" label and select a color from the palette.
- The annotations should change their color on the web page, as well as in the list and the badge in the popup.

![Screenshot of the extension popup with the color picker](screenshots/popup-color.png)

### Clearing annotations

To clear all the annotations from a web page, follow these steps:

- Click on the extension icon in the toolbar to open the popup.
- Click on the "Clear" button to remove all the annotations from the web page and the list in the popup.
- The annotations should disappear from the web page, as well as from the list and the badge in the popup.

![Screenshot of the extension popup with the clear button](screenshots/popup-clear.png)

## License

This extension is licensed under the [MIT License](LICENSE). See the `LICENSE` file for more details.
