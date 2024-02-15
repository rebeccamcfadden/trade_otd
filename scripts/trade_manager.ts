import { system, world, Player, ScoreboardObjective, DisplaySlotId, PlayerInteractWithBlockAfterEvent } from "@minecraft/server";
import Utility from "./utilities";
import PlayerRecord from "./player_record";

export default class TradeManager {
	// track if player is active in the trading system
	// track current trade for player
	// placeBlockObjective: ScoreboardObjective | undefined;
	tradeObjectiveRef: ScoreboardObjective | undefined;
	tradeObjectiveId: string = 'tradeotd:trade_objective';
	tradeObjectiveDisplayName: string = 'Trade of the Day!';
	players: PlayerRecord[] = [];


	constructor() {
		// initialize the trade manager here
		// this.placeBlockObjective = world.scoreboard.getObjective('tradeotd:world_info');
		// if (!this.placeBlockObjective) {
		// 	this.placeBlockObjective = world.scoreboard.addObjective('tradeotd:world_info', 'Test World Info');
		// }
		// world.scoreboard.setObjectiveAtDisplaySlot(DisplaySlotId.List, {
		// 	objective: this.placeBlockObjective,
		// });

		this.tradeObjectiveRef = world.scoreboard.getObjective(this.tradeObjectiveId);
		if (!this.tradeObjectiveRef) {
			this.tradeObjectiveRef = world.scoreboard.addObjective(this.tradeObjectiveId, this.tradeObjectiveDisplayName);
		}
		else {
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
					player_record.addScore(this.tradeObjectiveRef as ScoreboardObjective);
					this.players.push(player_record);
				}
			}
		}
		world.scoreboard.setObjectiveAtDisplaySlot(DisplaySlotId.Sidebar, {
			objective: this.tradeObjectiveRef,
		});
	}

	debugUpdatePlaceBlockObjective() {
		if (Utility.debug) {
			world.scoreboard.getObjective('tradeotd:world_info')?.addScore('tradeotd:playerinteractblock', 1);
		}
	}

	playerTableInteract(player: Player) {
		Utility.sendDebugMessage('Player interacted with a trading table');
		let player_record = PlayerRecord.findPlayer(player as Player, this.players);

		// debug reset player
		let reset_player = player?.getDynamicProperty('tradeotd:reset_player') as boolean || false;
		if (reset_player && player_record !== undefined) {
			Utility.sendDebugMessage('Removing player ' + player.name + ' from trade manager');
			player_record.removeScore(this.tradeObjectiveRef as ScoreboardObjective);
			this.players.splice(this.players.indexOf(player_record), 1);
			player_record = undefined;
		}

		if (player_record === undefined || reset_player === true) {
			player?.setDynamicProperty('tradeotd:reset_player', false);
			Utility.sendDebugMessage('Adding player ' + player.name + ' to trade manager');
			player_record = new PlayerRecord(player as Player);
			player_record.addScore(this.tradeObjectiveRef as ScoreboardObjective);
			this.players.push(player_record);
		}
	}

	playerPlaceTable(player: Player) {
		Utility.sendDebugMessage('Player placed a trading table');
		// world.scoreboard.getObjective('tradeotd:world_info')?.addScore('tradeotd:playerplaceblock', 1);
		// let player_record = PlayerRecord.findPlayer(player as Player, this.players);
		// if (player_record !== undefined) {
		// 	player_record.addScore(this.placeBlockObjective as ScoreboardObjective);
		// }
	}

	updateScores() {
		Utility.sendDebugMessage('Updating scores');
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
			Utility.sendDebugMessage('Player interacted with block - tick = ' + last_tick as string);
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