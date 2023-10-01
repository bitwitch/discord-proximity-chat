let websocket_connections = [];

// maps message kind string to the integer used to identify message kinds on the server
const message_kind_table = {
	"add_user": 1,
	"update_position": 2,
	"remove_user": 3,
	"acknowledge": 4,
};

function initialize_websocket(username, position) {
	let websocket_server_url = "ws://localhost:3333/proxchat";
	let index = websocket_connections.length;

	let socket = null;
	try {
		socket = new WebSocket(websocket_server_url);
	} catch (err) {
		console.log("websocket connection failed: ", err);
		return -1;
	}

	socket.addEventListener("error", (e) => {
		console.log("websocket error: ", e);
	});

	socket.addEventListener("open", (e) => {
		let message = {
			kind: message_kind_table["add_user"],
			username: username,
			x: position.x,
			y: position.y,
		};
		console.log("open, sending message: ", message);
		socket.send(JSON.stringify(message))
	});

	socket.addEventListener("close", (e) => {
		console.log("websocket close: ", e);
	});


	// Listen for messages
	socket.addEventListener("message", (e) => {
		console.log("Message from server ", e);
		let server_message;
		try {
			server_message = JSON.parse(e.data);
		} catch (err) {
			console.log("Failed to parse message from websocket server as json: ", err);
			return;
		}

		console.log(server_message);

		if (server_message.kind == message_kind_table["acknowledge"]) {
			console.log("received acknowledgement from websocket server");
		} else if (server_message.kind == message_kind_table["update_position"]) {
			let internal_message = {
				kind: "server_updated_position",
				username: server_message.username,
				position: { x: server_message.x, y: server_message.y },
			};
			//browser.tabs.query({ currentWindow: true, active: true })
			browser.tabs.query({ active: true })
			.then(tabs => {
				for (let tab of tabs) {
					browser.tabs.sendMessage(tab.id, internal_message)
				}
			});

		} else {
			console.log("Received message of unknown kind from server: ", server_message);
		}
	});

	websocket_connections.push(socket);
	return index;
}

function update_user_position(handle, username, position) {
	if (handle < 0) {
		console.log(`attempting to update position of ${username} to (${position.x}, ${position.y}), but it has an invalid websocket handle`);
		return false;
	}
	let socket = websocket_connections[handle];
	try {
		let message = {
			kind: message_kind_table["update_position"],
			username: username,
			x: position.x,
			y: position.y,
		};
		socket.send(JSON.stringify(message));
	} catch (err) {
		console.log("failed to send websocket message to update user position: ", err);
		return false;
	}
	return true;
}


browser.browserAction.onClicked.addListener(tab => {
	browser.tabs.executeScript({file: "/discord_controller.js"})
	.then(() => console.log("discord controller script executed"))
	.catch(console.error);
});

browser.runtime.onMessage.addListener((message, sender, send_response) => {
	if (message.kind === "initialize_websocket") {
		let socket_handle = initialize_websocket(message.username, message.position);
		send_response(socket_handle);
	} else if (message.kind === "update_user_position") {
		let did_send = update_user_position(message.handle, message.username, message.position);
		send_response(did_send);
	}
});


