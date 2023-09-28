console.log("initializing user positions");

const AVATAR_RADIUS = 12;
const SILENT_DISTANCE = 300;
const BG_COLOR = "teal";
const TAU = 2 * Math.PI;

const canvas = document.getElementById("stage");
const ctx = canvas.getContext("2d");
const logo = document.getElementById("discord_logo_transparent");

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

const colors = [ "#F2BE22", "#F29727", "#F24C3D","#2E2A28", "#342A28", "#26577C", "#E55604", "#FF3FA4", "#451952", "#2B2730", "#6554AF", "#E966A0", "#9575DE", "#B70404", "#DB005B", "#F79327", "#8F475C", "#DB6386", "#8F5D2B", "#DB944D", "#8E6EDB", "#DB6142", "#DBD14D", "#DB7C39", "#3C24DB", "#F2689D", "#E864D9", "#F28168", "#7030E6", "#A932F0", "#C839D9", "#F032B4", "#E63051", "#D409E8", "#9E0AF2", "#5B13DB", "#200AF2", "#4D430C", "#471237", "#541913", "#3E1457", "#160F47", "#540725", "#5E0855", "#400747", "#9D1A02", "#4A3A35", "#190780", "#240054", "#240333", "#2F0230", "#030A45", "#3B0209", "#2E021C", "#7649E6", "#AB44FC", "#D441F2", "#4644FC", "#416EF2" ];

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

function adjust_user_volumes() {
	if (avatar_dragging && ready_to_send_messages) {
		if (avatar_dragging == avatar_client_user) {

			browser.tabs.query({currentWindow: true, active: true }).then(tabs => {
				for (let avatar of avatars) {
					if (avatar == avatar_client_user) continue;
					if (avatar.id == -1) continue;
					let dist = distance(avatar.pos, avatar_client_user.pos);
					let inverse_volume = dist / SILENT_DISTANCE;
					if (inverse_volume > 1) inverse_volume = 1;
					let volume = 1 - inverse_volume;
					browser.tabs.sendMessage(tabs[0].id, {
						command: "set_user_volume",
						id: avatar.id,
						volume: volume,
					});
				}
			});

		} else {
			if (avatar_dragging.id != -1) {

				// dragging a user other than client user
				let id = avatar_dragging.id;
				let dist = distance(avatar_dragging.pos, avatar_client_user.pos);
				let inverse_volume = dist / SILENT_DISTANCE;
				if (inverse_volume > 1) inverse_volume = 1;
				let volume = 1 - inverse_volume;

				browser.tabs.query({ currentWindow: true, active: true })
				.then(tabs => {
					browser.tabs.sendMessage(tabs[0].id, {
						command: "set_user_volume",
						id: id,
						volume: volume,
					});
				})
			}
		}
	}
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
		adjust_user_volumes();
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
		// create circular clip region
		ctx.save();
		ctx.beginPath();
		ctx.arc(avatar.pos.x, avatar.pos.y, AVATAR_RADIUS, 0, TAU, true);
		ctx.closePath();
		ctx.clip();

		// draw image in clip region
		let image_x = avatar.pos.x - AVATAR_RADIUS;
		let image_y = avatar.pos.y - AVATAR_RADIUS;
		if (avatar.image_loaded) {
			ctx.drawImage(avatar.image, image_x, image_y, 2*AVATAR_RADIUS, 2*AVATAR_RADIUS);
		} else { 
			ctx.fillStyle = avatar.color;
			ctx.fill();
			ctx.drawImage(logo, image_x, image_y, 2*AVATAR_RADIUS, 2*AVATAR_RADIUS);
		}

		ctx.restore();
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
