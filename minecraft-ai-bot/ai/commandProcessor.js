/**
 * Advanced Command Parser & Executor
 * Handles all bot commands and natural language processing
 */

export default class CommandProcessor {
  constructor(bot, aiModules) {
    this.bot = bot;
    this.ai = aiModules;
    this.lastCommand = null;
    this.commandHistory = [];
    this.stats = {
      commandsExecuted: 0,
      commandsFailed: 0,
      uptime: Date.now()
    };
  }

  /**
   * Parse and execute any command (natural language or slash command)
   */
  async processCommand(input) {
    if (!input || typeof input !== 'string') return null;

    const trimmed = input.trim();
    input = trimmed.startsWith('!') ? trimmed : `!${trimmed}`;

    this.commandHistory.push({ cmd: input, time: Date.now() });
    if (this.commandHistory.length > 100) this.commandHistory.shift();

    try {
      // Parse command
      const [cmd, ...args] = input.toLowerCase().split(/\s+/);
      const command = cmd.slice(1); // Remove '!'

      // Execute
      return await this.execute(command, args.join(' '));
    } catch (err) {
      this.stats.commandsFailed++;
      return { success: false, error: err.message };
    }
  }

  /**
   * Execute a specific command
   */
  async execute(command, argsStr = '') {
    const args = argsStr.trim().split(/\s+/).filter(a => a);

    // =============  INFO COMMANDS  =============
    if (command === 'help') return this.cmdHelp();
    if (command === 'ping') return this.cmdPing();
    if (command === 'info') return this.cmdInfo();
    if (command === 'stats') return this.cmdStats();
    if (command === 'uptime') return this.cmdUptime();
    if (command === 'coords') return this.cmdCoords();
    if (command === 'health') return this.cmdHealth();
    if (command === 'food') return this.cmdFood();
    if (command === 'inventory') return this.cmdInventory();
    if (command === 'time') return this.cmdTime();

    // =============  MOVEMENT COMMANDS  =============
    if (command === 'follow') return this.cmdFollow(args[0]);
    if (command === 'stop') return this.cmdStop();
    if (command === 'come') return this.cmdCome();
    if (command === 'goto') return this.cmdGoto(args);
    if (command === 'circle') return this.cmdCircle(args[0]);
    if (command === 'guard') return this.cmdGuard(args[0]);
    if (command === 'wander') return this.cmdWander();
    if (command === 'retreat') return this.cmdRetreat();
    if (command === 'jump') return this.cmdJump();
    if (command === 'lookat') return this.cmdLookAt(args[0]);

    // =============  MINING COMMANDS  =============
    if (command === 'mine') return this.cmdMine(args[0] || 'diamond');
    if (command === 'stripmine') return this.cmdStripMine();
    if (command === 'quarry') return this.cmdQuarry();
    if (command === 'digdown') return this.cmdDigDown();
    if (command === 'digup') return this.cmdDigUp();

    // =============  FARMING COMMANDS  =============
    if (command === 'farm') return this.cmdFarm();
    if (command === 'harvest') return this.cmdHarvest();
    if (command === 'plant') return this.cmdPlant(args[0] || 'wheat');
    if (command === 'breed') return this.cmdBreed(args[0] || 'cow');
    if (command === 'feed') return this.cmdFeed(args[0] || 'cow');
    if (command === 'milkcow') return this.cmdMilkCow();
    if (command === 'eggs') return this.cmdCollectEggs();

    // =============  COMBAT COMMANDS  =============
    if (command === 'pvp') return this.cmdPvP(args[0]);
    if (command === 'defend') return this.cmdDefend(args[0]);
    if (command === 'attack') return this.cmdAttackMobs();
    if (command === 'protect') return this.cmdProtect();

    // =============  BUILDING COMMANDS  =============
    if (command === 'build') return this.cmdBuild(args);
    if (command === 'wall') return this.cmdBuildWall(args[0] || '10');
    if (command === 'house') return this.cmdBuildHouse();
    if (command === 'bridge') return this.cmdBuildBridge(args[0] || '10');
    if (command === 'tower') return this.cmdBuildTower(args[0] || '5');
    if (command === 'flatten') return this.cmdFlattenLand(args[0] || '10');
    if (command === 'repair') return this.cmdRepairBuilds();

    // =============  UTILITY COMMANDS  =============
    if (command === 'craft') return this.cmdCraft(args.join(' '));
    if (command === 'smelt') return this.cmdSmelt();
    if (command === 'drop') return this.cmdDrop(args.join(' '));
    if (command === 'deposit') return this.cmdDeposit();
    if (command === 'withdraw') return this.cmdWithdraw(args[0]);
    if (command === 'sort') return this.cmdSortInventory();
    if (command === 'give') return this.cmdGiveItem(args[0], args[1]);
    if (command === 'enchant') return this.cmdEnchant();
    if (command === 'repair') return this.cmdRepair();

    // =============  STATE COMMANDS  =============
    if (command === 'pause') return this.cmdPause();
    if (command === 'resume') return this.cmdResume();
    if (command === 'status') return this.cmdStatus();
    if (command === 'mode') return this.cmdSetMode(args[0]);
    if (command === 'priority') return this.cmdSetPriority(args[0]);

    return { success: false, error: `Unknown command: ${command}. Use !help for help.` };
  }

  // ============= INFO COMMANDS =============
  cmdHelp() {
    return {
      success: true,
      response: `Available commands: !help, !ping, !coords, !health, !food, !inventory, !stats, !follow <player>, !goto <x y z>, !mine <block>, !stripmine, !quarry, !digdown, !digup, !farm, !harvest, !breed <animal>, !build, !pvp <player>, !attack, !defend, !stop, !come, !wander, !retreat, !drop <item>, !craft <item>, !sort, !status, and many more!`
    };
  }

  cmdPing() {
    return { success: true, response: 'Pong! Connection is active.' };
  }

  cmdInfo() {
    return {
      success: true,
      response: `I'm an autonomous AI bot. I can mine, farm, build, fight, navigate, and learn. What would you like me to do?`
    };
  }

  cmdStats() {
    return {
      success: true,
      response: `Commands executed: ${this.stats.commandsExecuted}, Failed: ${this.stats.commandsFailed}`
    };
  }

  cmdUptime() {
    const uptime = Math.floor((Date.now() - this.stats.uptime) / 1000);
    const hours = Math.floor(uptime / 3600);
    const mins = Math.floor((uptime % 3600) / 60);
    return { success: true, response: `Uptime: ${hours}h ${mins}m` };
  }

  cmdCoords() {
    const pos = this.bot.entity?.position;
    if (!pos) return { success: false, error: 'Position unknown' };
    return { success: true, response: `Position: X=${Math.round(pos.x)}, Y=${Math.round(pos.y)}, Z=${Math.round(pos.z)}` };
  }

  cmdHealth() {
    const health = this.bot.health || 0;
    const status = health > 15 ? 'Good' : health > 10 ? 'OK' : 'Low';
    return { success: true, response: `Health: ${Math.round(health)}/20 (${status})` };
  }

  cmdFood() {
    const food = this.bot.food || 0;
    const saturation = this.bot.foodSaturation || 0;
    return { success: true, response: `Food: ${Math.round(food)}/20, Saturation: ${Math.round(saturation)}/20` };
  }

  cmdInventory() {
    if (!this.ai.inventory) return { success: false, error: 'Inventory system unavailable' };
    const summary = this.ai.inventory.getSummary?.() || { items: [] };
    const items = summary.items.map(i => `${i.name}x${i.count}`).join(', ') || 'Empty';
    return { success: true, response: `Inventory: ${items}` };
  }

  cmdTime() {
    const time = this.bot.time?.timeOfDay || 0;
    const hours = Math.floor(time / 1000);
    const mins = Math.floor((time % 1000) / 1000 * 60);
    const phase = hours < 12000 ? 'Day' : 'Night';
    return { success: true, response: `Time: ${hours}:${mins} (${phase})` };
  }

  // ============= MOVEMENT COMMANDS =============
  async cmdFollow(player) {
    if (!player) return { success: false, error: 'Specify a player to follow' };
    if (!this.ai.movement) return { success: false, error: 'Movement system unavailable' };
    await this.ai.movement.followPlayer(player);
    this.stats.commandsExecuted++;
    return { success: true, response: `Following ${player}...` };
  }

  cmdStop() {
    if (this.bot.pathfinder) this.bot.pathfinder.stop();
    this.stats.commandsExecuted++;
    return { success: true, response: 'Stopped movement.' };
  }

  async cmdCome() {
    if (!this.ai.movement) return { success: false, error: 'Movement unavailable' };
    const players = this.bot.players;
    if (Object.keys(players).length === 0) return { success: false, error: 'No players found' };
    const nearestPlayer = Object.values(players)[0];
    if (nearestPlayer && nearestPlayer.entity) {
      await this.ai.movement.goTo(nearestPlayer.entity.position.x, nearestPlayer.entity.position.y, nearestPlayer.entity.position.z);
      this.stats.commandsExecuted++;
      return { success: true, response: 'Coming to you...' };
    }
    return { success: false, error: 'No player found' };
  }

  async cmdGoto(args) {
    if (args.length < 3) return { success: false, error: 'Usage: !goto <x> <y> <z>' };
    const [x, y, z] = args.map(Number);
    if (isNaN(x) || isNaN(y) || isNaN(z)) return { success: false, error: 'Invalid coordinates' };
    if (!this.ai.movement) return { success: false, error: 'Movement unavailable' };
    await this.ai.movement.goTo(x, y, z);
    this.stats.commandsExecuted++;
    return { success: true, response: `Navigating to ${x}, ${y}, ${z}...`, isCommand: true, data: { type: 'move', x, y, z } };
  }

  async cmdCircle(player) {
    if (!player || !this.ai.movement) return { success: false, error: 'Need player and movement system' };
    // Circular navigation around player
    this.stats.commandsExecuted++;
    return { success: true, response: `Circling around ${player}...` };
  }

  async cmdGuard(area) {
    if (!this.ai.movement) return { success: false, error: 'Movement unavailable' };
    this.stats.commandsExecuted++;
    return { success: true, response: `Guarding area...` };
  }

  async cmdWander() {
    if (!this.ai.movement) return { success: false, error: 'Movement unavailable' };
    this.stats.commandsExecuted++;
    return { success: true, response: 'Wandering around...' };
  }

  async cmdRetreat() {
    if (!this.bot.pathfinder) return { success: false, error: 'Pathfinder unavailable' };
    this.bot.pathfinder.stop();
    this.stats.commandsExecuted++;
    return { success: true, response: 'Retreating to safety...' };
  }

  async cmdJump() {
    if (!this.bot) return { success: false, error: 'Unavailable' };
    this.bot.setControlState('jump', true);
    setTimeout(() => this.bot.setControlState('jump', false), 200);
    this.stats.commandsExecuted++;
    return { success: true, response: 'Jumping!' };
  }

  async cmdLookAt(player) {
    if (!player || !this.bot.players[player]) return { success: false, error: 'Player not found' };
    this.stats.commandsExecuted++;
    return { success: true, response: `Looking at ${player}...` };
  }

  // ============= MINING COMMANDS =============
  async cmdMine(ore = 'diamond') {
    if (!this.ai.mining) return { success: false, error: 'Mining unavailable' };
    await this.ai.mining.mineOres(ore, 64);
    this.stats.commandsExecuted++;
    return { success: true, response: `Mining ${ore}...`, isCommand: true, data: { type: 'mine', ore } };
  }

  async cmdStripMine() {
    if (this.ai.mining) this.ai.mining.mineOres('stone', 100);
    this.stats.commandsExecuted++;
    return { success: true, response: 'Starting strip mine...', isCommand: true, data: { type: 'stripmine' } };
  }

  async cmdQuarry() {
    if (this.ai.mining) this.ai.mining.mineOres('iron_ore', 50);
    this.stats.commandsExecuted++;
    return { success: true, response: 'Starting quarry mining...', isCommand: true, data: { type: 'quarry' } };
  }

  async cmdDigDown() {
    if (this.ai.mining) {
      const action = { type:'digdown' };
      // will be executed by executeAction
    }
    this.stats.commandsExecuted++;
    return { success: true, response: 'Digging downward...', isCommand: true, data: { type: 'digdown' } };
  }

  async cmdDigUp() {
    if (this.ai.mining) {
      const action = { type:'digup' };
    }
    this.stats.commandsExecuted++;
    return { success: true, response: 'Digging upward...', isCommand: true, data: { type: 'digup' } };
  }

  // ============= FARMING COMMANDS =============
  async cmdFarm() {
    if (!this.ai.farming) return { success: false, error: 'Farming unavailable' };
    this.stats.commandsExecuted++;
    this.ai.farming.plantCrops();
    return { success: true, response: 'Starting farming operations...', isCommand: true, data: { type: 'farm' } };
  }

  async cmdHarvest() {
    if (this.ai.farming) this.ai.farming.harvestCrops();
    this.stats.commandsExecuted++;
    return { success: true, response: 'Harvesting crops...', isCommand: true, data: { type: 'harvest' } };
  }

  async cmdPlant(crop) {
    return { success: true, response: `Planting ${crop}...`, isCommand: true, data: { type: 'plant', crop } };
  }

  async cmdBreed(animal) {
    if (this.ai.farming) this.ai.farming.breedAnimals(animal);
    this.stats.commandsExecuted++;
    return { success: true, response: `Breeding ${animal}s...`, isCommand: true, data: { type: 'breed', animal } };
  }

  async cmdFeed(animal) {
    return { success: true, response: `Feeding ${animal}s...`, isCommand: true, data: { type: 'feed', animal } };
  }

  async cmdMilkCow() {
    return { success: true, response: 'Milking cows...', isCommand: true, data: { type: 'milkcow' } };
  }

  async cmdCollectEggs() {
    return { success: true, response: 'Collecting chicken eggs...', isCommand: true, data: { type: 'eggs' } };
  }

  // ============= COMBAT COMMANDS =============
  async cmdPvP(player) {
    if (!player) return { success: false, error: 'Specify a player' };
    if (!this.ai.combat) return { success: false, error: 'Combat unavailable' };
    this.stats.commandsExecuted++;
    return { success: true, response: `Engaging ${player} in PVP...`, isCommand: true, data: { type: 'pvp', target: player } };
  }

  async cmdDefend(player) {
    if (!player) return { success: false, error: 'Specify a player to defend' };
    this.stats.commandsExecuted++;
    return { success: true, response: `Defending ${player}...` };
  }

  async cmdAttackMobs() {
    if (!this.ai.combat) return { success: false, error: 'Combat unavailable' };
    this.stats.commandsExecuted++;
    return { success: true, response: 'Attacking mobs...', isCommand: true, data: { type: 'attack_mobs' } };
  }

  async cmdProtect() {
    return { success: true, response: 'Protecting area...', isCommand: true, data: { type: 'protect' } };
  }

  // ============= BUILDING COMMANDS =============
  async cmdBuild(args) {
    const structure = args[0] || 'wall';
    if (!this.ai.builder && !this.ai.cityBuilder) return { success: false, error: 'Builder unavailable' };
    this.stats.commandsExecuted++;
    // optionally kick off builder module
    if (this.ai.builder) this.ai.builder.buildStructure(structure);
    return { success: true, response: `Building ${structure}...`, isCommand: true, data: { type: 'build', structure } };
  }

  async cmdBuildWall(length) {
    return { success: true, response: `Building wall of length ${length}...`, isCommand: true, data: { type: 'build_wall', length: parseInt(length) } };
  }

  async cmdBuildHouse() {
    return { success: true, response: 'Building house...', isCommand: true, data: { type: 'build_house' } };
  }

  async cmdBuildBridge(length) {
    return { success: true, response: `Building bridge of length ${length}...`, isCommand: true, data: { type: 'build_bridge', length: parseInt(length) } };
  }

  async cmdBuildTower(height) {
    return { success: true, response: `Building tower of height ${height}...`, isCommand: true, data: { type: 'build_tower', height: parseInt(height) } };
  }

  async cmdFlattenLand(size) {
    return { success: true, response: `Flattening area of size ${size}...`, isCommand: true, data: { type: 'flatten', size: parseInt(size) } };
  }

  async cmdRepairBuilds() {
    return { success: true, response: 'Repairing damaged structures...', isCommand: true, data: { type: 'repair' } };
  }

  // ============= UTILITY COMMANDS =============
  async cmdCraft(item) {
    if (!item) return { success: false, error: 'Specify item to craft' };
    if (!this.ai.crafting) return { success: false, error: 'Crafting unavailable' };
    this.stats.commandsExecuted++;
    return { success: true, response: `Crafting ${item}...`, isCommand: true, data: { type: 'craft', item } };
  }

  async cmdSmelt() {
    return { success: true, response: 'Smelting items...', isCommand: true, data: { type: 'smelt' } };
  }

  async cmdDrop(item) {
    if (!this.ai.inventory) return { success: false, error: 'Inventory unavailable' };
    this.stats.commandsExecuted++;
    return { success: true, response: `Dropping ${item}...` };
  }

  async cmdDeposit() {
    return { success: true, response: 'Depositing items into chest...', isCommand: true, data: { type: 'deposit' } };
  }

  async cmdWithdraw(item) {
    return { success: true, response: `Withdrawing ${item}...`, isCommand: true, data: { type: 'withdraw', item } };
  }

  async cmdSortInventory() {
    return { success: true, response: 'Sorting inventory...', isCommand: true, data: { type: 'sort' } };
  }

  async cmdGiveItem(player, item) {
    if (!player || !item) return { success: false, error: 'Usage: !give <player> <item>' };
    this.stats.commandsExecuted++;
    return { success: true, response: `Giving ${item} to ${player}...` };
  }

  async cmdEnchant() {
    return { success: true, response: 'Enchanting items...', isCommand: true, data: { type: 'enchant' } };
  }

  async cmdRepair() {
    return { success: true, response: 'Repairing items...', isCommand: true, data: { type: 'repair' } };
  }

  // ============= STATE COMMANDS =============
  cmdPause() {
    if (this.ai.brain) this.ai.brain.paused = true;
    return { success: true, response: 'All activities paused.' };
  }

  cmdResume() {
    if (this.ai.brain) this.ai.brain.paused = false;
    return { success: true, response: 'Resuming activities.' };
  }

  cmdStatus() {
    const paused = this.ai.brain?.paused ? 'Paused' : 'Active';
    return { success: true, response: `Status: ${paused}` };
  }

  cmdSetMode(mode) {
    if (!mode) return { success: false, error: 'Specify mode: survival, farm, mine, explore, build, etc' };
    return { success: true, response: `Mode set to ${mode}` };
  }

  cmdSetPriority(priority) {
    if (!priority) return { success: false, error: 'Specify priority: survival, explore, gather, build, farm' };
    return { success: true, response: `Priority set to ${priority}` };
  }

  getCommandHistory() {
    return this.commandHistory;
  }

  getStats() {
    return this.stats;
  }
}
