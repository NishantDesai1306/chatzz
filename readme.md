# Chatzz
##### A [NodeJS](https://nodejs.org/en/) + [Socket.IO](https://socket.io/) based framework for creating a  chat application.

## How to install
```
npm install chatzz --save
```

## How to Use ?
```
var express = require('express');
var mongoose = require('mongoose');
var app = express();
var server = require('http').Server(app);

mongoose.connect('mongodb://localhost/chatzz-db').then(function() {
    chatzz.init(server, [chatzzConfig]);
});
...  // configure your express server here
...   
...
server.listen(port, function() {
    console.log('server started on port', port);
});
```

## Documentation
* **ChatzzConfig**
  Chatzz config is simple object with following properties
    1. `userModeName` (default: 'User'): It is the name of your user's model
    2. `chatUserModelName` (default: 'ChatUser'): It is a collection created by Chatzz to maintain list of Chat Users
    3. `beforeSendingUserDetails` : It is the function which returns a promise. This function is called when populating the user object residing in ChatUser document. By default this function just simply populate the first level properties  of the User model.

* **Events**
    Events are the heart of Socket.IO, these events are used for the communication between Client and Server and vice versa.
    
    **Event emitted by server**
    
    Server will always return data by emitting event `chatzz` and every `chatzz` event will send a JSON object as data with two fields in it.
	
    1. `type` : an enum which can have possible values of `user-details`, `chat-user-status-changed`, `new-message`, `message-status-changed` and  `old-messages`.
    2. `data`: a JSON object with containing data relevant to the emitted event type.

    **Events emitted by Client**

    **1**. `connect-user`: emit this event from client side to register the user in the chat system with this data `{ userId: // userId of logged in user }`.
    
    Server will emit `chatzz` event with following details to the user who just logged in
  ```
  {
    type: 'user-details',
    data: {
      user: { // user details },
      status: 'online' or 'offline',
      lastOnline: 'date-time string',
      connectedUsers: [
        // array of users object connected to the requesting user
      ],
      missedMessages: {
        'userId1': [
          // messages missed from user user1
        ],
        'userId2': [
          // message Ids missed from user user2
        ]
      }
    }
  }
  ```
   
	Server will also emit `chatzz` event with following data for all the `connectedUsers` who is connected to the user who just logged in.
	```
  {
    type: 'user-status-changed`,
    data: {
      lastOnline: // date-time string
      status: 'online',
      user: {
        // user details of this user who just disconnected
      }
    } 
  }
  ```
  
	**2**. `add-chat-user`: Client should emit this event when the corresponding user wants to add another user as its `connectedUser` (see connectedUser field in object returned from server on emitting `user-details` event) to from client side to register the user in the chat system with this data `{ userToAdd: <user id of another user> }`
    
  `Server will not emit any event as part of this function.`
  

	**3**. `get-old-messages`: Client should emit this event when it wants to fetch old messages from chat with another user with following data.
  ```
  { 
    userId: // userId of another user
    [date]: // date from which you want to your messages
  } 
  ```
  Server will emit `chatzz` event with following details
  ```
  {
    type: 'old-messages,
    data: [
      //array of message object
      {
        _id: // object id of the message,
        createdAt: //date-time string representing when the message was created,
        from: { //user details of User who sent this message},
        to: { // user details of User to whom the message was sent },
        message: //actual message',
        status: // could be any one of 'not_sent', 'sent' or 'read'
      }
    ]
  } 
  ```
  
	**4**. `send-message`: Client should emit this event with following data when it wants to send a message to another user.
  ```
  { 
    toUser: //user id of another user
    message: //message string which Client wants to send
  } 
  ```
  Server will emit `chatzz` event with following details
  Server will emit two events one for sender and one for receiver with following data
	```
  {
    type: 'new-message'
    data: {
      _id: // object id of the message,
      createdAt: //date-time string representing when the message was created,
      from: { //user details of User who sent this message},
      to: { // user details of User to whom the message was sent },
      message: //actual message',
      status: // could be any one of 'not_sent', 'sent' or 'read'
    } 
  }
  ```  
  
	**5**. `message-read`: Client should emit this event with following data when it wants to notify the server that it has read the message.
  ```
  { 
    messageId: //id of the message about which Client wants to notify the Server
  } 
  ```
	Server will emit a `chatzz` event for sender of this message with following data
	```
  {
    type: 'message-status-changed`,
    data: {
      _id: // object id of the message,
      createdAt: //date-time string representing when the message was created,
      from: { //user details of User who sent this message},
      to: { // user details of User to whom the message was sent },
      message: //actual message',
      status: 'read'
    } 
  }
  ```  
	**5**. `disconnect`: Client should emit this event when it want to notify the Server that it is leaving.
  ```
  // no data is required 
  ```
	Server will emit a chatzz event for all `connectedUsers` of this user with following data
	```
  {
    type: 'user-status-changed`,
    data: {
      lastOnline: // date-time string,
      status: 'offline',
      user: {
        // user details of this user who just disconnected
      }
    } 
  }
  ```  
