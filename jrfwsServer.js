const WebSocket = require('ws');
const {cloneDeep} = require('lodash');

module.exports = class {

  constructor() {

    this.wss = null;
    this._routeNotFound = null;
    this._routes = [];
    this._groups = {};
    this.groups = {};
    this.url = null;
    this.cycleAwaitTimeout = 15;
    this.user = {
      username: '',
      email: '',
      token: '',
      rights: null,
      phone: '',
      uid: this._generateId()
    };
    this.defaultClientUser = {
      username: '',
      email: '',
      token: '',
      rights: null,
      phone: '',
      uid: this._generateId()
    };
    this.userSearchFields = ['username', 'email', 'phone'];
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
      if (this.onConsoleLog) await this._onProcessLog({log: `Timeout: ${data.timeout} ms; uid: ${data.uid}; route: ${data.route}; act: ${data.act}`});
    };
    this.onBeforeAddGroup = async ({mes, sender, group, mesSendServer}) => {
      return true;
    };
    this.onAfterAddGroup = async ({mes, sender, group, mesSendServer}) => {
      return true;
    };
    this.onBeforeDelGroup = async ({mes, sender, group, mesSendServer}) => {
      return true;
    };
    this.onAfterDelGroup = async ({mes, sender, group, mesSendServer}) => {
      return true;
    };
    this.onBeforeGetGroups = async ({mes, sender, mesSendServer}) => {
      return true;
    };
    this.onAfterGetGroups = async ({mes, sender, groups, mesSendServer}) => {
      return true;
    };
    this.onBeforeAddUserToGroup = async ({mes, sender, group, user, clients, mesSendServer}) => {
      return true;
    };
    this.onAfterAddUserToGroup = async ({mes, sender, group, user, clients, mesSendServer}) => {
      return true;
    };
    this.onBeforeDelUserToGroup = async ({mes, sender, group, user, clients, mesSendServer}) => {
      return true;
    };
    this.onAfterDelUserToGroup = async ({mes, sender, group, user, clients, mesSendServer}) => {
      return true;
    };
    this.onBeforeSendMesTo = async ({client, from, to, mes}) => {
      return true;
    };
    this.onAfterSendMesTo = async ({client, from, to, mes}) => {
      return true;
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

    this._addServiceRouting();

  }

  _wait(mlsecond = 1000) {
    return new Promise(resolve => setTimeout(resolve, mlsecond));
  }

  async startClient({url, reconnect = true, user = null}) {

    this.user = user || this.user;

    if (url && typeof url === 'string') {
      this.url = url;
    }

    if (typeof reconnect === 'boolean') {
      this.reconnect = reconnect;
    }

    this.wsClient = new WebSocket(this.url);

    this.wsClient.onopen = async (args) => {
      if (this.consoleLog) console.log('WebSocket connection established');
      if (this.onConsoleLog) await this._onProcessLog({log: `WebSocket connection established`});
      if (this.onOpen && typeof this.onOpen === 'function') {
        await this.onOpen(args);
      }
    };

    this.wsClient.onerror = async (args) => {
      if (this.consoleLog) console.error('WebSocket error');
      if (this.onConsoleLog) await this._onProcessLog({log: `WebSocket error`});
      if (this.onError && typeof this.onError === 'function') {
        await this.onError(args);
      }
    };

    this.wsClient.onclose = async (args) => {
      if (this.consoleLog) console.log('WebSocket connection closed');
      if (this.onConsoleLog) await this._onProcessLog({log: `WebSocket connection closed`});
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
      if (this.onConsoleLog) await this._onProcessLog({log: this.wsClient.readyState});
    }
  }

  async close() {
    if (this.wsClient) {
      this.reconnect = false;
      this.wsClient.close();
    } else {
      this.wss.close();
    }
  }

  attach({app, https, opts}) {

    let http = https ? require('https') : require('http');

    if (app.server && app.server.constructor.name !== 'Server') {
      throw new Error('app.server already exists but it\'s not an http server');
    }

    if (!app.server) {
      // Create a server if it doesn't already exists
      app.server = https ? http.createServer(opts || {}, app.callback()) : http.createServer(app.callback());

      app.listen = function listen() {
        app.server.listen.apply(app.server, arguments);
        return app.server;
      }
    }

    this.wss = new WebSocket.Server({server: app.server});
    this.wss.routing = this._routing.bind(this);
    this.wss.sendMes = this.sendMes;
    this.wss.on('connection', this._connection);

    app.jrfws = this;
  }

  async startServer(opts) {
    this.wss = new WebSocket.Server(opts || {port: 3001});
    this.wss.routing = this._routing.bind(this);
    this.wss.sendMes = this.sendMes;
    this.wss.on('connection', this._connection);
  }

  async stopServer() {

    if (!this.wss) return;
    this.wss.close();

  }

  _connection(ws) {

    ws.sendMes = async ({data, route = null, act = null, awaitRes = null, callback = null, options = null, to = null, from = null, system = {}}) => {
      return await this.sendMes({ws, data, route, act, awaitRes, callback, options, to, from, system});
    };
    ws.onmessage = async (message) => {
      await this.routing(message.data, ws);
    }

  }

  async _routing(mes, ws) {

    let data = await this._parseMessage(mes);
    let stop = {
      stop: false
    };

    if (!data) {
      return;
    }

    if (this.auth && typeof this.auth === 'function') {

      let user = cloneDeep(this.defaultClientUser);
      if (ws && !ws.user) {
        user.uid = this._generateId();
        ws.user = user;
      } else if (ws && ws.user) {
        user = ws.user;
      } else if (data && data.user) {
        user = data.user;
      }

      const action = {stop: false, terminate: false};

      await this.auth({user, data, client: ws, action});

      if (action.terminate && ws) {
        ws.terminate();
        return;
      }

      if (action.stop) {
        return;
      }

    }

    if (ws && !ws.user) {
      let user = cloneDeep(this.defaultClientUser);
      user.uid = this._generateId();
      ws.user = user;
      data.client = ws;
    }

    if (!this.wsClient && data.to) {
      // console.time('SendBroadcast');
      await this._processBroadcastFrom({mes: data, fromUser: ws.user});
      // console.timeEnd('SendBroadcast');
      return;
    }

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

      if (ws && (notFound || mes.uid)) {
        ws.send(JSON.stringify(mes));
        return;
      }

      if (this.wsClient && (notFound || mes.uid)) {
        this.wsClient.send(JSON.stringify(mes));
        return;
      }

    }

  }

  async _processBroadcastFrom({mes, fromUser}) {

    const to = mes.to;

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

    let groupsForSend = [];

    if (groups.length) groupsForSend = [...groups];

    // if (!groups.length && !users.length && !excludeUsers.length) {
    if (!groups.length && !users.length) {
      groupsForSend = Object.keys(this.groups);
    }

    if (!groups.length && excludeGroups.length) {

      const excludeGroupsNames = excludeGroups.map(excludeGroup => {
        if (typeof excludeGroup === 'string') {
          return excludeGroup;
        } else if (typeof excludeGroup === 'object' && excludeGroup.name && typeof excludeGroup.name === 'string') {
          return excludeGroup.name;
        }
      });

      groupsForSend = Object.keys(this.groups);

      groupsForSend = groupsForSend.filter(groupName => !excludeGroupsNames.includes(groupName));

    }

    mes.system = this._addHistoryInSystem({system: mes.system});

    const sendMessages = [];

    for (const client of this.wss.clients) {

      if (!client.user) {
        continue;
      }

      if (client.readyState !== WebSocket.OPEN) {
        continue;
      }

      if (!meToo) {
        const exclude = await this._userIsMatched({matchedUser: fromUser, user: client.user});
        if (exclude) continue;
      }

      let send = await this._isSendMessage({forUser: client.user, users, excludeUsers, groupsForSend});

      if (!send && meToo) {
        send = await this._userIsMatched({matchedUser: fromUser, user: client.user});
      }

      if (!send) continue;

      const from = {
        fromUser: this._getUserForPublicMes({user: fromUser}),
        groups: groupsForSend.length ? groupsForSend : null
      };

      sendMessages.push((async () => {

        if (this.onBeforeSendMesTo && typeof this.onBeforeSendMesTo === 'function') {
          const res = await this.onBeforeSendMesTo({
            client,
            from,
            to,
            mes
          });
          if (!res) return false;
        }

        await this.sendMes({client, data: mes.data, route: mes.route, act: mes.act, from, system: mes.system});

        if (this.onAfterSendMesTo && typeof this.onAfterSendMesTo === 'function') {
          const res = await this.onAfterSendMesTo({
            client,
            from,
            to,
            mes
          });
          if (!res) return false;
        }

        return true;

      })());


    }

    await Promise.all(sendMessages.map(p => {
      return p.catch(err => this.consoleLog ? console.error(err) : '');
    }));
    // .then(res => {
    //   console.log(res);
    // });

    return true;

  }


  async _isSendMessage({forUser, users, excludeUsers, groupsForSend}) {

    if (excludeUsers.length) {

      for (const excludeUser of excludeUsers) {

        const exclude = await this._userIsMatched({matchedUser: excludeUser, user: forUser});
        if (exclude) return false;

      }

    }

    if (groupsForSend.length) {

      for (const groupName of groupsForSend) {

        const foundUser = this._getUserGroup({group: this.groups[groupName], user: forUser});
        if (foundUser && !users.length) return true;

        if (foundUser && users.length) {

          for (const user of users) {

            const include = await this._userIsMatched({matchedUser: user, user: forUser});
            if (include) return true;

          }

        }

      }

    } else if (users.length) {

      for (const user of users) {

        const include = await this._userIsMatched({matchedUser: user, user: forUser});
        if (include) return true;

      }

    }

    return false;

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

  async sendMes({client, data, route = null, act = null, awaitRes = null, callback = null, options = null, to = null, from = null, system = {}}) {

    if (this.wsClient) {

      const res = await this._sendMesClient({client, data, route, act, awaitRes, callback, options, to, from, system});
      if (awaitRes) {
        return res;
      }

    } else {

      try {

        if (!client && !to) {
          if (this.consoleLog) console.error('No client');
          if (this.onConsoleLog) await this._onProcessLog({log: `No client`});
          return false;
        }

        if (!data && !route && !act) {
          if (this.consoleLog) console.error('No data');
          if (this.onConsoleLog) await this._onProcessLog({log: `No data`});
          return false;
        }

        const uid = await this._processRes({route, act, data, awaitRes, callback, options, to, from, system});

        let mes = {
          route,
          act,
          data,
          uid,
          user: this.user,
          system: from ? system : this._addHistoryInSystem({system}),
          isRes: false
        };

        if (!client && to) {
          mes.to = to;
          mes.to.meToo = false;
          mes.system = null;
          await this._processBroadcastFrom({mes, fromUser: this.user});
          return true;
        }

        if (to) {
          mes.to = to;
        }

        if (from) {
          mes.from = from;
        }

        if (mes.user && typeof mes.user === 'object') {
          mes.user = this._getUserForPublicMes({user: mes.user});
        }
        client.send(JSON.stringify(mes));

        if (awaitRes) {
          return await this._awaitRes({uid});
        }

        return true;

      } catch (e) {

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
        if (this.onConsoleLog) await this._onProcessLog({log: `No data`});
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
          if (this.onConsoleLog) await this._onProcessLog({log: `Error broadcast object to: ${to}`});
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
      if (this.onConsoleLog) await this._onProcessLog({log: `Error sendMes ${e}`});
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

    if (this.wsClient) {
      return await this._addGroupClient({group});
    } else {
      return await this._addGroupServer({sender: this.user, group, mesSendServer: true});
    }

  }

  async _addGroupClient({group}) {

    return await this.sendMes({route: 'jrfws2Group', act: 'add', data: {group}, awaitRes: true});

  }

  async _addGroupServer({mes, sender, group, mesSendServer = false}) {

    const groups = Array.isArray(group) ? group : [group];

    for (const group of groups) {

      if (!group || typeof group !== 'object' || !group.name) {
        return false;
      }

      if (this.groups[group.name]) {
        return false;
      }

    }

    if (this.onBeforeAddGroup && typeof this.onBeforeAddGroup === 'function') {
      const res = await this.onBeforeAddGroup({mes, sender, group, mesSendServer});
      if (!res) return false;
    }

    for (const group of groups) {
      this.groups[group.name] = {
        name: group.name,
        description: group.description || '',
        users: []
      }
    }

    if (this.onAfterAddGroup && typeof this.onAfterAddGroup === 'function') {

      const res = await this.onAfterAddGroup({mes, sender, group, mesSendServer});

      if (!res) {

        for (const group of groups) {
          if (this.groups[group.name]) {
            delete this.groups[group.name];
          }
        }

        return false;

      }

    }

    return true;

  }

  async delGroup({group}) {
    if (this.wsClient) {
      return await this._delGroupClient({group});
    } else {
      return await this._delGroupServer({sender: this.user, group, mesSendServer: true});
    }
  }

  async _delGroupClient({group}) {

    return await this.sendMes({route: 'jrfws2Group', act: 'del', data: {group}, awaitRes: true});

  }

  async _delGroupServer({mes, sender, group, mesSendServer = false}) {

    const groups = Array.isArray(group) ? group : [group];
    const delGroups = [];

    for (const group of groups) {

      if (!group) {
        return false;
      }

      let groupName = null;
      if (typeof group === 'object' && group.name) {
        groupName = group.name;
      } else if (typeof group === 'string') {
        groupName = group;
      }

      if (!groupName || !this.groups[groupName]) {
        return false;
      }

      delGroups.push(this.groups[groupName]);

    }

    if (this.onBeforeDelGroup && typeof this.onBeforeDelGroup === 'function') {
      const res = await this.onBeforeDelGroup({mes, sender, group: delGroups, mesSendServer});
      if (!res) return false;
    }

    for (const group of delGroups) {
      delete this.groups[group.name];
    }

    if (this.onAfterDelGroup && typeof this.onAfterDelGroup === 'function') {

      const res = await this.onAfterDelGroup({mes, sender, group, mesSendServer});

    }

    return true;

  }

  async addUserToGroup({group, user}) {

    if (this.wsClient) {
      return await this._addUserToGroupClient({group, user});
    } else {
      return await this._addUserToGroupServer({sender: this.user, group, user, mesSendServer: true});
    }

  }

  async _addUserToGroupClient({group, user}) {

    return await this.sendMes({route: 'jrfws2Group', act: 'addUser', data: {group, user}, awaitRes: true});

  }

  async _addUserToGroupServer({mes, sender, group, user, mesSendServer = false}) {

    if (!group || !user) {
      return false;
    }

    const foundGroup = this._getGroup({group});
    if (!foundGroup) return false;

    const foundUser = this._getUserGroup({group: foundGroup, user});
    if (foundUser) return false;

    if (this.onBeforeAddUserToGroup && typeof this.onBeforeAddUserToGroup === 'function') {
      const res = await this.onBeforeAddUserToGroup({
        mes,
        sender,
        group: foundGroup,
        user,
        clients: this.wss.clients,
        mesSendServer,
      });
      if (!res) return false;
    }

    foundGroup.users.push(this._getUserForPublicMes({user}));

    if (this.onAfterAddUserToGroup && typeof this.onAfterAddUserToGroup === 'function') {
      const res = await this.onAfterAddUserToGroup({
        mes,
        sender,
        group: foundGroup,
        user,
        clients: this.wss.clients,
        mesSendServer,
      });
    }

    return true;

  }

  async delUserToGroup({group, user}) {

    if (this.wsClient) {
      return await this._delUserToGroupClient({group, user});
    } else {
      return await this._delUserToGroupServer({sender: this.user, group, user, mesSendServer: true});
    }

  }

  async _delUserToGroupClient({group, user}) {

    return await this.sendMes({route: 'jrfws2Group', act: 'delUser', data: {group, user}, awaitRes: true});

  }

  async _delUserToGroupServer({mes, sender, group, user, mesSendServer = false}) {

    if (!group || !user) {
      return false;
    }

    const foundGroup = this._getGroup({group});
    if (!foundGroup) return false;

    const foundUser = this._getUserGroup({group: foundGroup, user});
    if (!foundUser) return false;

    if (this.onBeforeDelUserToGroup && typeof this.onBeforeDelUserToGroup === 'function') {
      const res = await this.onBeforeDelUserToGroup({
        mes,
        sender,
        group: foundGroup,
        user,
        clients: this.wss.clients,
        mesSendServer,
      });
      if (!res) return false;
    }

    foundGroup.users.splice(foundUser.index, 1);

    if (this.onAfterDelUserToGroup && typeof this.onAfterDelUserToGroup === 'function') {
      const res = await this.onAfterDelUserToGroup({
        mes,
        sender,
        group: foundGroup,
        user,
        clients: this.wss.clients,
        mesSendServer,
      });
    }

    return true;

  }

  async getGroups() {
    if (this.wsClient) {
      return await this._getGroupsClient();
    } else {
      return await this._getGroupsServer({sender: this.user, mesSendServer: true});
    }
  }

  async _getGroupsClient() {

    return await this.sendMes({route: 'jrfws2Group', act: 'get', data: {}, awaitRes: true});

  }

  async _getGroupsServer({mes, sender, mesSendServer = false}) {

    if (this.onBeforeGetGroups && typeof this.onBeforeGetGroups === 'function') {
      const res = await this.onBeforeGetGroups({mes, sender, mesSendServer});
      if (!res) return false;
    }

    const groups = cloneDeep(this.groups);

    if (this.onAfterGetGroups && typeof this.onAfterGetGroups === 'function') {

      const res = await this.onAfterGetGroups({mes, sender, groups, mesSendServer});

    }

    return groups;

  }

  _getGroup({group}) {

    if (!group) {
      return false;
    }

    let foundGroup = null;
    if (typeof group === 'string') {
      foundGroup = group;
    } else if (typeof group === 'object' && group.name) {
      foundGroup = group.name;
    } else {
      return false;
    }

    foundGroup = this.groups[foundGroup];
    if (!foundGroup) return false;

    return foundGroup;

  }

  _getUserGroup({group, user, userSearchFields}) {

    if (!group || typeof group !== 'object' || !group.users
      || !Array.isArray(group.users) || !group.users.length) {
      return false;
    }


    for (let index = 0; index < group.users.length; index++) {

      const groupUser = group.users[index];
      const isMatched = this._userIsMatched({matchedUser: groupUser, user, userSearchFields});

      if (isMatched) {
        return {groupUser, index};
      }

    }

    return false;

  }

  _userIsMatched({matchedUser, user, userSearchFields}) {

    userSearchFields = userSearchFields || this.userSearchFields || ['email'];

    if (typeof matchedUser === 'string') {

      if (typeof user === 'string') {

        if (matchedUser.toLowerCase() === user.toLowerCase()) {
          return true;
        }

      } else if (typeof user === 'object') {

        for (const field of userSearchFields) {
          if (matchedUser.toLowerCase() === String(user[field]).toLowerCase()) {
            return true;
          }
        }

      }

    } else if (typeof matchedUser === 'object') {

      if (typeof user === 'string') {

        for (const field of userSearchFields) {
          if (String(matchedUser[field]).toLowerCase() === user.toLowerCase()) {
            return true;
          }
        }

      } else if (typeof user === 'object') {

        for (const field of userSearchFields) {
          if (typeof matchedUser[field] === 'undefined') continue;
          if (typeof user[field] === 'undefined') continue;
          if (String(matchedUser[field]).toLowerCase() === String(user[field]).toLowerCase()) {
            return true;
          }
        }

      }

    }

    return false;

  }

  _getUser({user, usersOnly = false, userSearchFields}) {

    if (!user) {
      return false;
    }

    if (!this.wss || !this.wss.clients) {
      return false;
    }

    const clients = this.wss.clients;
    let foundClients = [];

    userSearchFields = userSearchFields || this.userSearchFields || ['email'];

    for (const client of clients) {

      if (!client.user || typeof client.user !== 'object') continue;

      let isMatched = false;

      for (const field of userSearchFields) {

        if (typeof user === 'string') {

          if (client.user[field].toString().toLowerCase() === user.toLowerCase()) {
            isMatched = true;
            break;
          }

        } else if (typeof user === 'object') {

          if (client.user[field] === user[field]) {
            isMatched = true;
          } else {
            isMatched = false;
            break;
          }

        }

      }

      if (isMatched) {
        foundClients.push(client);
      }

    }

    if (usersOnly) {
      foundClients = foundClients.map(client => client.user);
    }

    return foundClients;

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

      await this._wait(this.cycleAwaitTimeout);

      const timeDiff = new Date() - timeStart;
      if (timeDiff >= timeout) {

        objUid.res = (objUid.res && typeof objUid.res === 'object') ? objUid.res : {};
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

  async _processRes({route = null, act = null, data = null, awaitRes = null, callback = null, options = null, to = null, from = null, system = {}} = {}) {

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

  _addServiceRouting() {

    this._routes.push({
      route: 'jrfws2Group',
      act: 'add',
      fn: async ({data, stop}) => {
        let mes = await this._parseMessage(data);
        stop();
        return await this._addGroupServer({
          mes,
          sender: mes.user,
          group: mes.data.group,
          mesSendServer: false
        });
      }
    });

    this._routes.push({
      route: 'jrfws2Group',
      act: 'del',
      fn: async ({data, stop}) => {
        let mes = await this._parseMessage(data);
        stop();
        return await this._delGroupServer({
          mes,
          sender: mes.user,
          group: mes.data.group,
          mesSendServer: false
        });
      }
    });

    this._routes.push({
      route: 'jrfws2Group',
      act: 'get',
      fn: async ({data, stop}) => {
        let mes = await this._parseMessage(data);
        stop();
        return await this._getGroupsServer({
          mes,
          sender: mes.user,
          mesSendServer: false
        });
      }
    });

    this._routes.push({
      route: 'jrfws2Group',
      act: 'addUser',
      fn: async ({data, stop}) => {
        let mes = await this._parseMessage(data);
        stop();
        return await this._addUserToGroupServer({
          mes,
          sender: mes.user,
          group: mes.data.group,
          user: mes.data.user,
          mesSendServer: false
        });
      }
    });

    this._routes.push({
      route: 'jrfws2Group',
      act: 'delUser',
      fn: async ({data, stop}) => {
        let mes = await this._parseMessage(data);
        stop();
        return await this._delUserToGroupServer({
          mes,
          sender: mes.user,
          group: mes.data.group,
          user: mes.data.user,
          mesSendServer: false
        });
      }
    });

  }

  _addHistoryInSystem({system}) {

    if (!system || typeof system !== 'object') {
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
      return (typeof user === 'string') ? user : {};
    }

    let userForPublicMes = cloneDeep(user);

    if (this.userIncludeFields && Array.isArray(this.userIncludeFields)) {

      userForPublicMes = {};

      for (const field of this.userIncludeFields) {

        if (typeof field !== 'string') continue;
        if (typeof user[field] === 'undefined') continue;

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

    if (!this.onConsoleLog || typeof this.onConsoleLog !== 'function') {
      return;
    }

    await this.onConsoleLog({log});

  }

};
