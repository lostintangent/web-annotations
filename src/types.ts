export interface Annotation {
  text: string;
  url: string;
  selector: string;
  date: number;
  color?: string;
}

export interface AppData {
  annotations: Annotation[];
  recordMode: boolean;
  annotationColor: string;
}

export interface ChromeMessage {
  type: string;
  data: any;
}