import { world, system, Player, ItemTypes } from "@minecraft/server";
import PlayerRecord from "./player_record";

export default class Utility {
	static debug: boolean = true;
	static namespace: string = 'tradeotd:';

	static init() {
		world.afterEvents.chatSend.subscribe(data => {
			const message = data.message.toLowerCase();
			if (message === 'toggle_debug') {
				Utility.debug = !Utility.debug;
				world.sendMessage('Debug mode: ' + Utility.debug);
			}

			if (message === 'clear_objectives') {
				const objectives = world.scoreboard.getObjectives();
				objectives.forEach(objective => {
					if (objective.id.startsWith(Utility.namespace)) {
						world.scoreboard.removeObjective(objective);
					}
				});
				world.sendMessage('Cleared objectives');
			}

			if (message === 'reset_player') {
				const player = data.sender as Player;
				player.setDynamicProperty('tradeotd:reset_player', true);
				const objectives = world.scoreboard.getObjectives();
				objectives.forEach(objective => {
					if (objective.id.split(":")[1].startsWith(player.name as string)) {
						world.scoreboard.removeObjective(objective);
					}
				});
				world.sendMessage('Reset player objectives');
			}
		});
	}

	static sendDebugMessage(message: string) {
		if (Utility.debug) {
			world.sendMessage(message);
		}
	}

	static randomItem() {
		const items = ItemTypes.getAll();
		const index = Math.floor(Math.random() * items.length);
		return items[index].id;
	}
}

world.afterEvents.worldInitialize.subscribe(Utility.init);