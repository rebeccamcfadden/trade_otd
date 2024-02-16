import { world, Player, ScoreboardObjective, ItemStack } from "@minecraft/server";
import Utility from "./utilities";

export default class PlayerRecord {
	player: Player;
	currentObjectiveItem: string = '';
	succeeded: boolean = false;
	markSucceeded: boolean = false;

	constructor(player: Player) {
		this.player = player;
		this.assignObjective();
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
		objective.addScore(this.player.name + ": " + this.currentObjectiveItem, prevSucceeded ? 0 : Utility.endOfDay - world.getTimeOfDay());
		this.succeeded = prevSucceeded;
	}

	updateScore(objective: ScoreboardObjective) {
		if (this.succeeded) return;
		objective.setScore(this.player.name + ": " + this.currentObjectiveItem, Utility.endOfDay - world.getTimeOfDay());
	}

	assignObjective(objectiveItem: string | undefined = undefined) {
		this.currentObjectiveItem = (objectiveItem === undefined) ? Utility.randomItem() : objectiveItem;
		this.succeeded = false;
		Utility.sendDebugMessage('Player assigned objective: ' + this.currentObjectiveItem);
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
		objective.setScore(this.player.name + ": " + this.currentObjectiveItem, 0);
		// successObjective.addScore(this.player.name, 1);
	}
}