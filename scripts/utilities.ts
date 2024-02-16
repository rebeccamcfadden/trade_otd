import { world, system, Player, ItemTypes, TimeOfDay, System } from "@minecraft/server";
import PlayerRecord from "./player_record";

export default class Utility {
	static debug: boolean = false;
	static namespace: string = 'tradeotd:';
	static endOfDay: number = TimeOfDay.Sunrise + TimeOfDay.Day;
	static itemNamespaceMap: Map<string, string[]> = new Map();
	static itemNamespaces: string[] = [];
	static itemNamespaceWeights: number[] = [];

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
		Utility.generateItemMap();
	}

	static sendDebugMessage(message: string) {
		if (Utility.debug) {
			world.sendMessage(message);
		}
	}

	static checkInteractCooldown(player: Player): boolean {
		const last_tick: number = player.getDynamicProperty('tradeotd:last_interact_tick') as number || 0;
		if (last_tick + 5 > system.currentTick) {
			return false;
		}
		player.setDynamicProperty('tradeotd:last_interact_tick', system.currentTick);
		return true;
	}

	static removeNamespace(id: string): string {
		return id.split(":")[1];
	}

	static resolveItemWithNamespace(id: string): string | undefined {
		const items = ItemTypes.getAll();
		const item = items.find(item => Utility.removeNamespace(item.id) === id);
		if (!item) {
			Utility.sendDebugMessage('Item not found: ' + id);
		}
		return item ? item.id : undefined;
	}

	static randomItemVanilla(): string {
		const items = ItemTypes.getAll();
		const index = Math.floor(Math.random() * items.length);
		return items[index].id;
	}

	static randomItemBasic(): string {
		const items = this.itemNamespaceMap.get('minecraft');
		if (items === undefined) {
			return this.randomItemVanilla();
		}
		const index = Math.floor(Math.random() * items.length);
		return items[index];
	}

	static randomItem(prevItemNamespaces: string[] | undefined = undefined): string {
		let items: string[] | undefined = undefined;
		let namespace = '';
		let attempts = this.itemNamespaceMap.size;
		if (attempts === 1) {
			return this.randomItemBasic();
		}
		attempts += prevItemNamespaces ? prevItemNamespaces.length : 0;
		while (items === undefined && attempts > 0) {
			const maxRand = this.itemNamespaceWeights[this.itemNamespaceWeights.length - 1];
			const rand = Math.floor(Math.random() * maxRand);
			const namespaceIndex = this.itemNamespaceWeights.findIndex(weight => weight >= rand);
			namespace = this.itemNamespaces[namespaceIndex];
			if (prevItemNamespaces && prevItemNamespaces.includes(namespace)) {
				attempts--;
				if (attempts > 0) continue;
			}
			items = this.itemNamespaceMap.get(namespace);
			attempts--;
		}
		if (items === undefined) {
			world.sendMessage('Error: No items found');
			return "";
		}
		const index = Math.floor(Math.random() * items.length);
		return items[index];
	}

	static generateItemMap() {
		this.itemNamespaceMap = new Map();
		ItemTypes.getAll().forEach(item => {
			const id = item.id;
			const namespace = id.split(":")[0];
			if (this.itemNamespaceMap.has(namespace)) {
				this.itemNamespaceMap.get(namespace)?.push(id);
			} else {
				this.itemNamespaceMap.set(namespace, [id]);
				this.itemNamespaces.push(namespace);
			}
		});
		world.sendMessage('Item namespaces: ' + this.itemNamespaces.map(ns => ns).join(', '));
		let numPacks = this.itemNamespaces.length;
		let packWeight = Math.ceil(30 / numPacks);
		let cummulative_weight = 0;
		this.itemNamespaces.forEach(namespace => {
			if (namespace === "minecraft") {
				cummulative_weight += 1;
				this.itemNamespaceWeights.push(cummulative_weight);
			}
			else {
				cummulative_weight += packWeight;
				this.itemNamespaceWeights.push(cummulative_weight);
			}
		});
	}
}

// world.afterEvents.worldInitialize.subscribe(Utility.init);