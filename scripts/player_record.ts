import { world, Player, ScoreboardObjective, DisplaySlotId, TimeOfDay, ScoreboardIdentity } from "@minecraft/server";
import Utility from "./utilities";

export default class PlayerRecord {
	player: Player;
	currentObjectiveItem: string = '';

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
	}

	addScore(objective: ScoreboardObjective) {
		// let playerIdentity = this.player?.scoreboardIdentity;
		// if (playerIdentity === undefined) {
		// 	console.error('Identity for ' + this.player?.name + ' is undefined');
		// 	return;
		// }
		this.removeScore(objective);
		objective.addScore(this.player.name + ": " + this.currentObjectiveItem, TimeOfDay.Sunrise - world.getTimeOfDay());
	}

	updateScore(objective: ScoreboardObjective) {
		objective.setScore(this.player.name + ": " + this.currentObjectiveItem, TimeOfDay.Sunrise - world.getTimeOfDay());
	}

	assignObjective(objectiveItem: string | undefined = undefined) {
		this.currentObjectiveItem = (objectiveItem === undefined) ? Utility.randomItem() : objectiveItem;
		Utility.sendDebugMessage('Player assigned objective: ' + this.currentObjectiveItem);
	}
}