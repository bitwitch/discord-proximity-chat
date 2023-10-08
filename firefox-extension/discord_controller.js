function init_discord_controller() {
	console.log("initializing discord controller");

	window.discord_controller_initialized = true;

	// temporary indicator that extension is executing
	document.body.style.border = "5px solid red";

	// add proximity chat window to dom
	let prox_chat_window = document.createElement("div");
	prox_chat_window.id = "proximity_chat_window"
	prox_chat_window.style.position = "absolute";
	prox_chat_window.style.zIndex = "99999999";
	prox_chat_window.style.right = "0";
	prox_chat_window.style.backgroundColor = "#ffffff";
	prox_chat_window.style.padding = "5px 5px 2px 5px";
	prox_chat_window.style.borderRadius = "5px";
	let header = document.createElement("div");
	header.style.display = "flex";
	header.style.justifyContent = "space-between";
	prox_chat_window.appendChild(header);
	let title = document.createElement("h3");
	title.innerText = "Discord Proximity Chat";
	title.style.fontWeight = "bold";
	title.style.padding = "5px 0px 8px 0px";
	header.appendChild(title);
	let close_button = document.createElement("div");
	close_button.style.cssText = "margin:5px 0px 8px;width:20px;height:20px;cursor:pointer;position:relative;";
	let cross1 = document.createElement("div")
	cross1.style.cssText = "width:20px;height:2px;background-color:black;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(45deg);";
	let cross2 = document.createElement("div")
	cross2.style.cssText = "width:20px;height:2px;background-color:black;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-45deg);";
	close_button.appendChild(cross1);
	close_button.appendChild(cross2);
	header.appendChild(close_button);
	let canvas = document.createElement("canvas");
	canvas.id = "voice_user_positions";
	canvas.width = 500;
	canvas.height = 500;
	canvas.style.backgroundColor = "teal";
	prox_chat_window.appendChild(canvas);
	document.body.appendChild(prox_chat_window);

	let avatar_radius = 12;

	window.discord_controller = {
		voice_user_selector: ".voiceUser-3nRK-K",
		slider_selector: ".slider-1mmyV6",
		right_arrow_event: new KeyboardEvent("keydown", {
			bubbles: true,
			code: "ArrowRight",
			key: "ArrowRight",
			keyCode: 39,
			isTrusted: true,
			nativeEvent: "keydown",
			type: "keydown",
		}),
		left_arrow_event: new KeyboardEvent("keydown", {
			bubbles: true,
			code: "ArrowLeft",
			key: "ArrowLeft",
			keyCode: 37,
			isTrusted: true,
			nativeEvent: "keydown",
			type: "keydown",
		}),
		contextmenu_event: new MouseEvent("contextmenu", {
			bubbles: true,
			button: 2,
			buttons: 0,
			composed: true,
			isTrusted: true,
			nativeEvent: "contextmenu",
			type: "contextmenu",
		}),

		click_event: new MouseEvent("click", {
			bubbles: true,
			button: 0,
			buttons: 0,
			clientX: 1,
			clientY: 1,
			composed: true,
			isTrusted: true,
			nativeEvent: "click",
			type: "click",
		}),
		voice_users: [],
		connections: [],
		client_user: {
			username: "",
			avatar: null,
			websocket_handle: -1,
		},

		// user positions canvas variables
		// ------------------------------
		prox_chat_window: prox_chat_window,
		canvas: canvas,
		ctx: canvas.getContext("2d"),

		avatar_radius: avatar_radius,
		silent_distance: 300,
		bg_color: "teal",

		mouse_input: {
			pos: {x:0, y:0},
			down: false,
			was_down: false
		},
		avatar_dragging: null,
		next_x: avatar_radius + 10,
		ready_to_send_messages: false,
		prev_ts: performance.now(),
		move_rate: 13,

		colors: [ "#F2BE22", "#F29727", "#F24C3D","#2E2A28", "#342A28", "#26577C", "#E55604", "#FF3FA4", "#451952", "#2B2730", "#6554AF", "#E966A0", "#9575DE", "#B70404", "#DB005B", "#F79327", "#8F475C", "#DB6386", "#8F5D2B", "#DB944D", "#8E6EDB", "#DB6142", "#DBD14D", "#DB7C39", "#3C24DB", "#F2689D", "#E864D9", "#F28168", "#7030E6", "#A932F0", "#C839D9", "#F032B4", "#E63051", "#D409E8", "#9E0AF2", "#5B13DB", "#200AF2", "#4D430C", "#471237", "#541913", "#3E1457", "#160F47", "#540725", "#5E0855", "#400747", "#9D1A02", "#4A3A35", "#190780", "#240054", "#240333", "#2F0230", "#030A45", "#3B0209", "#2E021C", "#7649E6", "#AB44FC", "#D441F2", "#4644FC", "#416EF2" ],

		avatars: [],
	};

	canvas.addEventListener("mousemove", function(e) {
		let rect = canvas.getBoundingClientRect();
		window.discord_controller.mouse_input.pos.x = e.clientX - rect.left;
		window.discord_controller.mouse_input.pos.y = e.clientY - rect.top;
	});

	canvas.addEventListener("mousedown", function(e) {
		window.discord_controller.mouse_input.down = true;
	});

	canvas.addEventListener("mouseup", function(e) {
		window.discord_controller.mouse_input.down = false;
	});

	close_button.addEventListener("click", function(e) {
		let client_user = window.discord_controller.client_user;
		if (client_user.websocket_handle != -1) {
			let message = { kind: "close_websocket", handle: client_user.websocket_handle };
			browser.runtime.sendMessage(message)
		}
		prox_chat_window.style.display = "none";
	});

	browser.runtime.onMessage.addListener((message, sender, send_response) => {
		if (message.kind === "server_updated_position") {
			console.log(`Received server updated position: ${message.username} (${message.position.x}, ${message.position.y})`);

			let client_user = window.discord_controller.client_user;
			if (client_user.username && client_user.username != message.username) {
				update_user_position(message.username, message.position);
			}
		} 
	});

	requestAnimationFrame(update);
}

function distance(p1, p2) {
	let x = p2.x - p1.x;
	let y = p2.y - p1.y;
	return Math.sqrt(x*x + y*y);
}


function pick_random_color() {
	let colors = window.discord_controller.colors;
	const index = Math.floor(Math.random() * colors.length);
	return colors[index];
}

function Avatar(id, username, image_url, x, y, is_client_user) {
	let image = new Image();
	let avatar = {
		"id": id,
		"image_loaded": false,
		"is_client_user": is_client_user,
		"image": image,
		"color": pick_random_color(),
		"username": username,
		"pos": {"x": x, "y": y},
		"target_pos": {"x": x, "y": y},
	};
	image.onload = () => avatar.image_loaded = true;
	image.crossorigin = "anonymous";
	image.src = image_url;

	return avatar;
}

function get_hovered_avatar() {
	let avatars = window.discord_controller.avatars;
	let mouse_input = window.discord_controller.mouse_input;
	let avatar_radius = window.discord_controller.avatar_radius;
	for (let avatar of avatars) {
		if (distance(mouse_input.pos, avatar.pos) < avatar_radius) {
			return avatar;
		}
	}
	return null;
}


function create_mousedown_event(clientX, clientY) {
	return new MouseEvent("mousedown", {
		bubbles: true,
		button: 0,
		buttons: 1,
		clientX: clientX,
		clientY: clientY,
		composed: true,
		isTrusted: true,
		nativeEvent: "mousedown",
		type: "mousedown",
	});
}

function create_mouseup_event(clientX, clientY) {
	return new MouseEvent("mouseup", {
		bubbles: true,
		button: 0,
		buttons: 1,
		clientX: clientX,
		clientY: clientY,
		composed: true,
		isTrusted: true,
		nativeEvent: "mouseup",
		type: "mouseup",
	});
}

function adjust_single_user_volume(avatar) {
	let client_user = window.discord_controller.client_user;
	let silent_distance = window.discord_controller.silent_distance;
	if (avatar && avatar.id != -1) {
		let dist = distance(avatar.pos, client_user.avatar.pos);
		let inverse_volume = dist / silent_distance;
		if (inverse_volume > 1) inverse_volume = 1;
		let volume = 1 - inverse_volume;
		set_user_volume(avatar.id, volume);
	}
}

async function adjust_user_volumes() {
	let avatar_dragging = window.discord_controller.avatar_dragging;
	let client_user = window.discord_controller.client_user;
	let avatars = window.discord_controller.avatars;
	let silent_distance = window.discord_controller.silent_distance;

	if (avatar_dragging && avatar_dragging == client_user.avatar) {
		let message = { 
			kind: "update_user_position", 
			handle: client_user.websocket_handle, 
			username: client_user.username, 
			position: client_user.avatar.pos };
		
		browser.runtime.sendMessage(message)
		.then(did_send => {
			if (!did_send) {
				console.log(`Failed to send position update websocket message: ${client_user.username} (${client_user.avatar.pos.x}, ${client_user.avatar.pos.y})`);
			}
		});

		for (let avatar of avatars) {
			if (avatar == client_user.avatar) continue;
			if (avatar.id == -1) continue;
			let dist = distance(avatar.pos, client_user.avatar.pos);
			let inverse_volume = dist / silent_distance;
			if (inverse_volume > 1) inverse_volume = 1;
			let volume = 1 - inverse_volume;
			await set_user_volume(avatar.id, volume);
		}
	} 
}

function update_user_position(username, position) {
	let avatars = window.discord_controller.avatars;
	for (let avatar of avatars) {
		if (avatar.username == username) {
			avatar.target_pos.x = position.x;
			avatar.target_pos.y = position.y;
			adjust_single_user_volume(avatar);
			break;
		}
	}
}


function update(ts) {
	let move_rate = window.discord_controller.move_rate;
	let mouse_input = window.discord_controller.mouse_input;
	let canvas = window.discord_controller.canvas;
	let ctx = window.discord_controller.ctx;
	let avatars = window.discord_controller.avatars;
	let avatar_radius = window.discord_controller.avatar_radius;
	let bg_color = window.discord_controller.bg_color;
	let client_user = window.discord_controller.client_user;

	let dt = ts - window.discord_controller.prev_ts;
	window.discord_controller.prev_ts = ts;

	let mouse_pressed = mouse_input.down && !mouse_input.was_down;
	let mouse_released = !mouse_input.down && mouse_input.was_down;

	let hovered_avatar = get_hovered_avatar();

	// drag and drop avatars 
	if (mouse_pressed) {
		if (hovered_avatar && hovered_avatar == client_user.avatar) {
			window.discord_controller.avatar_dragging = hovered_avatar;
		}
	} else if (mouse_released) {
		adjust_user_volumes();
		window.discord_controller.avatar_dragging = null;
	}

	if (window.discord_controller.avatar_dragging) {
		window.discord_controller.avatar_dragging.pos.x = mouse_input.pos.x;
		window.discord_controller.avatar_dragging.pos.y = mouse_input.pos.y;
		window.discord_controller.avatar_dragging.target_pos.x = mouse_input.pos.x;
		window.discord_controller.avatar_dragging.target_pos.y = mouse_input.pos.y;
	}

	// update positions
	for (let avatar of avatars) {
		if (avatar.pos.x != avatar.target_pos.x || avatar.pos.y != avatar.target_pos.y) {
			if (distance(avatar.pos, avatar.target_pos) < 0.1) {
				avatar.pos.x = avatar.target_pos.x;
				avatar.pos.y = avatar.target_pos.y;
			} else {
				avatar.pos.x += (avatar.target_pos.x - avatar.pos.x) * move_rate * dt;
				avatar.pos.y += (avatar.target_pos.y - avatar.pos.y) * move_rate * dt;
			}
		}
	}

	//
	// DRAW
	//
	ctx.fillStyle = bg_color;
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	for (let avatar of avatars) {
		// create circular clip region
		ctx.save();
		ctx.beginPath();
		ctx.arc(avatar.pos.x, avatar.pos.y, avatar_radius, 0, 2*Math.PI, true);
		ctx.closePath();
		ctx.clip();

		// draw image in clip region
		let image_x = avatar.pos.x - avatar_radius;
		let image_y = avatar.pos.y - avatar_radius;
		if (avatar.image_loaded) {
			ctx.drawImage(avatar.image, image_x, image_y, 2*avatar_radius, 2*avatar_radius);
		} else { 
			ctx.fillStyle = avatar.color;
			ctx.fill();
			//ctx.drawImage(logo, image_x, image_y, 2*avatar_radius, 2*avatar_radius);
		}

		ctx.restore();
	}

	if (hovered_avatar) {
		let x = hovered_avatar.pos.x - avatar_radius;
		let y = hovered_avatar.pos.y - avatar_radius - 5;
		ctx.font = "12px monospace";
		ctx.fillStyle = "black";
		let name = hovered_avatar.username;
		if (hovered_avatar.is_client_user) {
			name += " (me)";
		}
		ctx.fillText(name, x, y);
	}

	window.discord_controller.mouse_input.was_down = mouse_input.down;

	requestAnimationFrame(update);
}


function wait_for_element(selector) {
    return new Promise(resolve => {
        if (document.querySelector(selector)) {
            return resolve(document.querySelector(selector));
        }

        const observer = new MutationObserver(mutations => {
            if (document.querySelector(selector)) {
                observer.disconnect();
                resolve(document.querySelector(selector));
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    });
}

function close_context_menu() {
	document.dispatchEvent(window.discord_controller.click_event);
}

async function set_user_volume(user_id, volume) {
	let user = window.discord_controller.voice_users[user_id];
	if (!user) return;

	user.dispatchEvent(window.discord_controller.contextmenu_event);
	let context_menu = await wait_for_element("#user-context");
	let slider = document.querySelector(window.discord_controller.slider_selector);

	if (slider) {
		let rect = slider.getBoundingClientRect();
		let x = rect.left + slider.clientWidth * volume;
		let y = rect.y + 0.5 * rect.height;
		let mousedown_event = create_mousedown_event(x, y);
		slider.dispatchEvent(mousedown_event);
	}

	close_context_menu();
}

// This will get called each time the browser extension button is clicked
(async function() {
	if (!window.discord_controller_initialized) {
		init_discord_controller();
	}

	window.discord_controller.prox_chat_window.style.display = "block";

	window.discord_controller.next_x = window.discord_controller.avatar_radius + 10,
	window.discord_controller.voice_users = document.querySelectorAll(window.discord_controller.voice_user_selector);
	window.discord_controller.avatars = [];

	let client_user = window.discord_controller.client_user;
	let avatar_radius = window.discord_controller.avatar_radius;
	let voice_users = window.discord_controller.voice_users;
	let avatars = window.discord_controller.avatars;

	// TEMPORARY
	//avatars.push(Avatar(-1, "Old Johnson", "", 300, 320, false));
	//avatars.push(Avatar(-1, "Wendell T", "", 100, 100, false));
	//avatars.push(Avatar(-1, "Jerden Vanderbilt", "", 150, 250, false));

	for (let i=0; i<voice_users.length; ++i) {
		let user = voice_users[i];
		let img = user.children[0].children[0];
		let name = user.children[0].children[1];
		let username = name ? name.innerText : "Unknown";
		let image_url = img.style.backgroundImage;
		image_url = image_url.replace('url("', "").replace('")', "");

		user.dispatchEvent(window.discord_controller.contextmenu_event);
		let context_menu = await wait_for_element("#user-context");
		let user_volume = document.getElementById("user-context-user-volume");
		let is_client_user = !user_volume;
		close_context_menu();

		let x = window.discord_controller.next_x;
		let avatar = Avatar(i, username, image_url, x, 30, is_client_user);
		avatars.push(avatar);
		window.discord_controller.next_x += 2*avatar_radius + 10;

		if (is_client_user) {
			client_user.username = username;
			client_user.avatar = avatar;
			browser.runtime.sendMessage({kind: "initialize_websocket", username: username, position: avatar.pos})
			.then(response => {
				console.log("runtime message response: ", response);
				client_user.websocket_handle = response;
			});
		}
	}

	console.log("made it to the end");
})();

