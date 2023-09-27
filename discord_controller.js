function init_discord_controller() {
	console.log("initializing discord controller");

	window.discord_controller_initialized = true;

	// temporary indicator that extension is executing
	document.body.style.border = "5px solid red";

	window.discord_controller = {
		voice_user_selector: ".voiceUser-3nRK-K",
		grabber_selector: ".grabber-3R-Rx9",
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
			composed: true,
			isTrusted: true,
			nativeEvent: "click",
			type: "click",
		}),
		voice_users: [],
	};

	browser.runtime.onMessage.addListener((message, sender, respond) => {
		if (message.command === "set_user_volume") {
			//console.log("Set User Volume");
			//console.log(message.id);
			//console.log(message.volume);
			set_user_volume(window.discord_controller.voice_users[message.id], message.volume);
		}
	});
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

async function set_user_volume(user, volume) {
	if (!user) return;

	user.dispatchEvent(window.discord_controller.contextmenu_event);
	let context_menu = await wait_for_element("#user-context");
	let grabber = document.querySelector(window.discord_controller.grabber_selector);

	if (grabber) {
		let current_value = parseInt(grabber.style.left.replace("%", ""));
		let adjustment = 100*volume - current_value;
		let iterations = Math.abs(adjustment);
		let direction_event = Math.sign(adjustment) > 0 
			? window.discord_controller.right_arrow_event
			: window.discord_controller.left_arrow_event;

		grabber.focus();
		for (let i=0; i<iterations; ++i) {
			await new Promise((resolve) => {
				setTimeout(() => {
					resolve(grabber.dispatchEvent(direction_event));
				}, 0);
			});
		}
	}

	close_context_menu();
}

(async function() {
	if (!window.discord_controller_initialized) {
		init_discord_controller();
	}


	window.discord_controller.voice_users = document.querySelectorAll(window.discord_controller.voice_user_selector);
	for (let i=0; i<window.discord_controller.voice_users.length; ++i) {
		let user = window.discord_controller.voice_users[i];
		let img = user.children[0].children[0];
		let name = user.children[0].children[1];
		let image_url = img.style.backgroundImage;
		image_url = image_url.replace('url("', "").replace('")', "");

		user.dispatchEvent(window.discord_controller.contextmenu_event);
		let context_menu = await wait_for_element("#user-context");
		let user_volume = document.getElementById("user-context-user-volume");
		let is_client_user = !user_volume;
		close_context_menu();

		let image = new Image();
		image.crossorigin = "anonymous";
		image.onload = function() {
			let canvas = document.createElement("canvas");
			let ctx = canvas.getContext("2d");
			canvas.width = image.width;
			canvas.height = image.height;
			ctx.drawImage(image, 0, 0);
			let data_url = "";

			try {
				data_url = canvas.toDataURL();
				console.log("image data success");
			} catch (err) {
				console.log(`Failed to create data url for image: ${image_url}`);
				data_url = "";
			}

			browser.runtime.sendMessage({
				command: "add_voice_user",
				image_url: data_url,
				username: name ? name.innerText : "Unknown",
				id: i,
				is_client_user: is_client_user,
			});
		}
		image.onerror = function(err) {
			browser.runtime.sendMessage({
				command: "add_voice_user",
				image_url: "",
				username: name ? name.innerText : "Unknown",
				id: i,
				is_client_user: is_client_user,
			});
		}
		image.src = image_url;
	}

	console.log("made it to the end");
})();

