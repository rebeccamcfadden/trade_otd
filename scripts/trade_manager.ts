import { system, world, Player, ScoreboardObjective, DisplaySlotId, ItemStack, Vector3, ItemTypes } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import Utility from "./utilities";
import PlayerRecord from "./player_record";

export default class TradeManager {
	tradeObjectiveRef: ScoreboardObjective | undefined;
	tradeObjectiveId: string = 'tradeotd:trade_objective';
	tradeObjectiveDisplayName: string = 'Trade of the Day!';
	successObjectiveRef: ScoreboardObjective | undefined;
	successObjectiveId: string = 'tradeotd:trade_winners_objective';
	successObjectiveDisplayName: string = 'Trade of the Day! Winners';

	updateScoreRun: number | undefined = undefined;
	endOfDayRun: number | undefined = undefined;

	players: PlayerRecord[] = [];


	constructor() {
		world.scoreboard.clearObjectiveAtDisplaySlot(DisplaySlotId.Sidebar);
		this.collectPlayersFromExistingRef();
		if (this.players.length > 0) {
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
			if (playerName === 'Time') continue;
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
				if (this.tradeObjectiveRef.getScore(gamePlayers[i].displayName) == 0) {
					player_record.succeeded = true;
				}
				this.players.push(player_record);
			}
		}
	}

	initLeaderboard() {
		if (this.successObjectiveRef) {
			Utility.sendDebugMessage('Success objective already exists');
		}
		else {
			this.successObjectiveRef = world.scoreboard.getObjective(this.successObjectiveId);
			if (!this.successObjectiveRef) this.successObjectiveRef = world.scoreboard.addObjective(this.successObjectiveId, this.successObjectiveDisplayName);
		}
		if (this.successObjectiveRef.getScores().length > 0) {
			world.scoreboard.setObjectiveAtDisplaySlot(DisplaySlotId.List, {
				objective: this.successObjectiveRef,
			});
		}
	}

	updateLeaderboard() {
		if (this.successObjectiveRef && this.successObjectiveRef.getScores().length > 0) {
			world.scoreboard.setObjectiveAtDisplaySlot(DisplaySlotId.List, {
				objective: this.successObjectiveRef,
			});
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
		this.tradeObjectiveRef.addScore('Time', Utility.endOfDay - world.getTimeOfDay());
		world.scoreboard.setObjectiveAtDisplaySlot(DisplaySlotId.Sidebar, {
			objective: this.tradeObjectiveRef,
		});
		this.initLeaderboard();

		this.updateScoreRun = system.runInterval(this.updateScores.bind(this), 1000);
	}

	initPlayers() {
		for (let i = 0; i < this.players.length; i++) {
			this.players[i].addScore(this.tradeObjectiveRef as ScoreboardObjective, this.players[i].succeeded);
		}
	}

	endGame() {
		Utility.sendDebugMessage('Ending game');
		if (this.tradeObjectiveRef) {
			world.scoreboard.removeObjective(this.tradeObjectiveRef);
			this.tradeObjectiveRef = undefined;
		}
		if (this.updateScoreRun) {
			system.clearRun(this.updateScoreRun);
			this.updateScoreRun = undefined;
		}
		if (this.endOfDayRun) {
			system.clearRun(this.endOfDayRun);
			this.endOfDayRun = undefined;
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
					player.sendMessage("Your current challenge item is: " + Utility.removeNamespace(player_record.currentObjectiveItem));
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
					if (player_record.succeeded) {
						player_record.player.sendMessage("You have already completed the challenge for today!\n"
							+ "Come back tomorrow for a new challenge!");
						this.updateLeaderboard();
						break;
					}
					player_record.player.sendMessage("Your current challenge item is: "
						+ Utility.removeNamespace(player_record.currentObjectiveItem)
						+ "\nCollect this item before the end of the day to win a prize!");
					break;
				case 1:
					// Re-roll for new item
					if (player_record.succeeded) {
						player_record.player.sendMessage("You have already completed the challenge for today!\n"
							+ "Come back tomorrow for a new challenge!");
						break;
					}
					player_record.assignObjective();
					player_record.addScore(this.tradeObjectiveRef as ScoreboardObjective);
					player_record.player.sendMessage("Your new item is: "
						+ Utility.removeNamespace(player_record.currentObjectiveItem)
						+ "\nCollect this item before the end of the day to win a prize!");
					break;
				case 2:
					// List all player items
					let playerItems = this.tradeObjectiveRef?.getScores();
					let playerItemsString = playerItems?.map((score) => {
						if (score.participant.displayName === "Time") {
							return "";
						} 
						return "   " + score.participant.displayName + "";
					}).filter(str => str && str != "").join("\n");
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

	showUI(player: Player, player_record: PlayerRecord | undefined = undefined) {
		const tradeUI = new ActionFormData()
			.title("Trade of the Day!")
			.body("Collect a daily random challenge item to win a prize!");
		if (player_record === undefined) {
			tradeUI.button("Start the game!");

			this.handleStartGameForm(player, tradeUI);
		}
		else {
			tradeUI.button(player_record.succeeded ? "You have completed your trade of the day!" : "Current item: " + Utility.removeNamespace(player_record.currentObjectiveItem));
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
		tradeUI.button("Debug re-roll player item");

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
					// Debug re-roll player items
					let player_record = this.players.find(p => p.player === player);
					if (!player_record) break;
					player_record.assignObjective();
					player_record.addScore(this.tradeObjectiveRef as ScoreboardObjective);
					player_record.player.sendMessage("Your new item is: "
						+ Utility.removeNamespace(player_record.currentObjectiveItem)
						+ "\nCollect this item before the end of the day to win a prize!");
					break;
				default:
					console.error("Unknown button pressed");
			}
		}).catch(e => {
			console.error(e, e.stack);
		});
	}

	checkPlayerCompletedObjective(player: Player, itemStack: ItemStack) {
		let player_record = PlayerRecord.findPlayer(player as Player, this.players);
		Utility.sendDebugMessage('Attempt player completed objective - ' + player.name + ' - ' + itemStack.type.id + ' - ' + player_record?.currentObjectiveItem);
		if (player_record && !player_record.succeeded && player_record.checkSuccess(itemStack)) {
			return true;
		}
		return false;
	}

	playerTableInteract(player: Player) {
		Utility.sendDebugMessage('Player interacted with a trading table');
		let player_record = PlayerRecord.findPlayer(player as Player, this.players);
		if (player.isSneaking) {
			this.showDebugUI(player);
		}
		else {
			this.showUI(player, player_record);
		}
	}

	endOfDay() {
		this.players.forEach(player_record => {
			player_record.removeScore(this.tradeObjectiveRef as ScoreboardObjective);
			player_record.assignObjective();
			player_record.addScore(this.tradeObjectiveRef as ScoreboardObjective);
			player_record.player.sendMessage("Your new item is: "
				+ Utility.removeNamespace(player_record.currentObjectiveItem)
				+ "\nCollect this item before the end of the day to win a prize!");
		});
		this.updateScores();
		if (this.endOfDayRun) {
			system.clearRun(this.endOfDayRun);
			this.endOfDayRun = undefined;
		}
	}

	updateScores() {
		// this.players.forEach(player_record => {
		// 	player_record.updateScore(this.tradeObjectiveRef as ScoreboardObjective);
		// });		
		if (!this.tradeObjectiveRef) {
			Utility.sendDebugMessage('Trade objective not found');
			return;
		}
		let tick = world.getTimeOfDay();
		this.tradeObjectiveRef.setScore('Time', Utility.endOfDay - tick);
		Utility.sendDebugMessage("Updating scores - " + tick.toString());
		let day = world.getDay();
		if (tick >= Utility.endOfDay - 1500 && !this.endOfDayRun) {
			this.endOfDayRun = system.runInterval(this.endOfDay.bind(this), Utility.endOfDay - tick);
		}
	}

	spawnPrize(player: Player, blockPos : Vector3 | undefined = undefined) {
		if (!blockPos) blockPos = player.location;
		player.dimension.spawnEntity('minecraft:fireworks_rocket', blockPos);
		blockPos.y += 2;
		for (let i = 0; i < 10; i++) {
			player.dimension.spawnEntity('minecraft:xp_orb', blockPos);
		}
		player.dimension.spawnItem(new ItemStack('minecraft:diamond'), blockPos);
	}

	updatePlayerSucccess(player: Player, blockPos : Vector3 | undefined = undefined) {
		Utility.sendDebugMessage('Trade objective - attempt complete');
		let player_record = PlayerRecord.findPlayer(player as Player, this.players);
		if (player_record && this.tradeObjectiveRef) {
			player_record.completeObjective(this.tradeObjectiveRef);
			world.sendMessage(player.name
				+ " has completed the trade objective!\n"
				+ "Come back tomorrow for a new challenge!");
			this.successObjectiveRef?.addScore(player.name, 1);
			this.spawnPrize(player, blockPos);
			this.updateLeaderboard();
		}
		else {
			Utility.sendDebugMessage('Player not found - ' + player.name);
		}
	}

	subscribeEvents() {
		// subscribe to events here
		world.afterEvents.playerInteractWithBlock.subscribe(data => {
			if (!Utility.checkInteractCooldown(data.player)) return;
			try {
				if (data.block?.typeId === 'tradeotd:trader_table') {
					this.playerTableInteract(data.player);
				}
			} catch (e) {
				Utility.sendDebugMessage('Error: ' + e);
			}
		});
		world.beforeEvents.itemUseOn.subscribe(data => {
			if (!Utility.checkInteractCooldown(data.source)) return;
			if (data.block?.typeId === 'tradeotd:trader_table' && data.source && data.itemStack) {
				if (this.checkPlayerCompletedObjective(data.source, data.itemStack)) {
					system.run(() => {
						let blockPos = {x:data.block?.x, y:data.block?.y, z:data.block?.z} as Vector3;
						this.updatePlayerSucccess(data.source, blockPos);
					});
					data.cancel = true;
				}
				else if (data.itemStack.type.id !== 'tradeotd:trader_table') {
					system.run(() => {
						this.playerTableInteract(data.source);
					});
				}
			}
		});
		world.afterEvents.playerPlaceBlock.subscribe(data => {
			if (data.block?.typeId === 'tradeotd:trader_table') {
				this.playerTableInteract(data.player);
			}
		});
	}
}