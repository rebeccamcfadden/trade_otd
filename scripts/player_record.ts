import { world, Player, ScoreboardObjective, DisplaySlotId } from "@minecraft/server";
import Utility from "./utilities";

export default class PlayerRecord {
	player: Player | undefined;
	currentObjectiveItem: string = '';
	currentObjective: string = '';
	objectiveRef: ScoreboardObjective | undefined;

	constructor(player: Player) {
		this.player = player;
		this.assignObjective();
	}

	static findPlayer(player: Player, arr: PlayerRecord[]) {
		return arr.find(p => p.player === player);
	}

	cleanupObjective() {
		if (this.objectiveRef !== undefined) {
			world.scoreboard.removeObjective(this.objectiveRef);
		}
		if (world.scoreboard.getObjective(this.currentObjective)) {
			world.scoreboard.removeObjective(this.currentObjective);
		}
	}

	assignObjective() {
		this.cleanupObjective();
		this.currentObjectiveItem = Utility.randomItem();
		this.currentObjective = this.player?.name as string + this.currentObjectiveItem;
		this.objectiveRef = world.scoreboard.addObjective(Utility.namespace + this.currentObjective, this.player?.name + ": " + this.currentObjectiveItem);
		world.scoreboard.setObjectiveAtDisplaySlot(DisplaySlotId.Sidebar, {
			objective: this.objectiveRef,
		});
		Utility.sendDebugMessage('Player assigned objective: ' + this.currentObjectiveItem);
	}
}