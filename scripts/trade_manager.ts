import { system, world, Player, ScoreboardObjective, DisplaySlotId, BlockType } from "@minecraft/server";
import Utility from "./utilities";
import PlayerRecord from "./player_record";

export default class TradeManager {
	// track if player is active in the trading system
	// track current trade for player
	placeBlockObjective: ScoreboardObjective | undefined;
	players: PlayerRecord[] = [];


	constructor() {
		// initialize the trade manager here
		this.placeBlockObjective = world.scoreboard.getObjective('tradeotd:world_info');
		if (!this.placeBlockObjective) {
			this.placeBlockObjective = world.scoreboard.addObjective('tradeotd:world_info', 'Test World Info');
		}
		world.scoreboard.setObjectiveAtDisplaySlot(DisplaySlotId.Sidebar, {
			objective: this.placeBlockObjective,
		});
	}

	subscribeEvents() {
		// subscribe to events here
		world.afterEvents.playerInteractWithBlock.subscribe(data => {
			if (data.block?.typeId === 'tradeotd:trading_table') {
				const last_tick: number = data.player?.getDynamicProperty('tradeotd:last_interact_tick') as number || 0;
				if (last_tick + 5 > system.currentTick) return;
				Utility.sendDebugMessage('Player interacted with block - tick = ' + last_tick as string);
				data.player?.setDynamicProperty('tradeotd:last_interact_tick', system.currentTick);
				Utility.sendDebugMessage('Players: ' + this.players as string);

				world.scoreboard.getObjective('tradeotd:world_info')?.addScore('tradeotd:playerinteractblock', 1);
				let player = PlayerRecord.findPlayer(data.player as Player, this.players);
				let reset_player = data.player?.getDynamicProperty('tradeotd:reset_player') as boolean || false;
				if (reset_player && player !== undefined) {
					this.players.splice(this.players.indexOf(player), 1);
					data.player?.setDynamicProperty('tradeotd:reset_player', false);
				}
				if (player === undefined || reset_player === true) {
					let length = this.players.length;
					player = new PlayerRecord(data.player as Player);
					this.players.push(player);
					Utility.sendDebugMessage('Player added to trade manager - prev len = ' + length as string + ' - curr len = ' + this.players.length as string);
				}
			}
		});
		world.afterEvents.playerPlaceBlock.subscribe(data => {
			world.scoreboard.getObjective('tradeotd:world_info')?.addScore('tradeotd:playerplaceblock', 1);
			if (data.block?.typeId === 'tradeotd:trading_table') {
				Utility.sendDebugMessage('Player placed a trading table');


			}
		});
	}


}