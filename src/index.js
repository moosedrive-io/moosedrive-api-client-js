import { encodeObject, decodeObject, initiateWebSocketMux } from 'omnistreams';
import { FileReadProducer } from 'omnistreams-filereader';


class Client {

  constructor(mux) {

    this._nextRequestId = 1;
    this._mux = mux;
    this._authKey = null;
    
    mux.onControlMessage((rawMessage) => {
      const message = decodeObject(rawMessage)
      console.log(message);

      if (message.id !== undefined) {
      }
    });
  }

  setAuthKey(key) {
    this._authKey = key;
  }

  uploadFile(path, file) {

    const fileStream = new FileReadProducer(file);

    const consumer = this._mux.createConduit(encodeObject({
      id: this._nextRequestId++,
      jsonrpc: '2.0',
      method: 'uploadFile',
      params: {
        key: this._authKey,
        path,
      },
    }));

    fileStream.pipe(consumer);
    fileStream.onTermination(() => {
      console.error("terminated");
    })
  }

  saveTextFile(path, text) {
    this._mux.sendControlMessage(encodeObject({
      id: this._nextRequestId++,
      jsonrpc: '2.0',
      method: 'saveTextFile',
      params: {
        key: this._authKey,
        path,
        text,
      },
    }));
  }
}

class ClientBuilder {

  constructor() {
    this._address = window.location.hostname;
    this._port = 9001;
    this._authKey = null;
    this._secure = true;
  }

  address(value) {
    this._address = value;
    return this;
  }

  port(value) {
    this._port = value;
    return this;
  }
  
  authKey(value) {
    this._authKey = value;
    return this;
  }

  secure(value) {
    this._secure = value;
    return this;
  }

  async build() {

    const mux = await initiateWebSocketMux({
      address: this._address,
      port: this._port,
      secure: this._secure,
    });

    const client = new Client(mux);

    client.setAuthKey(this._authKey);

    return client;
  }
}

export {
  ClientBuilder,
};
