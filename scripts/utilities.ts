import { world, system, Player, ItemTypes, TimeOfDay } from "@minecraft/server";
import PlayerRecord from "./player_record";

export default class Utility {
	static debug: boolean = false;
	static namespace: string = 'tradeotd:';
	static endOfDay: number = TimeOfDay.Sunrise + TimeOfDay.Day;

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

	static checkInteractCooldown(player: Player): boolean {
		const last_tick: number = player.getDynamicProperty('tradeotd:last_interact_tick') as number || 0;
		if (last_tick + 5 > system.currentTick) {
			return false;
		}
		player.setDynamicProperty('tradeotd:last_interact_tick', system.currentTick);
		return true;
	}
}

world.afterEvents.worldInitialize.subscribe(Utility.init);