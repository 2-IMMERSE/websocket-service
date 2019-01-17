# Websocket Service  

## RESPONSIBILITY
The Websocket service is responsible for handling push notifications from a service or DMapp component, called publisher, to many devices or DMapps components, called subscribers. Publishers do not need know the connection of subscribers.

Currently, the websocket service supports two namespaces : [~/layout](#layout) and [~/lobby](#lobby)

## VERBS
Note: The following verbs are offered via the websocket client library. There is no additional APIs called are required.
- `CONNECT`: A service or DMapp component connects to Websocket service via websocket connection.
- `DISCONNECT`: A service or DMapp component disconnect from Websocket service.


### LAYOUT
Once a client is connected to the Websocket service in the `~/layout` namespace, it can send following events with an event type and event string in JSON format. 
The syntax of the notification is `[$EVENT_TYPE, $EVENT]`, where `EVENT_TYPE` is the type of event and `EVENT` is the data in JSON string format.

- `JOIN`: A client can join a room by sending a `JOIN` event with `$room_id` and `$nickname`. 
  - The syntax of the join event is: `[“JOIN“, {“room”: $room_id, “name”: $nickname}]`
- `NOTIFY`: A client can push a notification to the subscribers of a specific room with `NOTIFY` event with `$room_id`.
  - The syntax of the notify event is: `[“NOTIFY“, {“room”: $room_id, “message”: $message_string }]`
- `LEAVE`: A client can leave a room by sending a `LEAVE`.
  - The syntax of the leave event is:  `[“LEAVE“, {“room”: $room_id}]`
- `CLIENTS`: A client can use the ‘CLIENTS’ request to get the list of clients who have joined a particular room. The server will send the list of clients to the requested client only.
  - Request: `[“CLIENTS“, {“room”: $room_id}]`
  - Response: `[“CLIENTS”, {“room”: $room_id, “clients”: [$client1, $client2, …]}`

Clients should be listening on the `EVENT` type to receive notifications from other subscribers who have joined the same room and Namespace.

- `EVENT`: Once a client has joined a room, it should be listening on `EVENT` type notifications.
  - The syntax of the push notification is: `[“EVENT”, {“sender”: $publisher, “room”: $room_id, “message”: $message_string }`

### LOBBY  
The lobby namespace (i.e. ~/lobby) is now integrated with the lobby module implemented by Mark Lomas. Once a client is connected to the Websocket service in the `~/lobby` namespace, it can send following events.

- `JOIN`: A client can join a lobby by sending a `JOIN` event with `$lobby_id`. 
  - The syntax of the join event is: `[“JOIN“, $lobby_id]`
- `LEAVE`: A client can leave a room by sending a `LEAVE`.
  - The syntax of the leave event is:  `[“LEAVE“, $lobby_id]`
- `BROADCAST` : TBC
- `RTCSIGNAL` : TBC

# HTTP & HTTPS Connectoins  
Both HTTP and HTTPS connections are supported.
- MANTL
  - If you use the HTTPS connection, a valid certificated installed on Traefik (reverse proxy server) will be used.

- LOCAL
  - By default, the websocket-service will be run in HTTP mode. You can run it locally as follows:
    ```
    npm install
    node server.js
    ```
  - If you would like to the service in HTTPS mode locally, you can add `-S`/`—https` option and it will be run in HTTS mode with self-signed certificate.
    ```
    npm install
    node server.js --https
    ```
  - You can use `--help` to find out the options available in the websocket-service.
  - Note that if you run the service in HTTPS mode locally, you will need to set `rejectUnauthorized` to `false` in your client code. Otherwise, the connection won’t be able to establish.
     - e.g.  `skioc.connect('https://localhost:3000/layout', {rejectUnauthorized: false});`



# Wiki Page:
For details please see https://2immerse.eu/wiki/websocket-service/


## Licence and Authors

All code and documentation is licensed by the original author and contributors under the Apache License v2.0:

* Cisco and/or its affiliates (original author)

<img src="https://2immerse.eu/wp-content/uploads/2016/04/2-IMM_150x50.png" align="left"/><em>This project was originally developed as part of the <a href="https://2immerse.eu/">2-IMMERSE</a> project, co-funded by the European Commission’s <a hef="http://ec.europa.eu/programmes/horizon2020/">Horizon 2020</a> Research Programme</em>

See AUTHORS file for a full list of individuals and organisations that have
contributed to this code.
