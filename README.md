# jrfws2

**jrfws2** is **async/await** package for creating **real-time api** based on **websockets**. It is a wrapper over easy and fast [ws](https://www.npmjs.com/package/ws). It can work independently or in conjunction with [koa](https://www.npmjs.com/package/koa).

[readme_ru](README_RU.md)

![jrfwslogo](jrfwslogo.png)

## Server

### Start server

```js
const {JRFWSServer} = require('jrfws2');  
const jrfwsServer = new JRFWSServer();  
  
async function initServer() {

  /// any code	
  
  let opt = {  
  port: 3003  
  };  
  /// default port: 3001  
  await jrfwsServer.startServer(opt);  
}  
  
initServer();
```

You can read more about **opt** servers from the official documentation [ws](https://github.com/websockets/ws/blob/master/doc/ws.md#new-websocketserveroptions-callback)

### Start server with Koa

```js
const Koa = require('koa');    
const app = new Koa();  
const {JRFWSServer} = require('jrfws2');  
const jrfwsServer = new JRFWSServer();  

/// any code

/// http
jrfwsServer.attach(app);
app.listen(3001);

/// or https
jrfwsServer.attach(app, true, {
  key: fs.readFileSync(...),
  cert: fs.readFileSync(...),
  ca: fs.readFileSync(...)
});
app.listen(3001);

/// app.jrfws
```

## Client

To establish a connection, you must specify the address `url` and where the client `browserClient: true` starts.
You can specify the parameter `reconnect` - `true` try to reconnect to the server, after a break,
`false` - do not restore the connection.

```js
const {JRFWSClient} = require('jrfws2');
const jrfwsClient = new JRFWSClient();
await jrfwsClient.startClient({url: `ws://localhost:${PORT}`});

import {JRFWSClient} from 'jrfws2';
const jrfwsClient = new JRFWSClient();
await jrfwsClient.startClient({url: `ws://localhost:${PORT}`, browserClient: true});
```

**hook** - `this.onOpen = async (args) => {};` fulfills when connecting to the server.

**hook** - `this.onError = async (args) => {};` works if a connection to the server fails.

**hook** - `this.onClose = async (args) => {};` executes when the connection to the server is closed.

**hook** - `this.onMessage = async (args) => {};` executes when a message arrives from the server.

## Routing

To process incoming messages, you need to configure routing.

```js
await jrfws.route(route, act, func(data, stop));
```

| param | type | required | description |
| --- | --- | --- | --- |
| route | string | | Path |
| act | string | | Action on the path |
| func | function | true | Receiving asynchronous function: **data** - received data, **stop** - asynchronous function, the call of which will suspend the subsequent routing |

**data** consists of

| param | type | description |
| --- | --- | --- |
| uid | string | id of the incoming message. Filled when the sender is waiting for a response to the message |
| isRes | boolean | **true** - the message is a response to the sent message |
| user | object | User who sent the message |
| data | any | Any type of data sent in a message |
| route | string | Message path |
| act | string | Action on the message path |
| system | object | System Information Messages |
| client | object | The client (client connection) that sent the message. The internal client object **ws**, to which the **sendMes** method has been added. This option is available only on the server. |
| from | object | Message initiator data. Only populated with **broadcast**. |

An example of adding routing handlers. Handlers are executed in the order in which they were added.
The exception is the system handler **not found**, which is always executed last.

```js
  // Will process all messages since route and act are not set
  await jrfwsSrv.route({
          func: async ({data, stop}) => {
            
          }
        });
    
  // Will process all messages with route === 'users'
  // Stops further routing stop ()
  // If the sender expects a response to the message, then it will return 'users'
  await jrfwsSrv.route({
          route: 'users',
          func: async ({data, stop}) => {
            stop();
            return 'users';
          }
        });
    
  // Will process all messages with route === 'users' and act === 'add'
  // Send a message to all clients about adding a new user to: {}
  // If the sender expects a response to the message, then the added user will be returned
  await jrfwsSrv.route({
          route: 'users',
          act: 'add',
          func: async ({data, stop}) => {
            const user = addUser({user: data.data.user});
            await jrfwsSrv.sendMes({route: 'users', act: 'add', data: {user}, to: {}});
            return user;
          }
        });

  // Will process all messages with route === 'users' and act === 'get'
  // Such a handler is possible only on the server since used by data.client.sendMes
  // The handler will send a message to the client of the processed message
  await jrfwsSrv.route({
          route: 'users',
          act: 'get',
          func: async ({data, stop}) => {
            const users = await getUsers({filter: data.data.filter});
            await data.client.sendMes({route: 'users', act: 'get', data: {users}});
          }
        });

  // Will process all messages for which routing has not been suspended
  // previous handlers since route and act are not set
  await jrfwsSrv.route({
          func: async ({data, stop}) => {
            
          }
        });

  // Special handler. Will process messages for which there are no handlers
  // by route and (or) act
  await jrfwsSrv.route({
          route: 'not found',
          func: async ({data, stop}) => {

          }
        });
```

## Message

A message consists of various data.

| param | type | description |
| --- | --- | --- |
| uid | string | id of the incoming message. Filled when the sender is waiting for a response to the message |
| isRes | boolean | **true** - the message is a response to the sent message |
| user | object | User who sent the message |
| data | any | Any type of data sent in a message |
| route | string | Message path |
| act | string | Action on the message path |
| system | object | System Information Messages |
| client | object | The client (client connection) that sent the message. The internal client object **ws**, to which the **sendMes** method has been added. This option is available only on the server. |
| from | object | Message initiator data. Only populated with **broadcast**. |

**user** - The user consists of fields specified in `jrfws.user`.

Default.

```js
this.user = {
      username: '',
      email: '',
      token: '',
      rights: null,
      phone: '',
      uid: this._generateId()
    };
```

**system** - System information. Contains an array of the message history `system.history`.
The user’s history removes the confidential fields listed in `this.userExcludeFields = ['rights', 'token'];`

Each element of the story contains.

| param | type | description |
| --- | --- | --- |
| user | object | The user who processed the message |
| date | date | Date message processing time |

```js
system: {
  history: [{
    user:
      {
        email: 'rick@rick.rc',
        phone: 'rick phone',
        username: 'rick',
        uid: 'FcEKAIwnuvZYUcJ16112019215436216'
      },
    date: '2019-12-16T18:54:37.750Z'
  },
    {
      user:
        {
          email: '',
          phone: '',
          username: 'server',
          uid: 'IaaVTHnmRANpDum16112019215220182'
        },
      date: '2019-12-16T18:54:37.752Z'
    },
    {
      user:
        {
          email: 'mrshitman@shitman.sh',
          phone: 'mr. shitman phone',
          username: 'mr. shitman',
          uid: 'UbHtILtgKDmknAO16112019215436217'
        },
      date: '2019-12-16T18:54:37.754Z'
    }]
},
```

**from** - Data of the initiator of the message. Only populated with **broadcast**.
The user deletes the confidential fields listed in `this.userExcludeFields = ['rights', 'token'];`

Comprises

| param | type | description |
| --- | --- | --- |
| fromUser | object | The user who sent the message |
| groups | array | Array of names of groups of message recipients |

```js
from: {
  fromUser:
    {
      email: 'rick@rick.rc',
      phone: 'rick phone',
      username: 'rick',
      uid: 'PahjwMXZfaWLEPN16112019214327265'
    },
  groups: ['megaBrainzzz', 'space', 'waterWorld']
}
```

## Send message

A message is sent using the `jrfws.sendMes ({params})` method.

Parameters.

| param | type | description |
| --- | --- | --- |
| route | string | Way |
| act | string | Action on the way |
| data | any | Data of any type |
| awaitRes | boolean | Wait for reply to message |
| callback | function | Execute **callback** when the message comes back |
| options | object | Additional message options. Currently there is only one option **timeout** for parameters **awaitRes** and **callback** |
| to | object | Parameters **broadcast** |
| client | object | The client (one of `jrfws.wss.clients`) to whom you want to send a message. This option is available only on the server. |

### Simple send

The message is simply sent.

```js 
await jrfws.sendMes({route: 'users'});

await jrfws.sendMes({route: 'users', act: 'get'});

await jrfws.sendMes({route: 'users', act: 'add', data: {
  user: {username: 'rick', email: 'rick@rick.rc'}
});
```

### Wait for a response to the message

The message is sent, the program waits for a response to the message.

If the wait time is longer than `this.timeout = 10000`, then the answer will be
`error: {message: 'timeout: 10000'}` and will execute the `this.onTimeout` handler, which will
  passed the parameter `data`

| param | type | description |
| --- | --- | --- |
| uid | string | message id |
| user | object | User who sent the message |
| route | string | Message path |
| act | string | Action on the message path |
| system | object | System Information Messages |
| timeout | number | Maximum time to wait for a response |
| res | object | Message reply. Will contain error |

```js
// set default timeout; default = 10000
jrfws.timeout = 5000;

jrfws.onTimeout = async ({data}) => {
      console.error(`Timeout: ${data.timeout} ms; uid: ${data.uid}; route: ${data.route}; act: ${data.act}`);
    };

// default timeout
const res = await jrfws.sendMes({route: 'users', awaitRes: true});

// custom timeout
const res = await jrfws.sendMes({route: 'users', awaitRes: true, options: {timeout: 1000}});
```

### Callback

A message is being sent. Callback expects a `data` response.

| param | type | description |
| --- | --- | --- |
| uid | string | id of the incoming message. Filled when the sender is waiting for a response to the message |
| isRes | boolean | **true** - the message is a response to the sent message |
| user | object | User who sent the message |
| data | any | Any type of data sent in a message |
| route | string | Message path |
| act | string | Action on the message path |
| system | object | System Information Messages |

If the wait time is longer than `this.timeout = 10000`, then the answer will be
`error: {message: 'timeout: 10000'}` and will execute the `this.onTimeout` handler, which will
  passed the parameter `data`

| param | type | description |
| --- | --- | --- |
| uid | string | message id |
| user | object | User who sent the message |
| route | string | Message path |
| act | string | Action on the message path |
| system | object | System Information Messages |
| timeout | number | Maximum time to wait for a response |
| res | object | Message reply. Will contain error |

```js
// set default timeout; default = 10000
jrfws.timeout = 5000;

jrfws.onTimeout = async ({data}) => {
      console.error(`Timeout: ${data.timeout} ms; uid: ${data.uid}; route: ${data.route}; act: ${data.act}`);
    };

async function callback({data}) {
  console.log(JSON.stringify(data));
}

// default timeout
const res = await jrfws.sendMes({route: 'users', callback});

// custom timeout
const res = await jrfws.sendMes({route: 'users', callback, options: {timeout: 1000}});
```

### Send broadcast

For **broadcast** messages, the `to` parameter must be passed. If the parameter is empty,
This message will be sent to all users. If the recipient user
multiple client connections, then all user clients will receive a message.
The user identification for `this.user` occurs by the unique fields of` this.userSearchFields`.
In the message sent to the client, the confidential fields `this.userExcludeFields = ['rights', 'token'];` will be deleted from all user objects.

| param | type | description |
| --- | --- | --- |
| users | string | The user who will receive the message. The string value of one of the unique fields of the user `this.userSearchFields = ['username', 'email', 'phone']` |
| users | array | Users who receive the message. There can be string values ​​of unique user fields, as well as user objects |
| excludeUsers | string | Exclude user from recipients. The string value of one of the unique fields of the user `this.userSearchFields = ['username', 'email', 'phone']` |
| excludeUsers | array | Exclude users from recipients. There can be string values ​​of unique user fields, as well as user objects |
| groups | string | The name of the group whose users will receive the message |
| groups | array | The groups whose users will receive messages. There can be both lines and group objects |
| excludeGroups | string | Name of group to exclude from recipients |
| excludeGroups | array | Groups to be excluded from recipients. There can be both lines and group objects |
| meeTo | boolean | **true** - send message to yourself |

```js
// send all users
await jrfws.sendMes({data: 'hello', to: {}});

await jrfws.sendMes({
  route: 'chat',
  act: 'say',
  data: 'hello',
  to: {
    users: 'rick'
  }
});

await jrfws.sendMes({
  route: 'chat',
  act: 'say',
  data: 'hello',
  to: {
    users: ['rick', {email: 'morty@morty.mr'}]
  }
});

await jrfws.sendMes({
  route: 'chat',
  act: 'say',
  data: 'hello',
  to: {
    excludUsers: ['rick', {email: 'morty@morty.mr'}]
  }
});

await jrfws.sendMes({
  route: 'chat',
  act: 'say',
  data: 'hello',
  to: {
    groups: ['space', {name: 'waterLand'}],
    excludUsers: ['rick', {email: 'morty@morty.mr'}]
  }
});
```

**hook** - `this.onBeforeSendMesTo` executes before sending a message from the server to the client.
If returns `true`, then the message is sent. Parameters `client, from, to, mes`.

**hook** - `this.onAfterSendMesTo` executes after sending a message from the server to the client.
Parameters `client, from, to, mes`.

### Hooks params

| param | type | description |
| --- | --- | --- |
| client | object | The client connection to which the message is sent |
| from | object | The user who sent the message `fromUser`. Groups for which the message `groups` |
| to | object | Broadcast options |
| mes | object | Message to customer |

## Groups

Groups contain users to whom broadcast messages will be sent.

The `add, get, del` methods are available on the server and client. The groups themselves are stored on the server,
hooks are also available on the server.

### addGroup

Add group(s) will return `true` or` false`. Accepts the `group` parameter
contain an array of groups.

| param | type | description |
| --- | --- | --- |
| name | string | The name of the group. must be unique |
| description | any | Group Description |

```js
const res = await jrfws.addGroup({group: {name: 'space'}});

const res = await jrfws.addGroup({group: [{name: 'space'}, {name: 'waterWorld'}]});
```

**hook** - `this.onBeforeAddGroup` fulfills before adding a group.
If returns `true`, then the group is added. Parameters `mes, group, mesSendServer`.

**hook** - `this.onAfterAddGroup` executes after adding a group.
If it returns not `true`, then the group is deleted. Parameters `mes, group, mesSendServer`.

### delGroup

Delete group(s) will return `true` or` false`. Takes the `group` parameter, maybe
contain an array of groups.

| param | type | description |
| --- | --- | --- |
| group | string | Group name |
| group | object | Group Object |
| group | array | Array of groups |

```js
const res = await jrfws.delGroup({group: 'space'});

const res = await jrfws.delGroup({group: {name: 'space'}});

const res = await jrfws.delGroup({group: ['space', {name: 'waterWorld'}]});
```

**hook** - `this.onBeforeDelGroup` fulfills before deleting the group.
If returns `true`, then the group is deleted. Parameters `mes, group, mesSendServer`.

**hook** - `this.onAfterDelGroup` completes the deletion of the group.
Parameters `mes, group, mesSendServer`.

### getGroups

Get groups.

```js
const groups = await jrfws.getGroups();
```

**hook** - `this.onBeforeGetGroup` fulfills before receiving groups.
If returns `true`, then a list of groups will be formed. Parameters `mes, mesSendServer`.

**hook** - `this.onAfterGetGroup` executes after receiving groups.
Parameters `mes, groups, mesSendServer`.

### Hooks params

| param | type | description |
| --- | --- | --- |
| mes | object | Message action initiator |
| group | array/string/object | Group |
| groups | object | Groups `{group1: {name: 'group1', description: '', users: []}, group2: {name: 'group2', description: '', users: []}}` |
| mesSendServer | boolean | `true` - initiator of the server action,` false` - initiator of the client |

### addUserToGroup

Add user to group. Will return `true` or` false`. Accepts the parameters `group` and` user`.

| param | type | description |
| --- | --- | --- |
| user | string/object | Whose user you want to add to the group |
| group | string/object | Group to which user is added |

**hook** - `this.onBeforeAddUserToGroup` fulfills before adding a user.
If returns `true`, then the user is added to the group. Parameters `mes, group, user, clients, mesSendServer`.

**hook** - `this.onAfterAddUserToGroup` executes after adding a user.
Parameters `mes, group, user, clients, mesSendServer`.

### delUserToGroup

Remove user from group. Will return `true` or` false`. Accepts the parameters `group` and` user`.

| param | type | description |
| --- | --- | --- |
| user | string / object | The user whose you want to remove from the group |
| group | string / object | The group from which the user is deleted |

**hook** - `this.onBeforeDelUserToGroup` fulfills before deleting the user.
If returns `true`, then the user is removed from the group. Parameters `mes, group, user, clients, mesSendServer`.

**hook** - `this.onAfterDelUserToGroup` executes after deleting the user.
Parameters `mes, group, user, clients, mesSendServer`.

### Hooks params

| param | type | description |
| --- | --- | --- |
| mes | object | Message action initiator |
| group | string/object | Group |
| user | string/object | User |
| clients | set | Client Connection Collection `this.wss.clients` |
| mesSendServer | boolean | `true` - initiator of the server action,` false` - initiator of the client |

## User

**User** is a user object that identifies the server and client connection.
One user can have several client connections at the same time.
For example, connections from different devices.
 
By default, the user has the following fields. But they can be changed.

```js
this.user = {
      username: '',
      email: '',
      token: '',
      rights: null,
      phone: '',
      uid: this._generateId()
    };
```

To identify the user in client connections. Unique fields are set.

Default.

```js
this.userSearchFields = ['username', 'email', 'phone'];
```

To send user information to a message. You can define a list of fields.

Default.

```js
this.userIncludeFields = ['email', 'phone', 'username', 'uid'];
```

In order not to transmit confidential information in messages. You can define a list of fields.

Default.

```js
this.userExcludeFields = ['rights', 'token'];
```

## User Authentication

When a message arrives, it is checked that the user is mapped to a client connection.
If the user is not mapped, the user `this.defaultClientUser` is assigned to the client connection.

Next, the authentication function `this.auth` is executed, if one is defined. After fulfills the routing of the message.

`this.auth = async ({user, data, client, action}) => {};`

`user` - The user of the client connection (on the server side)` user` is a copy of `client.user`

`data` - This is a message received from the client.

`data.user` - Client connection user (on the client side). You can, for example, check `user.token` and` data.user.token`.

`client` - Client connection. Which has a method of `client.sendMes`. Associated user `client.user`.

`action` - Authentication actions` object {stop: false, terminate: false} `.
`action.stop = true` - stop message routing, client connection is not disconnected.
`action.terminate = true` - break the client connection.

```js
jrfwsSrv.auth = async ({user, client, data, action}) => {

if (data.route !== 'auth') {

  if (!data.user || !data.user.token) {

    action.stop = true;
    return;

  } else {

    action.stop = !data.user.token.includes('token');
    return;

  }

}

if (!data.user || !data.user.email) {
  action.stop = false;
  return;
}

client.user = data.user;

}
```

## Logging

By default, all logs are displayed in `console`. The output to `console` can be undone by` jrfws.consoleLog = false`.

You can set the log processing function `jrfws.onConsoleLog = async ({log}) => {}`.

| log | client / server | description |
| --- | --- | --- |
| WebSocket connection established | client | Server connection established |
| WebSocket error | client | Error connecting to server |
| No client | server | Attempting to send a message without specifying a client connection |
| No data | all | Trying to send a message without specifying `data, route, act` |
| Error broadcast object to: $ {to} | all | Unsuccessful attempt to `broadcast` |
| Error sendMes $ {e} | all | Error sending message |

