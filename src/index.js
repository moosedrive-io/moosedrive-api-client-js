import { encodeObject, decodeObject, initiateWebSocketMux } from 'omnistreams';
import { FileReadProducer } from 'omnistreams-filereader';


class Client {

  constructor(mux) {

    this._nextRequestId = 1;
    this._mux = mux;
    this._authKey = null;
    this._requests = {};
    
    mux.onControlMessage((rawMessage) => {
      const message = decodeObject(rawMessage)
      console.log(message);

      if (message.response !== undefined) {
        console.log("response for: ", message.id);
      }

      delete this._requests[message.id];
    });

    mux.onConduit((producer, rawMeta) => {
      const meta = decodeObject(rawMeta)
      console.log(meta);

      if (meta.response === true) {
        this._requests[meta.id].resolve(producer);
      }
      else {
        this._requests[meta.id].reject(meta.response);
      }

      delete this._requests[meta.id];
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

  initBackup(srcPath, dstPath) {
    this._mux.sendControlMessage(encodeObject({
      id: this._nextRequestId++,
      jsonrpc: '2.0',
      method: 'initBackup',
      params: {
        key: this._authKey,
        srcPath,
        dstPath
      },
    }));
  }

  async download(path, range) {

    const requestId = this._nextRequestId++;

    this._mux.sendControlMessage(encodeObject({
      id: requestId,
      jsonrpc: '2.0',
      method: 'download',
      params: {
        key: this._authKey,
        path,
        range,
      },
    }));

    return new Promise((resolve, reject) => {
      this._requests[requestId] = { resolve, reject };
    });
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
