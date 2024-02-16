import { world, system } from "@minecraft/server";
import TradeManager from "./trade_manager";
import Utility from "./utilities";

function init() {
	Utility.sendDebugMessage("Starting up...");
	try {
		// initialize the addon manager here
		Utility.init();
		const tradeManager = new TradeManager();
		tradeManager.subscribeEvents();
	}
	catch (e) {
		console.error(e);
	}
}

init();

// world.afterEvents.worldInitialize.subscribe(init);
// system.run(mainTick);
