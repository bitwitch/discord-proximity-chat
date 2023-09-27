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
	};
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

(async function() {
	if (!window.discord_controller_initialized) {
		init_discord_controller();
	}


	let voice_users = document.querySelectorAll(window.discord_controller.voice_user_selector);
	for (let i=0; i<voice_users.length; ++i) {
		let user = voice_users[i];
		let img = user.children[0].children[0];
		let name = user.children[0].children[1];
		let image_url = img.style.backgroundImage;
		image_url = image_url.replace('url("', "").replace('")', "");

		// TODO(shaw): somehow need to determine who the client user is, 
		// the following didn't work because it takes time for the context menu to open
		// and checking it for presence of certain elements is not viable
		user.dispatchEvent(window.discord_controller.contextmenu_event);
		let context_menu = await wait_for_element("#user-context");
		let user_volume = document.getElementById("user-context-user-volume");
		let is_client_user = !user_volume;
		close_context_menu();
		console.log(is_client_user ? "client user" : "other user");

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

	//let element = voice_users[0];
	//console.log(element);
	//element.dispatchEvent(window.discord_controller.contextmenu_event);

	//window.dispatchEvent(window.discord_controller.right_arrow_event);
	//window.dispatchEvent(right_arrow_event);

	//let grabber = document.querySelector(window.discord_controller.grabber_selector);
	//console.log("grabber: ", grabber);
	//for (let i=0; i<50; ++i) {
		//grabber.focus();
		//setTimeout(function() { 
			//grabber.dispatchEvent(window.discord_controller.right_arrow_event);
		//}, 0);
	//}

	console.log("made it to the end");
})();

