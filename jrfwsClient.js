const {cloneDeep} = require('lodash');

module.exports = class {

  constructor() {

    this._routeNotFound = null;
    this._routes = [];
    this.url = null;
    this.user = {
      username: '',
      email: '',
      token: '',
      rights: null,
      phone: '',
      uid: this._generateId()
    };
    this.userSearchFields = ['email', 'phone'];
    this.userIncludeFields = ['email', 'phone', 'username', 'uid'];
    this.userExcludeFields = ['rights', 'token'];
    this.reconnect = true;
    this.wsClient = null;
    this.consoleLog = true;
    this.timeout = 10000;
    this._uids = {};
    this.auth = async ({user, data, client, action}) => {
      // user - client user (default this.user) here change user
      // data - parse mes (route, act, data, system)
      // client - ws client (client.sendMes({route, act, data}) only server)
      // action - object {stop: false, terminate: false} (stop = true - stop process mes; terminate = true - disconnect client (terminate only server))
    };
    this.onTimeout = async ({data}) => {
      if (this.consoleLog) console.error(`Timeout: ${data.timeout} ms; uid: ${data.uid}; route: ${data.route}; act: ${data.act}`);
      if (this.onConsoleLog) await this.onConsoleLog({log: `Timeout: ${data.timeout} ms; uid: ${data.uid}; route: ${data.route}; act: ${data.act}`});
    };
    this.onConsoleLog = async ({log}) => {
    };
    this.onOpen = async (args) => {
    };
    this.onError = async (args) => {
    };
    this.onClose = async (args) => {
    };
    this.onMessage = async (args) => {
    };

  }

  _wait(mlsecond = 1000) {
    return new Promise(resolve => setTimeout(resolve, mlsecond));
  }

  async startClient({url, reconnect = true, user = null, browserClient = false}) {

    this.user = user || this.user;

    if (url && typeof url === 'string') {
      this.url = url;
    }

    if (typeof reconnect === 'boolean') {
      this.reconnect = reconnect;
    }

    if (browserClient) {
      this.wsClient = new WebSocket(this.url);
    } else {
      const WebSocket = require('ws');
      this.wsClient = new WebSocket(this.url);
    }

    this.wsClient.onopen = async (args) => {
      if (this.consoleLog) console.log('WebSocket connection established');
      if (this.onConsoleLog) await this.onConsoleLog({log: `WebSocket connection established`});
      if (this.onOpen && typeof this.onOpen === 'function') {
        await this.onOpen(args);
      }
    };

    this.wsClient.onerror = async (args) => {
      if (this.consoleLog) console.error('WebSocket error');
      if (this.onConsoleLog) await this.onConsoleLog({log: `WebSocket error`});
      if (this.onError && typeof this.onError === 'function') {
        await this.onError(args);
      }
    };

    this.wsClient.onclose = async (args) => {
      if (this.consoleLog) console.log('WebSocket connection closed');
      if (this.onConsoleLog) await this.onConsoleLog({log: `WebSocket connection closed`});
      if (this.onClose && typeof this.onClose === 'function') {
        await this.onClose(args);
      }
      if (this.reconnect) {
        await this._wait(500);
        await this.reconnectToWs();
      }
    };

    this.wsClient.onmessage = async message => {
      if (this.onMessage && typeof this.onMessage === 'function') {
        await this.onMessage(message);
      }
      await this._routing(message.data);
    };

  }

  async reconnectToWs() {

    if (this.wsClient.readyState === 3 || this.wsClient.readyState === 2) {
      await this._wait(500);
      await this.startClient({url: this.url, reconnect: this.reconnect, user: this.user});
    } else {
      if (this.consoleLog) console.log(this.wsClient.readyState);
      if (this.onConsoleLog) await this.onConsoleLog({log: this.wsClient.readyState});
    }
  }

  async stopClient() {
    this.reconnect = false;
    this.wsClient.close();
  }

  async _routing(mes) {

    let data = await this._parseMessage(mes);
    let stop = {
      stop: false
    };

    if (!data) {
      return;
    }

    // if (this.auth && typeof this.auth === 'function') {
    //
    //   let user = cloneDeep(this.defaultClientUser);
    //   if (ws && !ws.user) {
    //     user.uid = this._generateId();
    //     ws.user = user;
    //   } else if (ws && ws.user) {
    //     user = ws.user;
    //   } else if (data && data.user) {
    //     user = data.user;
    //   }
    //
    //   const action = {stop: false, terminate: false};
    //
    //   await this.auth({user, data, client: ws, action});
    //
    //   if (action.terminate && ws) {
    //     ws.terminate();
    //     return;
    //   }
    //
    //   if (action.stop) {
    //     return;
    //   }
    //
    // }

    if (data.isRes && data.uid) {
      const next = await this._processRoutingRes({data});
      if (!next) return;
    }

    let notFound = true;
    let res = null;
    for (let el of this._routes) {

      if (stop.stop) {
        stop.stop = false;
        break;
      }

      let act = false;
      if (el.act) {

        act = el.act === data.act;
        if (!act) continue;

      }

      if (el.route) {

        if (act) {
          if (el.route !== data.route) {
            continue;
          }
        }

        const route = el.route === data.route;
        if (!route) continue;

      }

      if (el.route) {
        notFound = false;
      }

      res = await el.fn({
        data, stop: () => {
          stop.stop = true;
        }
      });

    }

    if (data.route && notFound && typeof this._routeNotFound === 'function') {
      res = await this._routeNotFound({
        data, stop: () => {
          stop.stop = true;
        }
      });
    }

    // if (data.uid && !data.isRes) {
    if (!data.isRes) {

      if (notFound) {
        res = {
          error: {
            message: `Not found route: ${data.route}; act: ${data.act}; uid: ${data.uid}`
          }
        };
      }

      let mes = {
        uid: data.uid,
        isRes: true,
        // user: this._getUserForPublicMes({user: this.user}),
        user: this.user,
        data: res
      };

      if (data.route) mes.route = data.route;
      if (data.act) mes.act = data.act;
      mes.system = this._addHistoryInSystem({system: data.system});

      if (this.wsClient && (notFound || mes.uid)) {
        this.wsClient.send(JSON.stringify(mes));
        return;
      }

    }

  }

  async _processRoutingRes({data}) {

    const next = true;
    const objUid = this._uids[data.uid];
    if (!objUid) return next;

    if (objUid.callback && typeof objUid.callback === 'function') {

      await objUid.callback({data});
      delete this._uids[data.uid];

      return !next;

    }

    if (objUid.awaitRes) {

      objUid.res = data.data;
      objUid.gotAnswer = true;

      return !next;

    }

    return next;

  }

  async route({route, act, func}) {

    if (typeof func !== 'function') {
      throw new Error('Invalid func');
    }

    const routeObj = {
      route,
      act,
      fn: func
    };

    if (routeObj.route === 'not found') {
      this._routeNotFound = routeObj.fn;
      return;
    }
    this._routes.push(routeObj);

  }

  async _parseMessage(mes) {

    let data = mes;

    if (typeof data !== 'object') {

      try {
        data = JSON.parse(mes);
      } catch (err) {
        return false;
      }
    }

    if (!data.data && !data.route && !data.act) {
      return false;
    }

    if (data.route && typeof data.route !== 'string') {
      return false;
    }

    if (data.act && typeof data.act !== 'string') {
      return false;
    }

    return data;

  }

  async sendMes({data, route = null, act = null, awaitRes = null, callback = null, options = null, to = null, from = null, system = {}}) {

    if (this.wsClient) {

      const res = await this._sendMesClient({data, route, act, awaitRes, callback, options, to, from, system});
      if (awaitRes) {
        return res;
      }

    }

    return false;

  }

  async _sendMesClient({data, route = null, act = null, awaitRes = null, callback = null, options = null, to = null, from = null, system = {}}) {

    try {

      if (!this.wsClient) {
        return;
      }

      if (this.wsClient.readyState !== 1) {
        return;
      }

      if (!data && !route && !act) {
        if (this.consoleLog) console.error('No data');
        if (this.onConsoleLog) await this.onConsoleLog({log: `No data`});
        return false;
      }

      const uid = await this._processRes({route, act, data, awaitRes, callback, options, to, from, system});

      let mes = {
        route,
        act,
        data,
        uid,
        user: this.user,
        system: this._addHistoryInSystem({system}),
        isRes: false
      };

      if (to) {

        const res = await this._processBroadcastTo({to, mes});

        if (!res) {
          if (this.consoleLog) console.error(`Error broadcast object to: ${to}`);
          if (this.onConsoleLog) await this.onConsoleLog({log: `Error broadcast object to: ${to}`});
          return false;
        }

      }

      this.wsClient.send(JSON.stringify(mes));

      if (awaitRes) {
        return await this._awaitRes({uid});
      }

      return true;

    } catch (e) {
      if (this.consoleLog) console.error(`Error sendMes ${e}`);
      if (this.onConsoleLog) await this.onConsoleLog({log: `Error sendMes ${e}`});
    }

    return false;

  }

  async _processBroadcastTo({to, mes}) {

    if (!to || typeof to !== 'object') {
      return false;
    }

    let groups = [];
    if (to.groups && typeof to.groups === 'string') {
      groups.push(to.groups);
    } else if (to.groups && Array.isArray(to.groups)) {
      groups = to.groups;
    }

    let excludeGroups = [];
    if (to.excludeGroups && typeof to.excludeGroups === 'string') {
      excludeGroups.push(to.excludeGroups);
    } else if (to.excludeGroups && Array.isArray(to.excludeGroups)) {
      excludeGroups = to.excludeGroups;
    }

    let users = [];
    if (to.users && typeof to.users === 'string') {
      users.push(to.users);
    } else if (to.users && Array.isArray(to.users)) {
      users = to.users;
    }

    let excludeUsers = [];
    if (to.excludeUsers && typeof to.excludeUsers === 'string') {
      excludeUsers.push(to.excludeUsers);
    } else if (to.excludeUsers && Array.isArray(to.excludeUsers)) {
      excludeUsers = to.excludeUsers;
    }

    const meToo = !!to.meToo;

    mes.to = {
      groups,
      excludeGroups,
      users,
      excludeUsers,
      meToo
    };

    return true;

  }

  async addGroup({group}) {

    return await this._addGroupClient({group});

  }

  async _addGroupClient({group}) {

    return await this.sendMes({route: 'jrfws2Group', act: 'add', data: {group}, awaitRes: true});

  }

  async delGroup({group}) {
    return await this._delGroupClient({group});
  }

  async _delGroupClient({group}) {

    return await this.sendMes({route: 'jrfws2Group', act: 'del', data: {group}, awaitRes: true});

  }

  async addUserToGroup({group, user}) {

    return await this._addUserToGroupClient({group, user});

  }

  async _addUserToGroupClient({group, user}) {

    return await this.sendMes({route: 'jrfws2Group', act: 'addUser', data: {group, user}, awaitRes: true});

  }

  async delUserToGroup({group, user}) {

    return await this._delUserToGroupClient({group, user});

  }

  async _delUserToGroupClient({group, user}) {

    return await this.sendMes({route: 'jrfws2Group', act: 'delUser', data: {group, user}, awaitRes: true});

  }

  async getGroups() {
    return await this._getGroupsClient();
  }

  async _getGroupsClient() {

    return await this.sendMes({route: 'jrfws2Group', act: 'get', data: {}, awaitRes: true});

  }

  async getRoutes() {

    let routes = [];
    for (let el of this._routes) {

      if (!el.route) {
        continue;
      }

      let route = {};
      for (let elRoute of routes) {
        if (elRoute.route === el.route) {
          route = elRoute;
          break;
        }
      }

      if (!route.route) {
        route.route = el.route;
        route.acts = [];
        routes.push(route);
      }

      if (!el.act) {
        continue;
      }

      if (route.acts.includes(el.act)) {
        continue;
      }

      route.acts.push(el.act);

    }

    return routes;

  }

  async _awaitRes({uid}) {

    if (!uid) {
      return {};
    }

    const objUid = this._uids[uid];
    if (!objUid) {
      return {};
    }

    const timeout = objUid.timeout;
    const timeStart = new Date();

    while (true) {

      await this._wait(100);

      const timeDiff = new Date() - timeStart;
      if (timeDiff >= timeout) {

        objUid.res = objUid.res || {};
        objUid.res.error = {
          message: `timeout ${timeout}`
        };

        const copyUid = cloneDeep(objUid);

        if (typeof this.onTimeout === 'function') {
          await this.onTimeout({data: objUid});
        }

        delete this._uids[uid];

        return copyUid.res;

      }

      if (objUid.gotAnswer) {

        const copyUid = cloneDeep(objUid);
        delete this._uids[uid];

        return copyUid.res;

      }

    }

  }

  async _processRes({route = null, act = null, data = null, awaitRes = null, callback = null, options = null, to = null, from = null, system = {}}) {

    if (!awaitRes && !callback) {
      return null;
    }

    const uid = this._generateId();
    this._uids[uid] = {
      uid,
      route,
      act,
      data,
      to,
      from,
      system
    };

    if (callback) {
      this._uids[uid].callback = callback;
    }

    if (awaitRes) {
      this._uids[uid].res = null;
      this._uids[uid].awaitRes = true;
    }

    if (options && options.timeout) {
      this._uids[uid].timeout = options.timeout;
    } else {
      this._uids[uid].timeout = this.timeout;
    }

    return uid;

  }

  _generateId({len = 15, smallChar = true, bigChar = true, num = false, withDate = true} = {}) {

    let strId = '';
    let patern = '';

    if (smallChar) {
      patern += 'abcdefghijklmnopqrstuvwxyz';
    }
    if (bigChar) {
      patern += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    }
    if (num) {
      patern += '0123456789';
    }

    for (let i = 0; i < len; i++) {
      strId += patern.charAt(Math.floor(Math.random() * patern.length));
    }

    const now = new Date();
    strId = `${strId}${now.getDate()}${now.getMonth()}${now.getFullYear()}${now.getHours()}${now.getMinutes()}${now.getSeconds()}${now.getMilliseconds()}`;

    return strId;
  }

  _addHistoryInSystem({system}) {

    if (typeof system !== 'object') {
      system = {};
    }

    if (!system.history || !Array.isArray(system.history)) {
      system.history = [];
    }

    system.history.push({
      user: this._getUserForPublicMes({user: this.user}),
      date: new Date()
    });

    return system;

  }

  _getUserForPublicMes({user}) {

    if (!user || typeof user !== 'object') {
      return {};
    }

    let userForPublicMes = cloneDeep(user);

    if (this.userIncludeFields && Array.isArray(this.userIncludeFields)) {

      userForPublicMes = {};

      for (const field of this.userIncludeFields) {

        if (typeof field !== 'string') continue;

        userForPublicMes[field] = user[field];

      }

    }

    if (this.userExcludeFields && Array.isArray(this.userExcludeFields)) {

      for (const field of this.userExcludeFields) {

        if (typeof field !== 'string') continue;

        delete userForPublicMes[field];

      }

    }

    return userForPublicMes;

  }

  async _onProcessLog({log = ''}) {

    if (!log) return;

    if (!this.onConsoleLog || typeof this.consoleLog !== 'function') {
      return;
    }

    await this.onConsoleLog({log});

  }

};