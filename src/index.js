import { encodeObject, decodeObject, initiateWebSocketMux } from 'omnistreams';
import { FileReadProducer } from 'omnistreams-filereader';
import { Peer as RPCPeer } from 'omni-rpc';


class Client {

  constructor(rpc) {
    this._authKey = null;

    this._rpc = rpc;
  }

  setAuthKey(key) {
    this._authKey = key;
  }

  async getMetaStream(path) {
    const response = await this._rpc.requestReceiveStream('getMetaStream', {
      key: this._authKey,
      path,
      recursive: true,
    });

    console.log(response);
    if (response.result === true) {
      return response.producer;
    }
    else {
      throw new Error("getMetaStream fail");
    }
  }

  uploadFile(path, file) {

    const fileStream = new FileReadProducer(file);

    this._rpc.requestSendStream('uploadFile', {
      key: this._authKey,
      path,
      file,
    }, fileStream);
  }

  async storeTextFile(path, text) {
    return this._rpc.request('storeTextFile', {
      key: this._authKey,
      path,
      text,
    });
  }

  addTags(path, tags) {
    this._rpc.request('addTags', {
      key: this._authKey,
      path,
      tags,
    });
  }

  initBackup(srcPath, dstPath) {
    this._rpc.request('initBackup', {
      key: this._authKey,
      srcPath,
      dstPath
    });
  }

  async download(path, range) {

    return await this._rpc.requestReceiveStream('download', {
      key: this._authKey,
      path,
      range,
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

    const rpc = new RPCPeer(mux);

    const client = new Client(rpc);

    client.setAuthKey(this._authKey);

    return client;
  }
}

export {
  ClientBuilder,
};
