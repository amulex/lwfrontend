import { assert, DeepReadonly, setIfObject, DomHelper } from '@devlegal/shared-ts';
import { FileTransportAgent, TextTransportAgent } from '../utils/transports/transports';
import { HandleText } from '../utils/transports/text';
import { HandleFile } from '../utils/transports/file';

type HandleMessage = TemplateElements | HandleText;
export type ChatElements = DeepReadonly<{
  input: HTMLInputElement | HTMLTextAreaElement;
  button?: HTMLElement;
  messages: HandleMessage;
}>;

type HandleFileElements = FileTemplateElements | HandleFile;
export type FileElements = DeepReadonly<{
  input: HTMLInputElement;
  messages: HandleFileElements;
}>;

type TemplateElements = DeepReadonly<{
  container: HTMLElement;
  messageTemplate: HTMLElement;
  formatTime: (time: Date) => string;
}>;

type FileTemplateElements = TemplateElements & { formatText: (f: File) => string };

export type ChatView = ChatElements | TextTransportAgent;
export type FileView = FileElements | FileTransportAgent;

const enterKeyCode = 13;

export class TextChatFactory {

  public static init({ input, button, messages }: ChatElements): TextTransportAgent {
    return transport => {
      const send = () => {
        const text = input.value.trim();
        input.value = '';
        if (text) {
          return transport.send({ text, time: new Date() });
        }
      };

      input.onkeypress = async event => {
        if (event.keyCode === enterKeyCode && !(event.shiftKey || event.altKey)) {
          event.preventDefault();
          return send();
        }
      };

      if (button) {
          // In case of session changing (call - leave - call again) button should not keep old 'click' listener
          //button.addEventListener('click', send);
          button.onclick = send;
      }

      const handle = ChatHelper.isMessagesElements(messages)
        ? TextChatFactory.defaultTextHandlerFactory(messages)
        : messages;
      transport.onReceived(handle);
    };
  }

  private static defaultTextHandlerFactory(messages: TemplateElements): HandleText {
    return ({ custom, system }) => {
      const { text, time } = custom;
      const { messageTemplate, formatTime, container } = messages;
      const newMessage = DomHelper.clone(messageTemplate);

      newMessage.classList.add(system.stream);
      setIfObject(DomHelper.queryMaybe('.time', newMessage), 'textContent', formatTime(time));
      setIfObject(DomHelper.queryMaybe('.message', newMessage), 'textContent', text);

      container.appendChild(newMessage);
    };
  }
}

export class FileChatFactory {
  /**
   * Adds to chat support of sending/receiving files.
   */
  public static init({ input, messages }: FileElements): FileTransportAgent {
    const type = input.type;
    assert(type === 'file', `Type of input must be "file", ${type} given`);

    return transport => {
      input.onchange = async () => {
        const files = input.files!;
        for (const file of files) {
          await transport.send({ file, time: new Date() });
        }
        input.value = '';
      };

      const handle = ChatHelper.isFileMessagesElements(messages)
        ? FileChatFactory.defaultFileHandlerFactory(messages)
        : messages;
      transport.onReceived(handle);
    };
  }

  private static defaultFileHandlerFactory = (messages: FileTemplateElements): HandleFile => ({ custom, system }) => {
    const { file, time } = custom;
    const { messageTemplate, formatTime, formatText, container } = messages;
    const newMessage = DomHelper.clone(messageTemplate);

    newMessage.classList.add(system.stream);
    setIfObject(DomHelper.queryMaybe('.time', newMessage), 'textContent', formatTime(time));

    const anchor = DomHelper.queryMaybe('a[download]', newMessage);
    if (anchor instanceof HTMLAnchorElement) {
      anchor.href = URL.createObjectURL(file);
      anchor.download = file.name;
      anchor.textContent = formatText(file);
    }

    container.appendChild(newMessage);
  };
}

export class ChatHelper {
  public static isMessagesElements<M>(messages: HandleMessage): messages is TemplateElements {
    return (messages as TemplateElements).messageTemplate !== undefined;
  }

  public static isFileMessagesElements<M>(messages: HandleFileElements): messages is FileTemplateElements {
    return (messages as FileTemplateElements).formatText !== undefined;
  }

  public static isTextElements(elements: ChatView): elements is ChatElements {
    return (elements as ChatElements).input !== undefined;
  }

  public static isFileElements(elements: FileView): elements is FileElements {
    return (elements as FileElements).input !== undefined;
  }
}
