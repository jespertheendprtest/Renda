import WindowManager from "./WindowManagement/WindowManager.js";
import ProjectManager from "./Managers/ProjectManager.js";
import * as GameEngine from "../../src/index.js";

export default class Editor{
	constructor(){
		this.renderer = new GameEngine.RealTimeRenderer();
		this.windowManger = new WindowManager();
		this.projectManager = new ProjectManager();
	}

	init(){
		this.renderer.init();
		this.windowManger.init(this);
	}
}
