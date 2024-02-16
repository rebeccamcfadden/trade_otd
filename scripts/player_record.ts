import { world, Player, ScoreboardObjective, ItemStack } from "@minecraft/server";
import Utility from "./utilities";

export default class PlayerRecord {
	player: Player;
	currentObjectiveItem: string = '';
	succeeded: boolean = false;
	markSucceeded: boolean = false;
	prevItemNamespaces: string[] = [];

	constructor(player: Player, objectiveItem: string | undefined = undefined) {
		this.player = player;
		this.assignObjective(objectiveItem);
	}

	static findPlayer(player: Player, arr: PlayerRecord[]) {
		return arr.find(p => p.player === player);
	}

	removeScore(objective: ScoreboardObjective) {
		let players = objective.getParticipants();
		Utility.sendDebugMessage("All participants: ");
		for (let i = 0; i < players.length; i++) {
			let player = players[i].displayName;
			Utility.sendDebugMessage(player);
			if ((player as string).startsWith(this.player.name)) {
				objective.removeParticipant(players[i]);
			}
		}
		this.succeeded = false;
	}

	addScore(objective: ScoreboardObjective, prevSucceeded: boolean = false) {
		this.removeScore(objective);
		objective.setScore(this.player.name + ": " + Utility.removeNamespace(this.currentObjectiveItem), prevSucceeded ? 1 : 0);
		this.succeeded = prevSucceeded;
	}

	assignObjective(objectiveItem: string | undefined = undefined) {
		if (objectiveItem !== undefined && Utility.removeNamespace(objectiveItem) === undefined) {
			// Lookup item namespace
			objectiveItem = Utility.resolveItemWithNamespace(objectiveItem);
		}
		this.currentObjectiveItem = (objectiveItem === undefined) ? Utility.randomItem(this.prevItemNamespaces) : objectiveItem;
		this.succeeded = false;
		world.sendMessage('Player assigned objective: ' + Utility.removeNamespace(this.currentObjectiveItem));
	}

	checkSuccess(itemStack: ItemStack): boolean {
		if (this.currentObjectiveItem === itemStack.type.id) {
			this.markSucceeded = true;
			Utility.sendDebugMessage('Trade objective marked success');
			return true;
		}
		return false;
	}

	completeObjective(objective: ScoreboardObjective) {
		this.succeeded = true;
		this.markSucceeded = false;
		this.prevItemNamespaces.push(this.currentObjectiveItem.split(":")[0]);
		objective.setScore(this.player.name + ": " + Utility.removeNamespace(this.currentObjectiveItem), 1);
		// successObjective.addScore(this.player.name, 1);
	}
}