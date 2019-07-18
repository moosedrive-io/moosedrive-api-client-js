import { initiateWebSocketMux } from 'omnistreams';
import { FileReadProducer } from 'omnistreams-filereader';
import { Peer as RPCPeer } from 'omni-rpc';
import rein from 'rein-state';


class Client {

  constructor(rpc) {
    this._authKey = null;

    this._rpc = rpc;

    this._reinUpdate = () => {};
  }

  setAuthKey(key) {
    this._authKey = key;
  }

  async getReinstate(path) {
    const response = await this._rpc.requestReceiveStream('getReinstate', {
      key: this._authKey,
    });

    const reinstate = rein.fromObject({
      root: {},
    });

    response.producer.onData((data) => {

      if (data.path.length === 0) {
        reinstate.root = data.value;
      }
      else {

        let curPath = reinstate.root;

        function newObj(path) {
          const obj = {};

          let cur = obj;
          for (const part of path) {
            cur[part] = {};
            cur = cur[part];
          }

          return obj;
        }

        while (data.path.length > 1) {
          const part = data.path[0];

          if (!curPath[part]) {
            curPath[part] = rein.fromObject(newObj(data.path.slice(1)));
          }

          curPath = curPath[part];
          data.path.shift();
        }


        const key = data.path[data.path.length - 1]; 
        if (data.action.type === 'update') {
          curPath[key] = data.action.value;
        }
        else if (data.action.type === 'append') {
          curPath[key].push(data.action.viewerId);
        }
        else if (data.action.type === 'add') {
          curPath[key] = data.action.newFile;
        }
        else if (data.action.type === 'delete') {
          delete curPath[key];
        }
      }

      this._reinUpdate();

      response.producer.request(1);
    });


    response.producer.request(10);

    if (response.result === true) {
      return reinstate;
    }
    else {
      throw new Error("getReinstate fail");
    }
  }

  onReinUpdate(callback) {
    this._reinUpdate = callback;
  }

  async getMetaStream(path) {
    const response = await this._rpc.requestReceiveStream('getMetaStream', {
      key: this._authKey,
      path,
      recursive: true,
    });

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

  async delete(path) {
    return await this._rpc.request('delete', {
      key: this._authKey,
      path,
    });
  }


  // Permissions
  //
  setPublicView(path, value, recursive) {
    this._rpc.request('setPublicView', {
      key: this._authKey,
      path,
      value,
      recursive,
    });
  }

  addViewer(path, viewerId) {
    this._rpc.request('addViewer', {
      key: this._authKey,
      path,
      viewerId,
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
