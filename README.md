## Discord Proximity Chat

A browser extension and websocket server enabling proximity chat in Discord voice channels. The extension provides a 2D window populated with avatars of every user in a voice channel. Each connected user can click and drag their avatar with their mouse to move it around the window. As users move around, their volume will be dynamically changed depending on their distance from your avatar.  

There is a local only version that allows you to drag all users avatars around and volume control still works. This branch is tagged `local-only-version`.  

This was my entry to [Handmade Network's 2023 Wheel Reinvention Jam](https://handmade.network/jam/2023). It is a rough prototype and has a number of shortcomings.  

### Shortcomings
- Currently there is only a Firefox version of the extension.    
- It relies on css selectors to locate DOM elements used to control users volumes. It appears that the class names of these elements are dynamically generated, so you may need to update these if they change. Look in `firefox-extension/discord_controller.js` and search for `voice_user_selector` and `slider_selector`.  
- Volume changes and position update messages sent to the server only occur when you stop dragging your avatar, ideally these would happen while dragging with maybe some throttling  
- Networking is done using websockets, which use TCP, making it not ideal for getting real-time updates of users positions. Ideally this would use WebRTC. My understanding is that this is the only option for real-time networking in the web.  
- The websocket server does not send ping frames and receive pong frames to keep connections alive, so after some amount of time without receiving any messages the client will be disconnected.
- The server doesn't know anything about discord channels, it just accepts all connections and broadcasts user position udpates to every connected client.  
- The websocket server is just not good, I threw it together in desperation during the jam.  
- This really shouldn't even be a browser extension. Ideally this could be a standalone application that uses structured communication with Discord. Then it would work with any Discord client, not just in browser. However, their [developer documentation](https://discord.com/developers/docs/topics/rpc) shows that while this is theoretically possible using RPC, this functionality is currently not available to developers.  

### Install the Firefox Extension
1. In Firefox, type `about:debugging` in the address bar  
2. Select "This Firefox" in the left sidebar  
3. Click "Load Temporary Add-on"  
4. In the file browser, navigate to where you downloaded this repository and inside `firefox-extension` select `manifest.json`  

### Server
As of 2023-10-01, I have rented a droplet and am running a websocket server there. I will not be leaving it up very long. It is likely not still active. You can easily run your own (just install go, build the package `websocket_server` in this repo, and run it). By default it is listening on port 3333, you can change this in `websocket_server.go`. Search for `websocket_server_url` in `firefox-extension/background_script.js` to change the server url. You can alternatively try out the local only version of the browser extension by checking out the tag `local-only-version`.  

