import { system, world, Player, ScoreboardObjective, DisplaySlotId, WorldAfterEvents, ChatSendAfterEvent } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import Utility from "./utilities";
import PlayerRecord from "./player_record";

export default class TradeManager {
	tradeObjectiveRef: ScoreboardObjective | undefined;
	tradeObjectiveId: string = 'tradeotd:trade_objective';
	tradeObjectiveDisplayName: string = 'Trade of the Day!';
	players: PlayerRecord[] = [];


	constructor() {
		this.collectPlayersFromExistingRef();
		if (this.players.length === 0) {
			this.initGame();
			this.initPlayers();
		}
	}

	debugUpdatePlaceBlockObjective() {
		if (Utility.debug) {
			world.scoreboard.getObjective('tradeotd:world_info')?.addScore('tradeotd:playerinteractblock', 1);
		}
	}

	collectPlayersFromExistingRef() {
		if (!this.tradeObjectiveRef) {
			this.tradeObjectiveRef = world.scoreboard.getObjective(this.tradeObjectiveId);
			if (!this.tradeObjectiveRef) return;
		}

		let gamePlayers = this.tradeObjectiveRef.getParticipants();
		let players = world.getPlayers();
		Utility.sendDebugMessage('Existing players:');
		for (let i = 0; i < gamePlayers.length; i++) {
			let playerName = gamePlayers[i].displayName.split(": ")[0];
			Utility.sendDebugMessage("Player = " + playerName);
			let player = players.find(p => p.name === playerName);
			if (player === undefined) {
				this.tradeObjectiveRef.removeParticipant(gamePlayers[i]);
			}
			else {
				let player_record = new PlayerRecord(player as Player);
				let player_objective_item = gamePlayers[i].displayName.split(": ")[1];
				Utility.sendDebugMessage(" - objective item = " + player_objective_item);
				player_record.assignObjective(player_objective_item);
				this.players.push(player_record);
			}
		}
	}

	initGame() {
		Utility.sendDebugMessage('Starting game');
		if (this.tradeObjectiveRef) {
			Utility.sendDebugMessage('Trade objective already exists');
		}
		else {
			this.tradeObjectiveRef = world.scoreboard.getObjective(this.tradeObjectiveId);
			if (!this.tradeObjectiveRef) this.tradeObjectiveRef = world.scoreboard.addObjective(this.tradeObjectiveId, this.tradeObjectiveDisplayName);
		}
		world.scoreboard.setObjectiveAtDisplaySlot(DisplaySlotId.Sidebar, {
			objective: this.tradeObjectiveRef,
		});
	}

	initPlayers() {
		for (let i = 0; i < this.players.length; i++) {
			this.players[i].addScore(this.tradeObjectiveRef as ScoreboardObjective);
		}
	}

	endGame() {
		Utility.sendDebugMessage('Ending game');
		if (this.tradeObjectiveRef) {
			world.scoreboard.removeObjective(this.tradeObjectiveRef);
			this.tradeObjectiveRef = undefined;
		}
	}

	addPlayer(player: Player) {
		if (this.players.length === 0) {
			Utility.sendDebugMessage('First player in trade manager');
			this.initGame();
		}

		Utility.sendDebugMessage('Adding player ' + player.name + ' to trade manager');
		let player_record = new PlayerRecord(player as Player);
		player_record.addScore(this.tradeObjectiveRef as ScoreboardObjective);
		this.players.push(player_record);
		return player_record;
	}

	removePlayer(player: Player) {
		let player_record = PlayerRecord.findPlayer(player as Player, this.players);
		this.removePlayerRecord(player_record);
	}

	removePlayerRecord(player_record: PlayerRecord | undefined) {
		if (player_record !== undefined) {
			player_record.removeScore(this.tradeObjectiveRef as ScoreboardObjective);
			this.players.splice(this.players.indexOf(player_record), 1);
		}

		Utility.sendDebugMessage('Players left: ' + this.players.length.toString());
		if (this.players.length === 0) {
			Utility.sendDebugMessage('No more players in trade manager');
			this.endGame();
		}
	}

	handleStartGameForm(player: Player, tradeUI: ActionFormData) {
		tradeUI.show(player).then(r => {
			// This will stop the code when the player closes the form
			if (r.canceled) return;
			let response = r.selection;
			switch (response) {
				case 0:
					// Start game
					let player_record = this.addPlayer(player);
					player.sendMessage("Your current challenge item is: " + player_record.currentObjectiveItem);
					player.sendMessage("Collect this item before the end of the day to win a prize!");
					break;
				default:
					console.error("Unknown button pressed");
			}
		}).catch(e => {
			console.error(e, e.stack);
		});

	}

	handleInGameForm(player_record: PlayerRecord, tradeUI: ActionFormData) {
		tradeUI.show(player_record.player).then(r => {
			// This will stop the code when the player closes the form
			if (r.canceled) return;
			let response = r.selection;
			switch (response) {
				case 0:
					// Current item
					player_record.player.sendMessage("Your current challenge item is: " + player_record.currentObjectiveItem);
					player_record.player.sendMessage("Collect this item before the end of the day to win a prize!");
					break;
				case 1:
					// Re-roll for new item
					player_record.assignObjective();
					player_record.addScore(this.tradeObjectiveRef as ScoreboardObjective);
					player_record.player.sendMessage("New item: " + player_record.currentObjectiveItem);
					break;
				case 2:
					// List all player items
					let playerItems = this.tradeObjectiveRef?.getScores();
					let playerItemsString = playerItems?.map(score => "\t" + score.participant.displayName + "").join("\n");
					world.sendMessage("Player items:\n" + playerItemsString);
					break;
				case 3:
					// Leave game
					this.removePlayerRecord(player_record);
					break;
				default:
					console.error("Unknown button pressed");
			}
		}).catch(e => {
			console.error(e, e.stack);
		});
	}

	showUI(player: Player) {
		let player_record = PlayerRecord.findPlayer(player as Player, this.players);
		const tradeUI = new ActionFormData()
			.title("Trade of the Day!")
			.body("Collect a daily random challenge item to win a prize!");
		if (player_record === undefined) {
			tradeUI.button("Start the game!");

			this.handleStartGameForm(player, tradeUI);
		}
		else {
			tradeUI.button("Current item: " + player_record.currentObjectiveItem);
			tradeUI.button("Re-roll for new item");
			tradeUI.button("List all player items");
			tradeUI.button("Leave game");

			this.handleInGameForm(player_record, tradeUI);
		}
	}

	showDebugUI(player: Player) {
		const tradeUI = new ActionFormData()
			.title("Trade of the Day!")
			.body("Debug options");

		tradeUI.button("List players");
		tradeUI.button("Clean players");
		tradeUI.button("Toggle Debug");

		tradeUI.show(player).then(r => {
			// This will stop the code when the player closes the form
			if (r.canceled) return;
			let response = r.selection;
			switch (response) {
				case 0:
					// List players
					let playerString = this.players.map(player => player.player.name).join(", ");
					world.sendMessage("Players: " + playerString);
					break;
				case 1:
					// Clean players
					this.players.forEach(player_record => {
						player_record.removeScore(this.tradeObjectiveRef as ScoreboardObjective);
						this.removePlayerRecord(player_record);
					});
					if (this.players.length !== 0) {
						Utility.sendDebugMessage('Failed to remove all players');
					}
					world.sendMessage('Cleared players');
					break;
				case 2:
					// Toggle debug
					Utility.debug = !Utility.debug;
					world.sendMessage('Debug mode: ' + Utility.debug);
					break;
				case 3:
					// Clear objectives
					const objectives = world.scoreboard.getObjectives();
					objectives.forEach(objective => {
						if (objective.id.startsWith(Utility.namespace)) {
							world.scoreboard.removeObjective(objective);
						}
					});
					world.sendMessage('Cleared objectives');
					break;
				default:
					console.error("Unknown button pressed");
			}
		}).catch(e => {
			console.error(e, e.stack);
		});
	}

	playerTableInteract(player: Player) {
		// Utility.sendDebugMessage('Player interacted with a trading table');
		if (player.isSneaking) {
			this.showDebugUI(player);
		}
		else {
			this.showUI(player);
		}
	}

	playerPlaceTable(player: Player) {
		// Utility.sendDebugMessage('Player placed a trading table');
		this.showUI(player);
	}

	updateScores() {
		// Utility.sendDebugMessage('Updating scores');
		this.players.forEach(player_record => {
			player_record.updateScore(this.tradeObjectiveRef as ScoreboardObjective);
		});
	}

	subscribeEvents() {
		// subscribe to events here
		world.afterEvents.playerInteractWithBlock.subscribe(data => {
			const last_tick: number = data.player?.getDynamicProperty('tradeotd:last_interact_tick') as number || 0;
			if (last_tick + 5 > system.currentTick) {
				return;
			}
			// Utility.sendDebugMessage('Player interacted with block - tick = ' + last_tick as string);
			data.player?.setDynamicProperty('tradeotd:last_interact_tick', system.currentTick);

			if (data.block?.typeId === 'tradeotd:trader_table') {
				this.playerTableInteract(data.player);
			}
		});
		world.afterEvents.playerPlaceBlock.subscribe(data => {
			if (data.block?.typeId === 'tradeotd:trader_table') {
				this.playerPlaceTable(data.player);
			}
		});

		system.runInterval(this.updateScores.bind(this), 100);
	}
}