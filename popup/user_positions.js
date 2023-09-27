console.log("initializing user positions");

const AVATAR_RADIUS = 12;
const SILENT_DISTANCE = 300;
const BG_COLOR = "teal";
const TAU = 2 * Math.PI;

const canvas = document.getElementById("stage");
const ctx = canvas.getContext("2d");
let ts_start, ts_prev;

let mouse_input = {
	pos: {x:0, y:0},
	down: false,
	was_down: false
};
let avatar_dragging = null;
let avatar_client_user = null;
let next_x = AVATAR_RADIUS + 10;
let ready_to_send_messages = false;

let avatars = [
	// TEMPORARY
	Avatar(-1, "Old Johnson", "", 300, 320, false),
	Avatar(-1, "Wendell T", "", 100, 100, false),
	Avatar(-1, "Jerden Vanderbilt", "", 150, 250, false),
];

canvas.addEventListener("mousemove", function(e) {
	let rect = canvas.getBoundingClientRect();
	mouse_input.pos.x = e.clientX - rect.left;
	mouse_input.pos.y = e.clientY - rect.top;
});

canvas.addEventListener("mousedown", function(e) {
	mouse_input.down = true;
});

canvas.addEventListener("mouseup", function(e) {
	mouse_input.down = false;
});

function distance(p1, p2) {
	let x = p2.x - p1.x;
	let y = p2.y - p1.y;
	return Math.sqrt(x*x + y*y);
}

function pick_random_color() {
	const colors = [ "red", "orange", "yellow", "green", "blue", "indigo", "violet" ];
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
	};
	image.onload = () => avatar.image_loaded = true;
	image.crossorigin = "anonymous";
	image.src = image_url;

	if (is_client_user) {
		avatar_client_user = avatar;
	}

	return avatar;
}

function get_hovered_avatar() {
	for (let avatar of avatars) {
		if (distance(mouse_input.pos, avatar.pos) < AVATAR_RADIUS) {
			return avatar;
		}
	}
	return null;
}

function update(ts) {
	if (ts_start === undefined) {
		ts_start = ts;
		ts_prev = ts;
	}
	let elapsed = ts - ts_start;
	let dt = ts - ts_prev;
	ts_prev = ts;

	let hovered_avatar = get_hovered_avatar();

	let mouse_pressed = mouse_input.down && !mouse_input.was_down;
	let mouse_released = !mouse_input.down && mouse_input.was_down;

	// drag and drop avatars 
	if (mouse_pressed) {
		if (hovered_avatar) {
			avatar_dragging = hovered_avatar;
		}
	} else if (mouse_released) {
		if (avatar_dragging && avatar_dragging != avatar_client_user && ready_to_send_messages) {
			let dist = distance(avatar_dragging.pos, avatar_client_user.pos);

			let inverse_volume = dist / SILENT_DISTANCE;
			if (inverse_volume > 1) inverse_volume = 1;
			let volume = 1 - inverse_volume;

			browser.tabs.query({ currentWindow: true, active: true })
			.then(tabs => {
				browser.tabs.sendMessage(tabs[0].id, {
					command: "set_user_volume",
					id: 0,
					volume: volume,
				});
			})
		}

		avatar_dragging = null;
	}

	if (avatar_dragging) {
		avatar_dragging.pos.x = mouse_input.pos.x;
		avatar_dragging.pos.y = mouse_input.pos.y;
	}

	//
	// DRAW
	//
	ctx.fillStyle = BG_COLOR;
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	for (let avatar of avatars) {
		if (avatar.image_loaded) {
			// create circular clip region
			ctx.save();
			ctx.beginPath();
			ctx.arc(avatar.pos.x, avatar.pos.y, AVATAR_RADIUS, 0, TAU, true);
			ctx.closePath();
			ctx.clip();
			// draw image in clip region
			let x = avatar.pos.x - AVATAR_RADIUS;
			let y = avatar.pos.y - AVATAR_RADIUS;
			ctx.drawImage(avatar.image, x, y, 2*AVATAR_RADIUS, 2*AVATAR_RADIUS);
			ctx.restore();
		} else {
			ctx.beginPath();
			ctx.fillStyle = avatar.color;
			ctx.arc(avatar.pos.x, avatar.pos.y, AVATAR_RADIUS, 0, TAU, true);
			ctx.fill();
		}
	}

	if (hovered_avatar) {
		let x = hovered_avatar.pos.x - AVATAR_RADIUS;
		let y = hovered_avatar.pos.y - AVATAR_RADIUS - 5;
		ctx.font = "12px monospace";
		ctx.fillStyle = "black";
		let name = hovered_avatar.username;
		if (hovered_avatar.is_client_user) {
			name += " (me)";
		}
		ctx.fillText(name, x, y);
	}


	mouse_input.was_down = mouse_input.down;

	requestAnimationFrame(update);
}

requestAnimationFrame(update);


browser.runtime.onMessage.addListener((message, sender, respond) => {
	if (message.command === "add_voice_user") {
		console.log("Add Voice User");
		console.log(message.image_url);
		console.log(message.username);
		avatars.push(Avatar(message.id, message.username, message.image_url, 
			next_x, 30, message.is_client_user));
		next_x += 2*AVATAR_RADIUS + 10;
	}
});


browser.tabs.executeScript({file: "/discord_controller.js"})
	.then(() => ready_to_send_messages = true)
	.catch(console.error);
