browser.browserAction.onClicked.addListener(tab => {
	browser.tabs.executeScript({file: "/discord_controller.js"})
	.then(() => console.log("discord controller script executed"))
	.catch(console.error);
});
